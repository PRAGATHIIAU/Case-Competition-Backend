/**
 * Event Model
 * Defines the structure and validation for Event documents in DynamoDB
 */

/**
 * Event document structure:
 * {
 *   eventId: string (partition key),
 *   eventInfo: {
 *     name: string,
 *     description: string,
 *     date: string (ISO 8601),
 *     ...other event info fields
 *   },
 *   teams: array of {
 *     teamId: string,
 *     teamName: string,
 *     members: array of strings (student IDs or email addresses),
 *     slotPreference: number (optional - slot number preference),
 *     submissionLink: string (optional - S3 URL of submitted document)
 *   },
 *   rubrics: array of {
 *     rubricId: string,
 *     name: string,
 *     maxScore: number,
 *     weight: number
 *   },
 *   judges: array of {
 *     judgeId: string,
 *     status: "approved" | "pending"
 *   },
 *   slots: array of {
 *     slotNumber: number,
 *     startTime: string (ISO 8601),
 *     endTime: string (ISO 8601),
 *     location: string
 *   },
 *   scores: array of {
 *     judgeId: string,
 *     teamId: string,
 *     rubricId: string,
 *     score: number,
 *     timestamp: string (ISO 8601)
 *   },
 *   createdAt: string (ISO 8601),
 *   updatedAt: string (ISO 8601)
 * }
 */

const EventModel = {
  // Table name (will be used in repository)
  TABLE_NAME: 'Events',

  // Field names
  FIELDS: {
    EVENT_ID: 'eventId',
    EVENT_INFO: 'eventInfo',
    TEAMS: 'teams',
    RUBRICS: 'rubrics',
    JUDGES: 'judges',
    SLOTS: 'slots',
    SCORES: 'scores',
    CREATED_AT: 'createdAt',
    UPDATED_AT: 'updatedAt',
  },

  // Team structure
  TEAM_FIELDS: {
    TEAM_ID: 'teamId',
    TEAM_NAME: 'teamName',
    MEMBERS: 'members',
    SLOT_PREFERENCE: 'slotPreference',
    SUBMISSION_LINK: 'submissionLink',
  },

  // Rubric structure
  RUBRIC_FIELDS: {
    RUBRIC_ID: 'rubricId',
    NAME: 'name',
    MAX_SCORE: 'maxScore',
    WEIGHT: 'weight',
  },

  // Judge structure
  JUDGE_FIELDS: {
    JUDGE_ID: 'judgeId',
    STATUS: 'status',
  },

  // Slot structure
  SLOT_FIELDS: {
    SLOT_NUMBER: 'slotNumber',
    START_TIME: 'startTime',
    END_TIME: 'endTime',
    LOCATION: 'location',
  },

  // Score structure
  SCORE_FIELDS: {
    JUDGE_ID: 'judgeId',
    TEAM_ID: 'teamId',
    RUBRIC_ID: 'rubricId',
    SCORE: 'score',
    TIMESTAMP: 'timestamp',
  },
};

/**
 * Validate event data structure
 * @param {Object} eventData - Event data to validate
 * @throws {Error} If validation fails
 */
