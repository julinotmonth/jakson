const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const pool = require('../db')
const { authenticate, SECRET } = require('../middleware/auth')

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { role, identifier, password } = req.body

  if (!role || !identifier || !password) {
    return res.status(400).json({ message: 'Role, identifier, dan password wajib diisi' })
  }

  try {
    let user = null

    if (role === 'admin') {
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1 AND role = $2',
        [identifier, 'admin']
      )
      user = result.rows[0]
    } else if (role === 'guru') {
      const result = await pool.query(
        `SELECT u.*, g.nama, g.nip, g.mapel, g.email, g.no_hp
         FROM users u
         JOIN guru g ON g.user_id = u.id
         WHERE g.nip = $1 AND u.role = 'guru'`,
        [identifier]
      )
      user = result.rows[0]
    }

    if (!user) {
      return res.status(401).json({ message: 'Username/NIP atau password salah' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ message: 'Username/NIP atau password salah' })
    }

    const payload = {
      id: user.id,
      role: user.role,
      nama: user.nama || user.username,
      nip: user.nip || null,
      guruId: user.guru_id || null,
    }

    const token = jwt.sign(payload, SECRET, { expiresIn: '8h' })

    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        nama: user.nama || user.username,
        nip: user.nip || null,
        mapel: user.mapel || null,
        email: user.email || null,
        guruId: user.guru_id || null,
      }
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET /api/auth/me — verify token & get user info
router.get('/me', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const r = await pool.query('SELECT id, username, role FROM users WHERE id = $1', [req.user.id])
      const u = r.rows[0]
      return res.json({ ...u, nama: u.username })
    } else {
      const r = await pool.query(
        `SELECT u.id, u.role, g.id as guru_id, g.nama, g.nip, g.mapel, g.email, g.no_hp
         FROM users u JOIN guru g ON g.user_id = u.id WHERE u.id = $1`,
        [req.user.id]
      )
      return res.json(r.rows[0])
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT /api/auth/change-password
router.put('/change-password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body
  try {
    const r = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    const user = r.rows[0]
    const valid = await bcrypt.compare(oldPassword, user.password_hash)
    if (!valid) return res.status(400).json({ message: 'Password lama salah' })
    const hash = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.user.id])
    res.json({ message: 'Password berhasil diubah' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
