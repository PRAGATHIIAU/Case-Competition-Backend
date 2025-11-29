const pool = require('../config/db');
const { UserModel } = require('../models/user.model');
const { StudentModel } = require('../models/student.model');
const eventRepository = require('./event.repository');
const axios = require('axios');
const {
  API_GATEWAY_DYNAMODB_URL,
  API_GATEWAY_UPLOAD_URL,
  API_GATEWAY_STUDENT_PROFILES_URL,
} = require('../config/aws');

/**
 * Analytics Repository
 * Handles data access for admin analytics (PostgreSQL + DynamoDB via existing repositories)
 */

/**
 * Fetch basic platform counts for admin analytics.
 *
 * - totalStudents: number of rows in students table
 * - totalAlumni: number of rows in users table
 * - activeEvents: number of events considered "active"
 *   (by default: events with future eventInfo.date if present, otherwise all events)
 * - inactiveAlumniCount: users whose last_login is older than 90 days
 *
 * Note: last_login column is expected to exist on the users table.
 *
 * @returns {Promise<{totalStudents:number,totalAlumni:number,activeEvents:number,inactiveAlumniCount:number}>}
 */
const fetchCounts = async () => {
  try {
    // Total students (PostgreSQL)
    const studentsResult = await pool.query('SELECT COUNT(*) AS count FROM students');
    const totalStudents = Number(studentsResult.rows[0]?.count || 0);

    // Total alumni/users (PostgreSQL)
    const usersTable = UserModel.TABLE_NAME;
    const totalAlumniResult = await pool.query(
      `SELECT COUNT(*) AS count FROM ${usersTable}`
    );
    const totalAlumni = Number(totalAlumniResult.rows[0]?.count || 0);

    // Inactive alumni: last_login older than 90 days (PostgreSQL)
    // If last_login column doesn't exist yet, fall back to 0 instead of throwing.
    let inactiveAlumniCount = 0;
    try {
      const columnCheck = await pool.query(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_name = $1
             AND column_name = 'last_login'
         ) AS exists`,
        [usersTable]
      );

      const hasLastLoginColumn = !!columnCheck.rows[0]?.exists;

      if (hasLastLoginColumn) {
        const inactiveAlumniResult = await pool.query(
          `SELECT COUNT(*) AS count
           FROM ${usersTable}
           WHERE last_login IS NOT NULL
             AND last_login < NOW() - INTERVAL '90 days'`
        );
        inactiveAlumniCount = Number(inactiveAlumniResult.rows[0]?.count || 0);
      } else {
        // Column not present yet; treat inactive count as 0
        inactiveAlumniCount = 0;
      }
    } catch (inactiveErr) {
      console.warn('Analytics repository: unable to compute inactiveAlumniCount:', inactiveErr.message);
      inactiveAlumniCount = 0;
    }

    // Active events (DynamoDB via existing eventRepository)
    const events = await eventRepository.getAllEvents();

    const now = new Date();
    const activeEvents = (events || []).filter((event) => {
      // Prefer eventInfo.date if using newer event format
      const dateValue = event?.eventInfo?.date || event?.date;

      if (!dateValue) {
        // If no date is set, treat the event as active by default
        return true;
      }

      const eventDate = new Date(dateValue);
      if (Number.isNaN(eventDate.getTime())) {
        // If date is invalid, treat as active to avoid under-counting
        return true;
      }

      // Active if event date is today or in the future
      return eventDate >= now;
    }).length;

    return {
      totalStudents,
      totalAlumni,
      activeEvents,
      inactiveAlumniCount,
    };
  } catch (error) {
    console.error('Analytics repository error (fetchCounts):', error);
    throw error;
  }
};

/**
 * Fetch student engagement statistics.
 *
 * - activeStudents: students with last_login within last 30 days
 * - inactiveStudents: students with last_login older than 60 days
 * - avgProfileCompletion: average profile completion percentage (0–100)
 *   based on fields present in student_profiles DynamoDB table.
 *
 * @returns {Promise<{activeStudents:number,inactiveStudents:number,avgProfileCompletion:number}>}
 */
const fetchStudentEngagement = async () => {
  try {
    // Active students: last_login within last 30 days
    const activeResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM ${StudentModel.TABLE_NAME}
       WHERE last_login IS NOT NULL
         AND last_login >= NOW() - INTERVAL '30 days'`
    );
    const activeStudents = Number(activeResult.rows[0]?.count || 0);

    // Inactive students: last_login older than 60 days
    const inactiveResult = await pool.query(
      `SELECT COUNT(*) AS count
       FROM ${StudentModel.TABLE_NAME}
       WHERE last_login IS NOT NULL
         AND last_login < NOW() - INTERVAL '60 days'`
    );
    const inactiveStudents = Number(inactiveResult.rows[0]?.count || 0);

    // Average profile completion based on student_profiles (DynamoDB)
    let avgProfileCompletion = 0;

    if (!API_GATEWAY_STUDENT_PROFILES_URL) {
      console.warn('API_GATEWAY_STUDENT_PROFILES_URL not configured; avgProfileCompletion will be 0.');
    } else {
      const studentsRes = await pool.query(
        `SELECT ${StudentModel.COLUMNS.STUDENT_ID} AS student_id FROM ${StudentModel.TABLE_NAME}`
      );
      const studentIds = studentsRes.rows.map((r) => r.student_id);

      const fields = [
        'skills',
        'aspirations',
        'parsed_resume',
        'projects',
        'experiences',
        'achievements',
        'resume_url',
      ];

      const computeCompletionForProfile = (profile) => {
        if (!profile) return 0;
        let filled = 0;

        fields.forEach((field) => {
          const value = profile[field];
          if (Array.isArray(value)) {
            if (value.length > 0) filled += 1;
          } else if (typeof value === 'string') {
            if (value.trim().length > 0) filled += 1;
          } else if (value && typeof value === 'object') {
            if (Object.keys(value).length > 0) filled += 1;
          } else if (value != null) {
            // Non-null scalar
            filled += 1;
          }
        });

        return fields.length === 0 ? 0 : (filled / fields.length) * 100;
      };

      const completions = await Promise.all(
        studentIds.map(async (studentId) => {
          try {
            const response = await axios.post(
              API_GATEWAY_STUDENT_PROFILES_URL,
              {
                operation: 'getStudentProfile',
                studentId,
              },
              {
                headers: { 'Content-Type': 'application/json' },
                timeout: 20000,
              }
            );

            if (response.data && response.data.success) {
              const profile = response.data.data;
              return computeCompletionForProfile(profile);
            }

            return 0;
          } catch (err) {
            console.warn(`Analytics: failed to fetch profile for student ${studentId}:`, err.message);
            return 0;
          }
        })
      );

      if (completions.length > 0) {
        const sum = completions.reduce((acc, val) => acc + (Number.isFinite(val) ? val : 0), 0);
        avgProfileCompletion = sum / completions.length;
      }
    }

    return {
      activeStudents,
      inactiveStudents,
      avgProfileCompletion,
    };
  } catch (error) {
    console.error('Analytics repository error (fetchStudentEngagement):', error);
    throw error;
  }
};

