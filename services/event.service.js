const eventRepository = require('../repositories/event.repository');
const { validateEventData } = require('../models/event.model');
const emailService = require('./email.service');
const { generateTeamId } = require('../repositories/event.repository');
const studentRepository = require('../repositories/student.repository');
const { uploadResumeToS3 } = require('./auth.service');
const { API_GATEWAY_UPLOAD_URL } = require('../config/aws');

/**
 * Event Service
 * Handles business logic for Events
 */

/**
 * Get all events
 * @returns {Promise<Array>} Array of event objects
 */
const getAllEvents = async () => {
  try {
    return await eventRepository.getAllEvents();
  } catch (error) {
    throw error;
  }
};

/**
 * Get all events with type="competition"
 * @returns {Promise<Array>} Array of competition event objects
 */
const getCompetitions = async () => {
  try {
    return await eventRepository.getCompetitions();
  } catch (error) {
    throw error;
  }
};

/**
 * Get event by ID
 * @param {string} eventId - Event ID
 * @returns {Promise<Object>} Event object
 */
const getEventById = async (eventId) => {
  try {
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      throw new Error('Event ID is required and must be a valid string');
    }

    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    return event;
  } catch (error) {
    throw error;
  }
};

/**
 * Create a new event
 * @param {Object} eventData - Event data object
 * @returns {Promise<Object>} Created event object
 */
const createEvent = async (eventData) => {
  try {
    // Validate required fields for creation
    if (!eventData.eventInfo || typeof eventData.eventInfo !== 'object') {
      throw new Error('eventInfo is required and must be an object');
    }
    
    if (!eventData.eventInfo.name || typeof eventData.eventInfo.name !== 'string' || !eventData.eventInfo.name.trim()) {
      throw new Error('eventInfo.name is required and must be a non-empty string');
    }
    
    if (!eventData.eventInfo.description || typeof eventData.eventInfo.description !== 'string' || !eventData.eventInfo.description.trim()) {
      throw new Error('eventInfo.description is required and must be a non-empty string');
    }

    // Validate event data
    validateEventData(eventData);

    // Create event
    const newEvent = await eventRepository.createEvent(eventData);
    return newEvent;
  } catch (error) {
    throw error;
  }
};

/**
 * Update an existing event
 * @param {string} eventId - Event ID
 * @param {Object} updateData - Fields to update
 * @returns {Promise<Object>} Updated event object
 */
