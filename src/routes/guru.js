const router = require('express').Router()
const bcrypt = require('bcryptjs')
const pool = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')

router.get('/', authenticate, async (req, res) => {
  const { search = '' } = req.query
  try {
    const r = await pool.query(
      `SELECT g.*, u.username FROM guru g
       LEFT JOIN users u ON u.id = g.user_id
       WHERE g.nama ILIKE $1 OR g.nip ILIKE $1
       ORDER BY g.nama`,
      [`%${search}%`]
    )
    res.json(r.rows)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/:id', authenticate, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT g.*, u.username FROM guru g
       LEFT JOIN users u ON u.id = g.user_id
       WHERE g.id = $1`,
      [req.params.id]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Guru tidak ditemukan' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST - create guru + user account
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { nama, nip, mapel, email, no_hp, password } = req.body
  if (!nama || !nip) return res.status(400).json({ message: 'Nama dan NIP wajib diisi' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Create user account
    const pwd = password || 'guru123'
    const hash = await bcrypt.hash(pwd, 10)
    const userResult = await client.query(
      `INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'guru') RETURNING id`,
      [nip, hash]
    )
    const userId = userResult.rows[0].id

    // Create guru record
    const guruResult = await client.query(
      `INSERT INTO guru (nama, nip, mapel, email, no_hp, user_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nama, nip, mapel || '', email || '', no_hp || '', userId]
    )

    await client.query('COMMIT')
    res.status(201).json(guruResult.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') return res.status(400).json({ message: 'NIP sudah digunakan' })
    res.status(500).json({ message: 'Server error' })
  } finally {
    client.release()
  }
})

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { nama, nip, mapel, email, no_hp } = req.body
  try {
    const r = await pool.query(
      `UPDATE guru SET nama=$1, nip=$2, mapel=$3, email=$4, no_hp=$5, updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [nama, nip, mapel, email, no_hp, req.params.id]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Guru tidak ditemukan' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const guruResult = await client.query('SELECT user_id FROM guru WHERE id=$1', [req.params.id])
    if (!guruResult.rows[0]) {
      await client.query('ROLLBACK')
      return res.status(404).json({ message: 'Guru tidak ditemukan' })
    }
    const userId = guruResult.rows[0].user_id
    await client.query('DELETE FROM guru WHERE id=$1', [req.params.id])
    await client.query('DELETE FROM users WHERE id=$1', [userId])
    await client.query('COMMIT')
    res.json({ message: 'Guru berhasil dihapus' })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ message: 'Server error' })
  } finally {
    client.release()
  }
})

// PUT update own profile (guru)
router.put('/:id/profil', authenticate, async (req, res) => {
  const { nama, email, no_hp } = req.body
  try {
    const r = await pool.query(
      `UPDATE guru SET nama=$1, email=$2, no_hp=$3, updated_at=NOW()
       WHERE id=$4 AND user_id=$5 RETURNING *`,
      [nama, email, no_hp, req.params.id, req.user.id]
    )
    if (!r.rows[0]) return res.status(403).json({ message: 'Akses ditolak' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