/**
 * Fetch alumni engagement statistics.
 *
 * - totalAlumni: total number of alumni (users)
 * - activeAlumni: alumni with last_login within last 45 days
 * - inactiveAlumni: totalAlumni - activeAlumni
 * - judgesThisMonth: number of distinct judges who have submitted scores this calendar month
 *
 * Data sources:
 * - PostgreSQL users table (RDS)
 * - DynamoDB Events table via eventRepository.getAllEvents()
 *
 * @returns {Promise<{totalAlumni:number,activeAlumni:number,inactiveAlumni:number,judgesThisMonth:number}>}
 */
const fetchAlumniEngagement = async () => {
  try {
    const usersTable = UserModel.TABLE_NAME;

    // Optional type filter: only count rows where type='alumni' if such a column exists.
    let typeFilterClause = '';
    try {
      const typeColumnCheck = await pool.query(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_name = $1
             AND column_name = 'type'
         ) AS exists`,
        [usersTable]
      );
      const hasTypeColumn = !!typeColumnCheck.rows[0]?.exists;

      if (hasTypeColumn) {
        typeFilterClause = "WHERE type = 'alumni'";
      }
    } catch (typeErr) {
      console.warn('Analytics repository: unable to check users.type column:', typeErr.message);
    }

    // Total alumni
    const totalAlumniResult = await pool.query(
      `SELECT COUNT(*) AS count FROM ${usersTable} ${typeFilterClause}`
    );
    const totalAlumni = Number(totalAlumniResult.rows[0]?.count || 0);

    // Active alumni: last_login within last 45 days
    let activeAlumni = 0;
    try {
      const columnCheck = await pool.query(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_name = $1
             AND column_name = 'last_login'
         ) AS exists`,
        [usersTable]
      );
      const hasLastLoginColumn = !!columnCheck.rows[0]?.exists;

      if (hasLastLoginColumn) {
        const activeResult = await pool.query(
          `SELECT COUNT(*) AS count
           FROM ${usersTable}
           ${typeFilterClause ? `${typeFilterClause} AND` : 'WHERE'} last_login IS NOT NULL
             AND last_login >= NOW() - INTERVAL '45 days'`
        );
        activeAlumni = Number(activeResult.rows[0]?.count || 0);
      } else {
        activeAlumni = 0;
      }
    } catch (activeErr) {
      console.warn('Analytics repository: unable to compute activeAlumni:', activeErr.message);
      activeAlumni = 0;
    }

    // Inactive alumni: complement
    const inactiveAlumni = Math.max(totalAlumni - activeAlumni, 0);

    // Judges this month: distinct judgeId in scores with timestamp in current calendar month
    let judgesThisMonth = 0;
    try {
      const events = await eventRepository.getAllEvents();

      const now = new Date();
      const currentYear = now.getUTCFullYear();
      const currentMonth = now.getUTCMonth(); // 0-based

      const judgeIds = new Set();

      (events || []).forEach((event) => {
        const scores = event?.scores || [];
        scores.forEach((scoreEntry) => {
          const ts = scoreEntry?.timestamp;
          const judgeId = scoreEntry?.judgeId;
          if (!ts || !judgeId) return;

          const dt = new Date(ts);
          if (Number.isNaN(dt.getTime())) return;

          if (dt.getUTCFullYear() === currentYear && dt.getUTCMonth() === currentMonth) {
            judgeIds.add(judgeId);
          }
        });
      });

      judgesThisMonth = judgeIds.size;
    } catch (judgesErr) {
      console.warn('Analytics repository: unable to compute judgesThisMonth:', judgesErr.message);
      judgesThisMonth = 0;
    }

    return {
      totalAlumni,
      activeAlumni,
      inactiveAlumni,
      judgesThisMonth,
    };
  } catch (error) {
    console.error('Analytics repository error (fetchAlumniEngagement):', error);
    throw error;
  }
};