const validateEventData = (eventData) => {
  const { eventInfo, teams, rubrics, judges, slots, scores } = eventData;

  // Validate eventInfo
  if (eventInfo !== undefined) {
    if (typeof eventInfo !== 'object' || Array.isArray(eventInfo)) {
      throw new Error('eventInfo must be an object');
    }
    if (eventInfo.name !== undefined && (typeof eventInfo.name !== 'string' || !eventInfo.name.trim())) {
      throw new Error('eventInfo.name must be a non-empty string');
    }
  }

  // Validate teams
  if (teams !== undefined) {
    if (!Array.isArray(teams)) {
      throw new Error('Teams must be an array');
    }
    teams.forEach((team, index) => {
      if (!team.teamId || typeof team.teamId !== 'string') {
        throw new Error(`Team at index ${index} must have a valid teamId`);
      }
      if (!team.teamName || typeof team.teamName !== 'string') {
        throw new Error(`Team at index ${index} must have a valid teamName`);
      }
      if (!Array.isArray(team.members)) {
        throw new Error(`Team at index ${index} must have a members array`);
      }
      if (team.slotPreference !== undefined && typeof team.slotPreference !== 'number') {
        throw new Error(`Team at index ${index} must have a valid slotPreference (number)`);
      }
      if (team.submissionLink !== undefined && (typeof team.submissionLink !== 'string' || !team.submissionLink.trim())) {
        throw new Error(`Team at index ${index} must have a valid submissionLink (string)`);
      }
    });
  }

  // Validate rubrics
  if (rubrics !== undefined) {
    if (!Array.isArray(rubrics)) {
      throw new Error('Rubrics must be an array');
    }
    rubrics.forEach((rubric, index) => {
      if (!rubric.rubricId || typeof rubric.rubricId !== 'string') {
        throw new Error(`Rubric at index ${index} must have a valid rubricId`);
      }
      if (!rubric.name || typeof rubric.name !== 'string') {
        throw new Error(`Rubric at index ${index} must have a valid name`);
      }
      if (typeof rubric.maxScore !== 'number' || rubric.maxScore <= 0) {
        throw new Error(`Rubric at index ${index} must have a valid maxScore (positive number)`);
      }
      if (typeof rubric.weight !== 'number' || rubric.weight < 0) {
        throw new Error(`Rubric at index ${index} must have a valid weight (non-negative number)`);
      }
    });
  }

  // Validate judges
  if (judges !== undefined) {
    if (!Array.isArray(judges)) {
      throw new Error('Judges must be an array');
    }
    judges.forEach((judge, index) => {
      if (!judge.judgeId || typeof judge.judgeId !== 'string') {
        throw new Error(`Judge at index ${index} must have a valid judgeId`);
      }
      if (judge.status !== 'approved' && judge.status !== 'pending') {
        throw new Error(`Judge at index ${index} must have status "approved" or "pending"`);
      }
    });
  }

  // Validate slots
  if (slots !== undefined) {
    if (!Array.isArray(slots)) {
      throw new Error('Slots must be an array');
    }
    slots.forEach((slot, index) => {
      if (typeof slot.slotNumber !== 'number') {
        throw new Error(`Slot at index ${index} must have a valid slotNumber (number)`);
      }
      if (!slot.startTime || typeof slot.startTime !== 'string' || !slot.startTime.trim()) {
        throw new Error(`Slot at index ${index} must have a valid startTime (ISO 8601 string)`);
      }
      if (!slot.endTime || typeof slot.endTime !== 'string' || !slot.endTime.trim()) {
        throw new Error(`Slot at index ${index} must have a valid endTime (ISO 8601 string)`);
      }
      if (!slot.location || typeof slot.location !== 'string' || !slot.location.trim()) {
        throw new Error(`Slot at index ${index} must have a valid location (string)`);
      }
    });
  }

  // Validate scores
  if (scores !== undefined) {
    if (!Array.isArray(scores)) {
      throw new Error('Scores must be an array');
    }
    scores.forEach((score, index) => {
      if (!score.judgeId || typeof score.judgeId !== 'string') {
        throw new Error(`Score at index ${index} must have a valid judgeId`);
      }
      if (!score.teamId || typeof score.teamId !== 'string') {
        throw new Error(`Score at index ${index} must have a valid teamId`);
      }
      if (!score.rubricId || typeof score.rubricId !== 'string') {
        throw new Error(`Score at index ${index} must have a valid rubricId`);
      }
      if (typeof score.score !== 'number' || score.score < 0) {
        throw new Error(`Score at index ${index} must have a valid score (non-negative number)`);
      }
    });
  }
};

module.exports = {
  EventModel,
  validateEventData,
};

