const jwt = require('jsonwebtoken')

const SECRET = process.env.JWT_SECRET || 'smk-angkasa-secret-2024'

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token tidak ditemukan' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Token tidak valid atau kadaluarsa' })
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ message: 'Akses ditolak' })
    }
    next()
  }
}

module.exports = { authenticate, requireRole, SECRET }
