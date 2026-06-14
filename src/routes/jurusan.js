const router = require('express').Router()
const pool = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')

// GET all jurusan (public for dropdowns)
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jurusan ORDER BY nama')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST create jurusan
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { nama, kode } = req.body
  if (!nama || !kode) return res.status(400).json({ message: 'Nama dan kode wajib diisi' })
  try {
    const r = await pool.query(
      'INSERT INTO jurusan (nama, kode) VALUES ($1, $2) RETURNING *',
      [nama, kode.toUpperCase()]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Kode jurusan sudah digunakan' })
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT update jurusan
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { nama, kode } = req.body
  try {
    const r = await pool.query(
      'UPDATE jurusan SET nama = $1, kode = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [nama, kode.toUpperCase(), req.params.id]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Jurusan tidak ditemukan' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE jurusan
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM jurusan WHERE id = $1 RETURNING id', [req.params.id])
    if (!r.rows[0]) return res.status(404).json({ message: 'Jurusan tidak ditemukan' })
    res.json({ message: 'Jurusan berhasil dihapus' })
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ message: 'Jurusan masih digunakan oleh kelas' })
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
