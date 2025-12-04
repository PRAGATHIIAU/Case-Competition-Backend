/**
 * Profile Change Log Model
 * Tracks user profile changes for batch matching triggers
 */

const CREATE_TABLE_QUERY = `
  CREATE TABLE IF NOT EXISTS user_profile_change_log (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    change_type VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_user_profile_change_log_user_id ON user_profile_change_log(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_profile_change_log_timestamp ON user_profile_change_log(timestamp);
  CREATE INDEX IF NOT EXISTS idx_user_profile_change_log_change_type ON user_profile_change_log(change_type);
`;

const ProfileChangeLogModel = {
  TABLE_NAME: 'user_profile_change_log',
  
  COLUMNS: {
    ID: 'id',
    USER_ID: 'user_id',
    CHANGE_TYPE: 'change_type',
    TIMESTAMP: 'timestamp',
  },
  
  CHANGE_TYPES: {
    CREATE: 'CREATE',
    UPDATE: 'UPDATE',
  },
};

module.exports = {
  ProfileChangeLogModel,
  CREATE_TABLE_QUERY,
};

