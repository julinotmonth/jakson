const router = require('express').Router()
const pool = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')

router.get('/', authenticate, async (req, res) => {
  try {
    const r = await pool.query(`
      SELECT k.*, j.nama as jurusan_nama
      FROM kelas k
      LEFT JOIN jurusan j ON j.kode = k.jurusan
      ORDER BY k.tingkat, k.nama
    `)
    res.json(r.rows)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { nama, tingkat, jurusan } = req.body
  if (!nama || !tingkat || !jurusan) return res.status(400).json({ message: 'Semua field wajib diisi' })
  try {
    const r = await pool.query(
      'INSERT INTO kelas (nama, tingkat, jurusan) VALUES ($1, $2, $3) RETURNING *',
      [nama, tingkat, jurusan]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'Nama kelas sudah ada' })
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { nama, tingkat, jurusan } = req.body
  try {
    const r = await pool.query(
      'UPDATE kelas SET nama=$1, tingkat=$2, jurusan=$3, updated_at=NOW() WHERE id=$4 RETURNING *',
      [nama, tingkat, jurusan, req.params.id]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Kelas tidak ditemukan' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM kelas WHERE id=$1 RETURNING id', [req.params.id])
    if (!r.rows[0]) return res.status(404).json({ message: 'Kelas tidak ditemukan' })
    res.json({ message: 'Kelas berhasil dihapus' })
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ message: 'Kelas masih memiliki data siswa' })
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
