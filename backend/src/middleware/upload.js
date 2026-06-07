const multer = require('multer')

// Store in memory (no disk), max 10MB
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowed = ['text/csv', 'application/json', 'text/plain']
  const allowedExt = ['.csv', '.json']
  const ext = '.' + file.originalname.split('.').pop().toLowerCase()

  if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error('Only CSV and JSON files are allowed'), false)
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
})

module.exports = upload
