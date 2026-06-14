const router = require('express').Router()
const pool = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')

// GET with pagination + filters
router.get('/', authenticate, async (req, res) => {
  const { search = '', kelas = '', jurusan = '', page = 1, limit = 10 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)

  try {
    let conditions = []
    let params = []
    let i = 1

    if (search) {
      conditions.push(`(s.nama ILIKE $${i} OR s.nis ILIKE $${i})`)
      params.push(`%${search}%`)
      i++
    }
    if (kelas) {
      conditions.push(`s.kelas = $${i}`)
      params.push(kelas)
      i++
    }
    if (jurusan) {
      conditions.push(`s.jurusan = $${i}`)
      params.push(jurusan)
      i++
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : ''

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM siswa s ${where}`,
      params
    )
    const total = parseInt(countResult.rows[0].count)

    const dataResult = await pool.query(
      `SELECT s.* FROM siswa s ${where} ORDER BY s.nama LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    )

    res.json({
      data: dataResult.rows,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET single siswa
router.get('/:id', authenticate, async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM siswa WHERE id = $1', [req.params.id])
    if (!r.rows[0]) return res.status(404).json({ message: 'Siswa tidak ditemukan' })
    res.json(r.rows[0])
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// POST create
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { nama, nis, jenis_kelamin, kelas, jurusan, tahun_masuk } = req.body
  if (!nama || !nis || !kelas || !jurusan) {
    return res.status(400).json({ message: 'Nama, NIS, kelas, dan jurusan wajib diisi' })
  }
  try {
    const r = await pool.query(
      `INSERT INTO siswa (nama, nis, jenis_kelamin, kelas, jurusan, tahun_masuk)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nama, nis, jenis_kelamin || 'Laki-laki', kelas, jurusan, tahun_masuk || new Date().getFullYear()]
    )
    res.status(201).json(r.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'NIS sudah digunakan' })
    res.status(500).json({ message: 'Server error' })
  }
})

// PUT update
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { nama, nis, jenis_kelamin, kelas, jurusan, tahun_masuk } = req.body
  try {
    const r = await pool.query(
      `UPDATE siswa SET nama=$1, nis=$2, jenis_kelamin=$3, kelas=$4, jurusan=$5, tahun_masuk=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [nama, nis, jenis_kelamin, kelas, jurusan, tahun_masuk, req.params.id]
    )
    if (!r.rows[0]) return res.status(404).json({ message: 'Siswa tidak ditemukan' })
    res.json(r.rows[0])
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ message: 'NIS sudah digunakan' })
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE single
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const r = await pool.query('DELETE FROM siswa WHERE id=$1 RETURNING id', [req.params.id])
    if (!r.rows[0]) return res.status(404).json({ message: 'Siswa tidak ditemukan' })
    res.json({ message: 'Siswa berhasil dihapus' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// DELETE bulk
router.delete('/', authenticate, requireRole('admin'), async (req, res) => {
  const { ids } = req.body
  if (!ids || !ids.length) return res.status(400).json({ message: 'IDs wajib diisi' })
  try {
    await pool.query('DELETE FROM siswa WHERE id = ANY($1::int[])', [ids])
    res.json({ message: `${ids.length} siswa berhasil dihapus` })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