/**
 * Fetch list of inactive alumni (have not logged in recently).
 *
 * Inactive definition: last_login older than 60 days.
 * Returns array of:
 * { id, name, email, lastLogin }
 *
 * @returns {Promise<Array<{id:number,name:string,email:string,lastLogin:string|null}>>}
 */
const fetchInactiveAlumni = async () => {
  try {
    const usersTable = UserModel.TABLE_NAME;

    // Ensure last_login column exists; if not, return empty list.
    const columnCheck = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_name = $1
           AND column_name = 'last_login'
       ) AS exists`,
      [usersTable]
    );
    const hasLastLoginColumn = !!columnCheck.rows[0]?.exists;

    if (!hasLastLoginColumn) {
      return [];
    }

    // Optional type='alumni' filter if type column exists.
    let whereClauses = ['last_login IS NOT NULL', "last_login < NOW() - INTERVAL '60 days'"];
    try {
      const typeColumnCheck = await pool.query(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.columns
           WHERE table_name = $1
             AND column_name = 'type'
         ) AS exists`,
        [usersTable]
      );
      const hasTypeColumn = !!typeColumnCheck.rows[0]?.exists;
      if (hasTypeColumn) {
        whereClauses.unshift("type = 'alumni'");
      }
    } catch (typeErr) {
      console.warn('Analytics repository: unable to check users.type column for inactiveAlumni:', typeErr.message);
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT id, name, email, last_login
       FROM ${usersTable}
       ${whereSql}
       ORDER BY last_login ASC`
    );

    return (result.rows || []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      lastLogin: row.last_login ? row.last_login.toISOString ? row.last_login.toISOString() : row.last_login : null,
    }));
  } catch (error) {
    console.error('Analytics repository error (fetchInactiveAlumni):', error);
    throw error;
  }
};

module.exports = {
  fetchCounts,
  fetchStudentEngagement,
  fetchAlumniEngagement,
  fetchInactiveAlumni,
  /**
   * Fetch feedback summary statistics for students & employers.
   *
   * - studentFeedbackCount: number of feedback rows for students
   * - employerFeedbackCount: number of feedback rows for employers
   * - avgStudentRating: average rating for student feedback
   * - avgEmployerRating: average rating for employer feedback
   *
   * Expects a "feedback" table with at least:
   * - type   (e.g. 'student' or 'employer')
   * - rating (numeric)
   *
   * If the table or required columns do not exist, returns zeros
   * and logs a TODO in the server logs.
   *
   * @returns {Promise<{studentFeedbackCount:number,employerFeedbackCount:number,avgStudentRating:number,avgEmployerRating:number}>}
   */
  fetchFeedbackSummary: async () => {
    const feedbackTable = 'feedback';

    try {
      // Check if feedback table exists
      const tableCheck = await pool.query(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.tables
           WHERE table_schema = 'public'
             AND table_name = $1
         ) AS exists`,
        [feedbackTable]
      );

      const hasFeedbackTable = !!tableCheck.rows[0]?.exists;

      if (!hasFeedbackTable) {
        console.warn(
          'Analytics: feedback table does not exist. ' +
          'TODO: create "feedback" table with columns: type (student/employer), rating (numeric), etc.'
        );
        return {
          studentFeedbackCount: 0,
          employerFeedbackCount: 0,
          avgStudentRating: 0,
          avgEmployerRating: 0,
        };
      }

      // Ensure required columns (type, rating) exist
      const columnCheck = await pool.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_name = $1
           AND column_name IN ('type', 'rating')`,
        [feedbackTable]
      );

      const cols = columnCheck.rows.map((r) => r.column_name);
      const hasType = cols.includes('type');
      const hasRating = cols.includes('rating');

      if (!hasType || !hasRating) {
        console.warn(
          'Analytics: feedback table is missing required columns. ' +
          'TODO: ensure "type" and "rating" columns exist on feedback table.'
        );
        return {
          studentFeedbackCount: 0,
          employerFeedbackCount: 0,
          avgStudentRating: 0,
          avgEmployerRating: 0,
        };
      }

      // Aggregate summary
      const summaryResult = await pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE type = 'student')   AS student_count,
           COUNT(*) FILTER (WHERE type = 'employer')  AS employer_count,
           AVG(CASE WHEN type = 'student'  THEN rating END)   AS avg_student_rating,
           AVG(CASE WHEN type = 'employer' THEN rating END)   AS avg_employer_rating
         FROM ${feedbackTable}`
      );

      const row = summaryResult.rows[0] || {};

      return {
        studentFeedbackCount: Number(row.student_count || 0),
        employerFeedbackCount: Number(row.employer_count || 0),
        avgStudentRating: row.avg_student_rating !== null ? Number(row.avg_student_rating) : 0,
        avgEmployerRating: row.avg_employer_rating !== null ? Number(row.avg_employer_rating) : 0,
      };
    } catch (error) {
      console.error('Analytics repository error (fetchFeedbackSummary):', error);
      throw error;
    }
  },
  /**
   * Fetch alumni role statistics based on willingness flags.
   *
   * - mentors:  number of users willing_to_be_mentor = true
   * - judges:   number of users willing_to_be_judge  = true
   * - sponsors: number of users willing_to_be_sponsor = true
   * - multiRole: number of users with 2 or more of those flags = true
   *
   * Data source:
   * - PostgreSQL users table (RDS)
   *
   * @returns {Promise<{mentors:number,judges:number,sponsors:number,multiRole:number}>}
   */
  fetchAlumniRoles: async () => {
    try {
      const usersTable = UserModel.TABLE_NAME;

      // Ensure willingness columns exist; if not, return zeros.
      const columnCheck = await pool.query(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_name = $1
           AND column_name IN ('willing_to_be_mentor','mentor_capacity','willing_to_be_judge','willing_to_be_sponsor')`,
        [usersTable]
      );

      const cols = columnCheck.rows.map((r) => r.column_name);
      const hasMentor = cols.includes('willing_to_be_mentor');
      const hasJudge = cols.includes('willing_to_be_judge');
      const hasSponsor = cols.includes('willing_to_be_sponsor');

      if (!hasMentor && !hasJudge && !hasSponsor) {
        console.warn(
          'Analytics: users table missing willingness flags. ' +
          'Expected willing_to_be_mentor, willing_to_be_judge, willing_to_be_sponsor.'
        );
        return { mentors: 0, judges: 0, sponsors: 0, multiRole: 0 };
      }

      const result = await pool.query(
        `SELECT
           SUM(CASE WHEN willing_to_be_mentor  THEN 1 ELSE 0 END) AS mentors,
           SUM(CASE WHEN willing_to_be_judge   THEN 1 ELSE 0 END) AS judges,
           SUM(CASE WHEN willing_to_be_sponsor THEN 1 ELSE 0 END) AS sponsors,
           SUM(
             CASE 
               WHEN (COALESCE(willing_to_be_mentor,false)::int +
                     COALESCE(willing_to_be_judge,false)::int +
                     COALESCE(willing_to_be_sponsor,false)::int) >= 2
               THEN 1 ELSE 0 
             END
           ) AS multi_role
         FROM ${usersTable}`
      );

      const row = result.rows[0] || {};

      return {
        mentors: Number(row.mentors || 0),
        judges: Number(row.judges || 0),
        sponsors: Number(row.sponsors || 0),
        multiRole: Number(row.multi_role || 0),
      };
    } catch (error) {
      console.error('Analytics repository error (fetchAlumniRoles):', error);
      throw error;
    }
  },
  /**
   * Fetch per-event engagement and performance summary statistics.
   *
   * For each event returns:
   * - eventId: string
   * - title:   string (from eventInfo.name if available, otherwise event.title or eventId)
   * - teamCount: number of teams in event.teams[]
   * - avgScore: average of all score values in event.scores[] (0 if none)
   * - registeredJudges: number of judges registered for the event (length of event.judges[])
   *
   * Data source:
   * - DynamoDB Events table via eventRepository.getAllEvents()
   *
   * @returns {Promise<Array<{eventId:string,title:string,teamCount:number,avgScore:number,registeredJudges:number}>>}
   */
  fetchEventSummaries: async () => {
    try {
      const events = await eventRepository.getAllEvents();

      return (events || []).map((event) => {
        const eventId = event?.eventId || '';
        const title =
          (event?.eventInfo && event.eventInfo.name) ||
          event?.title ||
          eventId;

        const teams = Array.isArray(event?.teams) ? event.teams : [];
        const judges = Array.isArray(event?.judges) ? event.judges : [];
        const scores = Array.isArray(event?.scores) ? event.scores : [];

        const teamCount = teams.length;

        let avgScore = 0;
        if (scores.length > 0) {
          const sum = scores.reduce((acc, s) => {
            const val = typeof s.score === 'number' ? s.score : 0;
            return acc + val;
          }, 0);
          avgScore = scores.length > 0 ? sum / scores.length : 0;
        }

        const registeredJudges = judges.length;

        return {
          eventId,
          title,
          teamCount,
          avgScore,
          registeredJudges,
        };
      });
    } catch (error) {
      console.error('Analytics repository error (fetchEventSummaries):', error);
      throw error;
    }
  },
  /**
   * Fetch student-event trend statistics.
   *
   * - avgTeamsPerEvent: average number of teams per event
   * - avgStudentsPerTeam: average number of students per team (based on team.members length)
   * - mostPopularEvent: event with the highest teamCount
   *   { eventId, title, teamCount } or null if no events
   *
   * Data source:
   * - DynamoDB Events table via eventRepository.getAllEvents()
   *
   * @returns {Promise<{avgTeamsPerEvent:number,avgStudentsPerTeam:number,mostPopularEvent:null|{eventId:string,title:string,teamCount:number}}>} 
   */
  fetchStudentEventTrends: async () => {
    try {
      const events = await eventRepository.getAllEvents();
      const eventList = events || [];

      if (eventList.length === 0) {
        return {
          avgTeamsPerEvent: 0,
          avgStudentsPerTeam: 0,
          mostPopularEvent: null,
        };
      }

      let totalTeams = 0;
      let totalStudents = 0;
      let topEvent = null;

      eventList.forEach((event) => {
        const teams = Array.isArray(event?.teams) ? event.teams : [];
        const teamCount = teams.length;
        totalTeams += teamCount;

        teams.forEach((team) => {
          const members = Array.isArray(team?.members) ? team.members : [];
          totalStudents += members.length;
        });

        if (!topEvent || teamCount > topEvent.teamCount) {
          const eventId = event?.eventId || '';
          const title =
            (event?.eventInfo && event.eventInfo.name) ||
            event?.title ||
            eventId;

          topEvent = {
            eventId,
            title,
            teamCount,
          };
        }
      });

      const avgTeamsPerEvent = totalTeams > 0 ? totalTeams / eventList.length : 0;
      const avgStudentsPerTeam = totalTeams > 0 ? totalStudents / totalTeams : 0;

      return {
        avgTeamsPerEvent,
        avgStudentsPerTeam,
        mostPopularEvent: topEvent,
      };
    } catch (error) {
      console.error('Analytics repository error (fetchStudentEventTrends):', error);
      throw error;
    }
  },
  /**
   * Fetch recent admin activity events (placeholder implementation).
   *
   * Currently returns a static example payload. In the future, this should be
   * backed by a dedicated admin_activity table or audit log (e.g.:
   *   - admin_id (FK to admins.id)
   *   - action (TEXT)
   *   - metadata (JSONB)
   *   - created_at (TIMESTAMP)
   * and optionally tied into real actions like login, event updates, role changes, etc.).
   *
   * @returns {Promise<Array<{adminId:string,action:string,timestamp:string}>>}
   */
  fetchAdminActivity: async () => {
    // TODO: Replace this placeholder with real DB integration.
    // Suggested schema (PostgreSQL):
    //
    // CREATE TABLE IF NOT EXISTS admin_activity (
    //   id SERIAL PRIMARY KEY,
    //   admin_id INTEGER NOT NULL REFERENCES admins(id),
    //   action TEXT NOT NULL,
    //   metadata JSONB,
    //   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    // );
    //
    // Then, on key admin actions (e.g., login, update event status, manage roles),
    // insert a row into admin_activity.

    return [
      {
        adminId: '1',
        action: 'updated event status',
        timestamp: '2024-12-01T05:00:00Z',
      },
    ];
  },
  /**
   * Check system health for core dependencies.
   *
   * - postgresStatus: "UP" if SELECT 1 succeeds
   * - dynamoDBStatus: "UP" if API_GATEWAY_DYNAMODB_URL responds successfully
   * - s3Status: "UP" if API_GATEWAY_UPLOAD_URL responds successfully
   * - lambdaStatus: "UP" if at least one Lambda-backed API Gateway call succeeds
   *
   * This uses existing API Gateway → Lambda proxies and does not call AWS SDK directly.
   *
   * @returns {Promise<{postgresStatus:string,dynamoDBStatus:string,s3Status:string,lambdaStatus:string}>}
   */
  fetchSystemHealth: async () => {
    let postgresStatus = 'DOWN';
    let dynamoDBStatus = 'DOWN';
    let s3Status = 'DOWN';

    // PostgreSQL: simple SELECT 1
    try {
      await pool.query('SELECT 1');
      postgresStatus = 'UP';
    } catch (err) {
      console.error('System health: PostgreSQL check failed:', err.message);
      postgresStatus = 'DOWN';
    }

    // DynamoDB via API Gateway → DynamoDB Lambda
    if (!API_GATEWAY_DYNAMODB_URL) {
      console.warn('System health: API_GATEWAY_DYNAMODB_URL is not configured.');
      dynamoDBStatus = 'DOWN';
    } else {
      try {
        await axios.post(
          API_GATEWAY_DYNAMODB_URL,
          { operation: 'getAll' },
          { timeout: 5000 }
        );
        dynamoDBStatus = 'UP';
      } catch (err) {
        console.error('System health: DynamoDB (Lambda) check failed:', err.message);
        dynamoDBStatus = 'DOWN';
      }
    }

    // S3 via API Gateway → upload Lambda
    if (!API_GATEWAY_UPLOAD_URL) {
      console.warn('System health: API_GATEWAY_UPLOAD_URL is not configured.');
      s3Status = 'DOWN';
    } else {
      try {
        // Simple GET ping; if API Gateway/Lambda responds with 2xx we treat it as UP.
        const resp = await axios.get(API_GATEWAY_UPLOAD_URL, {
          timeout: 5000,
          validateStatus: () => true,
        });
        if (resp.status >= 200 && resp.status < 300) {
          s3Status = 'UP';
        } else {
          console.warn('System health: S3 proxy responded with non-2xx status:', resp.status);
          s3Status = 'DOWN';
        }
      } catch (err) {
        console.error('System health: S3 (upload Lambda) check failed:', err.message);
        s3Status = 'DOWN';
      }
    }

    // Lambda is considered UP if any Lambda-backed check succeeded
    const lambdaStatus = (dynamoDBStatus === 'UP' || s3Status === 'UP') ? 'UP' : 'DOWN';

    return {
      postgresStatus,
      dynamoDBStatus,
      s3Status,
      lambdaStatus,
    };
  },
};