const updateEvent = async (eventId, updateData) => {
  try {
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      throw new Error('Event ID is required and must be a valid string');
    }

    // Validate update data if provided
    if (Object.keys(updateData).length > 0) {
      // Create a temporary object with existing event data merged with update data for validation
      const existingEvent = await eventRepository.getEventById(eventId);
      if (!existingEvent) {
        throw new Error('Event not found');
      }

      const mergedData = { ...existingEvent, ...updateData };
      validateEventData(mergedData);
    } else {
      throw new Error('No fields to update');
    }

    // Update event
    const updatedEvent = await eventRepository.updateEvent(eventId, updateData);
    if (!updatedEvent) {
      throw new Error('Event not found');
    }

    return updatedEvent;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete an event
 * @param {string} eventId - Event ID
 * @returns {Promise<boolean>} True if event was deleted
 */
const deleteEvent = async (eventId) => {
  try {
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      throw new Error('Event ID is required and must be a valid string');
    }

    const deleted = await eventRepository.deleteEvent(eventId);
    if (!deleted) {
      throw new Error('Event not found');
    }

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Register alumni as judge for an event
 * @param {string} eventId - Event ID
 * @param {Object} registrationData - Registration data
 * @param {number|string} registrationData.id - Judge ID (required) - will be stored as judgeId
 * @param {string} registrationData.alumniEmail - Alumni email (required)
 * @param {string} registrationData.alumniName - Alumni name (optional)
 * @param {string} registrationData.preferredDateTime - Preferred date and time (optional)
 * @param {string} registrationData.preferredLocation - Preferred location (optional)
 * @returns {Promise<Object>} Registration confirmation
 */
const registerAlumniAsJudge = async (eventId, registrationData) => {
  try {
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      throw new Error('Event ID is required and must be a valid string');
    }

    const { id, alumniEmail, alumniName, preferredDateTime, preferredLocation } = registrationData;

    // Validate required fields
    if (id === undefined || id === null || (typeof id !== 'number' && typeof id !== 'string')) {
      throw new Error('Judge ID (id) is required and must be a number or string');
    }

    if (!alumniEmail || typeof alumniEmail !== 'string' || !alumniEmail.trim()) {
      throw new Error('Alumni email is required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(alumniEmail)) {
      throw new Error('Invalid email format');
    }

    // Check if event exists
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Use id as judgeId (convert to string for consistency)
    const judgeId = String(id).trim();

    // Get existing judges array or initialize empty array
    const existingJudges = event.judges || [];

    // Check if judge already exists
    const existingJudgeIndex = existingJudges.findIndex((j) => j.judgeId === judgeId);

    let updatedJudges;
    
    if (existingJudgeIndex === -1) {
      // Judge doesn't exist, add them with "approved" status
      updatedJudges = [
        ...existingJudges,
        {
          judgeId,
          status: 'approved',
        },
      ];
    } else {
      // Judge exists, ensure status is always "approved"
      updatedJudges = [...existingJudges];
      updatedJudges[existingJudgeIndex] = {
        ...updatedJudges[existingJudgeIndex],
        status: 'approved',
      };
    }

    // Update event with judges array (always set status to "approved")
    await eventRepository.updateEvent(eventId, {
      judges: updatedJudges,
    });

    // Get event title (support both old and new format)
    const eventTitle = event.eventInfo?.name || event.title || 'Event';

    // Send email notification to admin
    try {
      await emailService.sendJudgeInterestNotification({
        alumniEmail,
        alumniName: alumniName || 'Alumni',
        eventId,
        eventTitle,
        preferredDateTime,
        preferredLocation,
      });
    } catch (emailError) {
      // Log email error but don't fail the registration
      console.error('Failed to send email notification:', emailError);
      // In production, you might want to queue this for retry
    }

    return {
      success: true,
      message: 'Registration successful. Admin has been notified.',
      eventId,
      eventTitle,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get teams for an event with total scores
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} Array of teams with total scores
 */
const getTeams = async (eventId) => {
  try {
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      throw new Error('Event ID is required and must be a valid string');
    }

    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const teams = event.teams || [];
    const scores = event.scores || [];

    // Calculate total score per team
    const teamsWithScores = teams.map((team) => {
      // Get all scores for this team
      const teamScores = scores.filter((score) => score.teamId === team.teamId);
      
      // Calculate total score (sum of all scores for this team)
      const totalScore = teamScores.reduce((sum, scoreEntry) => sum + (scoreEntry.score || 0), 0);

      return {
        teamId: team.teamId,
        teamName: team.teamName,
        members: team.members || [],
        totalScore,
      };
    });

    return teamsWithScores;
  } catch (error) {
    throw error;
  }
};

/**
 * Get rubrics for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} Array of rubrics
 */
const getRubrics = async (eventId) => {
  try {
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      throw new Error('Event ID is required and must be a valid string');
    }

    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    return event.rubrics || [];
  } catch (error) {
    throw error;
  }
};

/**
 * Update team details for an existing event
 * TeamId is generated automatically and stored
 * @param {string} eventId - Event ID
 * @param {Object} teamData - Team data to update
 * @param {string} teamData.teamName - Team name (required)
 * @param {Array<string>} teamData.members - Team members (email IDs - 4 members, required)
 * @param {number} teamData.slotPreference - Slot preference (slot number, optional)
 * @returns {Promise<Object>} Updated event object with generated teamId
 */
const updateTeamDetails = async (eventId, teamData) => {
  try {
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      throw new Error('Event ID is required and must be a valid string');
    }

    const { teamName, members, slotPreference } = teamData;

    // Validate required fields
    if (!teamName || typeof teamName !== 'string' || !teamName.trim()) {
      throw new Error('Team name is required');
    }

    if (!members || !Array.isArray(members) || members.length !== 4) {
      throw new Error('Team must have exactly 4 members');
    }

    // Validate email format for all members
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const member of members) {
      if (!member || typeof member !== 'string' || !member.trim()) {
        throw new Error('All team members must be valid email addresses');
      }
      if (!emailRegex.test(member.trim())) {
        throw new Error(`Invalid email format: ${member}`);
      }
    }

    // Validate slotPreference if provided
    if (slotPreference !== undefined && slotPreference !== null) {
      if (typeof slotPreference !== 'number' || slotPreference <= 0) {
        throw new Error('Slot preference must be a positive number');
      }
    }

    // Get event to validate
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Validate slot exists if slotPreference is provided
    if (slotPreference !== undefined && slotPreference !== null) {
      const slots = event.slots || [];
      const slotExists = slots.some((slot) => slot.slotNumber === slotPreference);
      if (!slotExists) {
        throw new Error(`Slot with number ${slotPreference} does not exist in the event`);
      }
    }

    // Get existing teams array or initialize empty array
    const existingTeams = event.teams || [];

    // Generate teamId automatically
    const generatedTeamId = generateTeamId();

    // Prepare team object with generated teamId
    const newTeam = {
      teamId: generatedTeamId,
      teamName: teamName.trim(),
      members: members.map((email) => email.trim()),
    };

    // Add slotPreference if provided
    if (slotPreference !== undefined && slotPreference !== null) {
      newTeam.slotPreference = slotPreference;
    }

    // Add new team to teams array (always create new team with generated ID)
    const updatedTeams = [...existingTeams, newTeam];

    // Update event with updated teams array
    const updatedEvent = await eventRepository.updateEvent(eventId, {
      teams: updatedTeams,
    });

    if (!updatedEvent) {
      throw new Error('Failed to update team details');
    }

    // Return the updated event along with the generated teamId
    return {
      ...updatedEvent,
      teamId: generatedTeamId,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Submit scores for a team
 * @param {string} eventId - Event ID
 * @param {string} judgeId - Judge ID
 * @param {string} teamId - Team ID
 * @param {Array} scores - Array of { rubricId, score }
 * @returns {Promise<Object>} Updated event object
 */
const submitScores = async (eventId, judgeId, teamId, scores) => {
  try {
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      throw new Error('Event ID is required and must be a valid string');
    }

    if (!judgeId || typeof judgeId !== 'string' || !judgeId.trim()) {
      throw new Error('Judge ID is required and must be a valid string');
    }

    if (!teamId || typeof teamId !== 'string' || !teamId.trim()) {
      throw new Error('Team ID is required and must be a valid string');
    }

    if (!Array.isArray(scores) || scores.length === 0) {
      throw new Error('Scores must be a non-empty array');
    }

    // Get event to validate
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Validate judge exists and is approved
    const judges = event.judges || [];
    const judge = judges.find((j) => j.judgeId === judgeId);
    if (!judge) {
      throw new Error('Judge not found in event');
    }
    if (judge.status !== 'approved') {
      throw new Error('Judge is not approved. Only approved judges can submit scores.');
    }

    // Validate team exists
    const teams = event.teams || [];
    const team = teams.find((t) => t.teamId === teamId);
    if (!team) {
      throw new Error('Team not found in event');
    }

    // Validate rubrics and scores
    const rubrics = event.rubrics || [];
    const rubricMap = new Map(rubrics.map((r) => [r.rubricId, r]));

    for (const scoreEntry of scores) {
      if (!scoreEntry.rubricId || typeof scoreEntry.rubricId !== 'string') {
        throw new Error('Each score entry must have a valid rubricId');
      }

      if (typeof scoreEntry.score !== 'number' || scoreEntry.score < 0) {
        throw new Error('Each score must be a non-negative number');
      }

      const rubric = rubricMap.get(scoreEntry.rubricId);
      if (!rubric) {
        throw new Error(`Rubric with ID ${scoreEntry.rubricId} not found in event`);
      }

      if (scoreEntry.score > rubric.maxScore) {
        throw new Error(
          `Score ${scoreEntry.score} exceeds maximum score ${rubric.maxScore} for rubric ${rubric.name}`
        );
      }
    }

    // Get existing scores
    const existingScores = event.scores || [];
    
    // Prepare new score entries with timestamp
    const timestamp = new Date().toISOString();
    const newScoreEntries = scores.map((scoreEntry) => ({
      judgeId,
      teamId,
      rubricId: scoreEntry.rubricId,
      score: scoreEntry.score,
      timestamp,
    }));

    // Create a map of existing scores by (judgeId, teamId, rubricId) combination
    const existingScoresMap = new Map();
    existingScores.forEach((score) => {
      const key = `${score.judgeId}|${score.teamId}|${score.rubricId}`;
      existingScoresMap.set(key, score);
    });

    // Update or add scores
    newScoreEntries.forEach((newScore) => {
      const key = `${newScore.judgeId}|${newScore.teamId}|${newScore.rubricId}`;
      // Replace existing score or add new one
      existingScoresMap.set(key, newScore);
    });

    // Convert map back to array
    const updatedScores = Array.from(existingScoresMap.values());

    // Update scores atomically (replace entire array)
    const updatedEvent = await eventRepository.updateScores(eventId, updatedScores);
    if (!updatedEvent) {
      throw new Error('Failed to update scores');
    }

    return updatedEvent;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all events where a user is assigned as a judge
 * Returns events where the judge_id is present, regardless of status (approved or pending)
 * @param {string} userId - User ID (judgeId)
 * @returns {Promise<Array>} Array of events where the user is a judge (status can be anything)
 */
const getEventsJudgedBy = async (userId) => {
  try {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('User ID is required and must be a valid string');
    }

    // Get all events from DynamoDB (uses scan)
    const allEvents = await eventRepository.getAllEvents();

    // Filter events where the user is assigned as a judge
    // Returns events regardless of judge status (approved or pending)
    const filteredEvents = allEvents.filter((event) => {
      // Check if event has judges array
      if (!event.judges || !Array.isArray(event.judges)) {
        return false;
      }

      // Check if any judge matches the userId (status can be anything)
      return event.judges.some((judge) => judge.judgeId === userId.trim());
    });

    return filteredEvents;
  } catch (error) {
    throw error;
  }
};

/**
 * Get rubrics for all events where a user is assigned as a judge
 * @param {string} userId - User ID (judgeId)
 * @returns {Promise<Array>} Array of rubrics with event context
 */
const getRubricsForJudge = async (userId) => {
  try {
    if (!userId || typeof userId !== 'string' || !userId.trim()) {
      throw new Error('User ID is required and must be a valid string');
    }

    // Get all events where the user is a judge
    const events = await getEventsJudgedBy(userId);

    // Collect rubrics from all events with event context
    const rubricsWithContext = [];

    events.forEach((event) => {
      const eventRubrics = event.rubrics || [];
      
      // Add each rubric with event context
      eventRubrics.forEach((rubric) => {
        rubricsWithContext.push({
          ...rubric,
          eventId: event.eventId,
          eventName: event.eventInfo?.name || 'Unknown Event',
          eventDescription: event.eventInfo?.description || '',
        });
      });
    });

    return rubricsWithContext;
  } catch (error) {
    throw error;
  }
};

/**
 * Get leaderboard for an event
 * @param {string} eventId - Event ID
 * @returns {Promise<Array>} Ranked array of teams with final scores
 */
const getLeaderboard = async (eventId) => {
  try {
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      throw new Error('Event ID is required and must be a valid string');
    }

    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    const teams = event.teams || [];
    const rubrics = event.rubrics || [];
    const scores = event.scores || [];

    // Create rubric map for quick lookup
    const rubricMap = new Map(rubrics.map((r) => [r.rubricId, r]));

    // Calculate scores per team
    const teamScoresMap = new Map();

    // Initialize team scores
    teams.forEach((team) => {
      teamScoresMap.set(team.teamId, {
        teamId: team.teamId,
        teamName: team.teamName,
        members: team.members || [],
        scoresByJudge: new Map(), // Map<judgeId, Map<rubricId, score>>
        finalScore: 0,
      });
    });

    // Process all scores
    scores.forEach((scoreEntry) => {
      const teamData = teamScoresMap.get(scoreEntry.teamId);
      if (!teamData) return; // Skip if team not found

      // Initialize judge map if needed
      if (!teamData.scoresByJudge.has(scoreEntry.judgeId)) {
        teamData.scoresByJudge.set(scoreEntry.judgeId, new Map());
      }

      const judgeScores = teamData.scoresByJudge.get(scoreEntry.judgeId);
      
      // Keep the latest score if multiple scores exist for same judge+team+rubric
      const existingScore = judgeScores.get(scoreEntry.rubricId);
      if (!existingScore || new Date(scoreEntry.timestamp) > new Date(existingScore.timestamp)) {
        judgeScores.set(scoreEntry.rubricId, {
          score: scoreEntry.score,
          timestamp: scoreEntry.timestamp,
        });
      }
    });

    // Calculate final weighted scores
    teamScoresMap.forEach((teamData) => {
      let totalWeightedScore = 0;
      let totalWeight = 0;

      // Process scores from each judge
      teamData.scoresByJudge.forEach((judgeScores) => {
        judgeScores.forEach((scoreData, rubricId) => {
          const rubric = rubricMap.get(rubricId);
          if (!rubric) return; // Skip if rubric not found

          // Calculate weighted score: (score / maxScore) * weight
          const normalizedScore = scoreData.score / rubric.maxScore;
          const weightedScore = normalizedScore * rubric.weight;

          totalWeightedScore += weightedScore;
          totalWeight += rubric.weight;
        });
      });

      // Calculate final score: average of weighted scores
      // If totalWeight is 0, finalScore remains 0
      if (totalWeight > 0) {
        // Normalize by total weight to get average
        teamData.finalScore = (totalWeightedScore / totalWeight) * 100; // Scale to 100
      }
    });

    // Convert to array and sort by final score (descending)
    const leaderboard = Array.from(teamScoresMap.values())
      .map((teamData) => ({
        teamId: teamData.teamId,
        teamName: teamData.teamName,
        members: teamData.members,
        finalScore: Math.round(teamData.finalScore * 100) / 100, // Round to 2 decimal places
      }))
      .sort((a, b) => b.finalScore - a.finalScore)
      .map((team, index) => ({
        rank: index + 1,
        ...team,
      }));

    return leaderboard;
  } catch (error) {
    throw error;
  }
};

/**
 * Get all events where a student is registered as a team member
 * @param {string} studentId - Student ID (UUID)
 * @returns {Promise<Array>} Array of event IDs where the student is registered
 */
const getRegisteredEventsForStudent = async (studentId) => {
  try {
    if (!studentId || typeof studentId !== 'string' || !studentId.trim()) {
      throw new Error('Student ID is required and must be a valid string');
    }

    // Get student to retrieve their email
    const student = await studentRepository.getStudentById(studentId.trim());
    if (!student) {
      throw new Error('Student not found');
    }

    const studentEmail = student.email;
    if (!studentEmail) {
      throw new Error('Student email not found');
    }

    // Get all events from DynamoDB
    const allEvents = await eventRepository.getAllEvents();
    if (!allEvents || allEvents.length === 0) {
      return [];
    }

    // Filter events where student's email appears in any team's members array
    const registeredEvents = [];

    for (const event of allEvents) {
      const teams = event.teams || [];
      
      // Check if student's email is in any team's members array
      const isRegistered = teams.some(team => {
        const members = team.members || [];
        // Check if student email matches any member (case-insensitive comparison)
        return members.some(member => 
          member && typeof member === 'string' && 
          member.trim().toLowerCase() === studentEmail.toLowerCase()
        );
      });

      if (isRegistered) {
        registeredEvents.push({
          eventId: event.eventId,
          eventName: event.eventInfo?.name || event.title || 'Untitled Event',
          eventDescription: event.eventInfo?.description || event.description || null,
        });
      }
    }

    return registeredEvents;
  } catch (error) {
    throw error;
  }
};

/**
 * Submit competition document for a team
 * @param {string} eventId - Event ID
 * @param {string} teamId - Team ID
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} mimeType - File MIME type
 * @returns {Promise<Object>} Updated event object with submission link
 */
const submitCompetitionDocument = async (eventId, teamId, fileBuffer, fileName, mimeType) => {
  try {
    if (!eventId || typeof eventId !== 'string' || !eventId.trim()) {
      throw new Error('Event ID is required and must be a valid string');
    }

    if (!teamId || typeof teamId !== 'string' || !teamId.trim()) {
      throw new Error('Team ID is required and must be a valid string');
    }

    if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
      throw new Error('File buffer is required');
    }

    if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
      throw new Error('File name is required');
    }

    // Get event to validate
    const event = await eventRepository.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Validate team exists in the event
    const teams = event.teams || [];
    const teamIndex = teams.findIndex((t) => t.teamId === teamId.trim());

    if (teamIndex === -1) {
      throw new Error('Team not found in event');
    }

    // Upload file to S3
    let submissionUrl;
    try {
      submissionUrl = await uploadResumeToS3(fileBuffer, fileName, mimeType);
      console.log('✅ Submission document uploaded to S3:', submissionUrl);
    } catch (uploadError) {
      console.error('Failed to upload submission document:', uploadError);
      throw new Error(`Failed to upload submission document: ${uploadError.message}`);
    }

    // Update team with submission link
    const updatedTeams = [...teams];
    updatedTeams[teamIndex] = {
      ...updatedTeams[teamIndex],
      submissionLink: submissionUrl,
    };

    // Update event with updated teams array
    const updatedEvent = await eventRepository.updateEvent(eventId, {
      teams: updatedTeams,
    });

    if (!updatedEvent) {
      throw new Error('Failed to update event with submission link');
    }

    // Return the updated team info
    return {
      eventId: updatedEvent.eventId,
      teamId: teamId.trim(),
      submissionLink: submissionUrl,
      team: updatedTeams[teamIndex],
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getAllEvents,
  getCompetitions,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  registerAlumniAsJudge,
  getEventsJudgedBy,
  getRubricsForJudge,
  getTeams,
  getRubrics,
  updateTeamDetails,
  submitScores,
  getLeaderboard,
  getRegisteredEventsForStudent,
  submitCompetitionDocument,
};

