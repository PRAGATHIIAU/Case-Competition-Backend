const multer = require('multer');
const path = require('path');

// Import allowed file types from config
const { ALLOWED_FILE_TYPES, ALLOWED_EXTENSIONS } = require('../config/aws');

/**
 * Multer configuration for file uploads
 * Only accepts PDF, DOC, and DOCX files
 */
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Check file MIME type
  if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Check file extension as fallback
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'), false);
    }
  }
};

/**
 * Multer middleware for resume upload
 * Limits file size to 5MB
 */
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

module.exports = upload;

