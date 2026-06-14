const router = require('express').Router()
const pool = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')

// GET jadwal - admin gets all, guru gets their own
router.get('/', authenticate, async (req, res) => {
  try {
    let r
    if (req.user.role === 'admin') {
      r = await pool.query(
        `SELECT j.*, g.nama as guru_nama FROM jadwal j
         LEFT JOIN guru g ON g.id = j.guru_id
         ORDER BY CASE j.hari
           WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3
           WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6
           ELSE 7 END, j.jam_mulai`
      )
    } else {
      // Guru only sees their own schedule
      r = await pool.query(
        `SELECT j.* FROM jadwal j
         JOIN guru g ON g.id = j.guru_id
         WHERE g.user_id = $1
         ORDER BY CASE j.hari
           WHEN 'Senin' THEN 1 WHEN 'Selasa' THEN 2 WHEN 'Rabu' THEN 3
           WHEN 'Kamis' THEN 4 WHEN 'Jumat' THEN 5 WHEN 'Sabtu' THEN 6
           ELSE 7 END, j.jam_mulai`,
        [req.user.id]
      )
    }
    res.json(r.rows)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { hari, jam_mulai, jam_selesai, mapel, kelas, guru_id } = req.body
  if (!hari || !jam_mulai || !mapel || !kelas || !guru_id) {
    return res.status(400).json({ message: 'Semua field wajib diisi' })
  }
  try {
    const jam = `${jam_mulai} – ${jam_selesai || ''}`
    const r = await pool.query(
      `INSERT INTO jadwal (hari, jam, jam_mulai, jam_selesai, mapel, kelas, guru_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [hari, jam.trim(), jam_mulai, jam_selesai, mapel, kelas, guru_id]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { hari, jam_mulai, jam_selesai, mapel, kelas, guru_id } = req.body
  const jam = `${jam_mulai} – ${jam_selesai || ''}`
  try {
    const r = await pool.query(
      `UPDATE jadwal SET hari=$1, jam=$2, jam_mulai=$3, jam_selesai=$4, mapel=$5, kelas=$6, guru_id=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [hari, jam.trim(), jam_mulai, jam_selesai, mapel, kelas, guru_id, req.params.id]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Jadwal tidak ditemukan' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM jadwal WHERE id=$1 RETURNING id', [req.params.id])
    if (!r.rows[0]) return res.status(404).json({ message: 'Jadwal tidak ditemukan' })
    res.json({ message: 'Jadwal berhasil dihapus' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
