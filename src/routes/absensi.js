const router = require('express').Router()
const pool = require('../db')
const { authenticate, requireRole } = require('../middleware/auth')

// POST save attendance session
router.post('/', authenticate, async (req, res) => {
  const { tanggal, mapel, kelas, jurusan, records } = req.body
  // records: [{ siswa_id, status, keterangan }]

  if (!tanggal || !mapel || !kelas || !records || !records.length) {
    return res.status(400).json({ message: 'Data absensi tidak lengkap' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Get guru_id from user
    let guru_id = null
    if (req.user.role === 'guru') {
      const gr = await client.query('SELECT id FROM guru WHERE user_id=$1', [req.user.id])
      guru_id = gr.rows[0]?.id
    }

    // Create absensi session
    const sessionResult = await client.query(
      `INSERT INTO absensi_sesi (tanggal, mapel, kelas, jurusan, guru_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tanggal, mapel, kelas) DO UPDATE
         SET updated_at=NOW(), guru_id=EXCLUDED.guru_id
       RETURNING id`,
      [tanggal, mapel, kelas, jurusan, guru_id]
    )
    const sesiId = sessionResult.rows[0].id

    // Delete existing records for this session (for update case)
    await client.query('DELETE FROM absensi_detail WHERE sesi_id=$1', [sesiId])

    // Insert records
    for (const rec of records) {
      await client.query(
        `INSERT INTO absensi_detail (sesi_id, siswa_id, status, keterangan)
         VALUES ($1, $2, $3, $4)`,
        [sesiId, rec.siswa_id, rec.status, rec.keterangan || null]
      )
    }

    await client.query('COMMIT')
    res.status(201).json({ message: 'Absensi berhasil disimpan', sesi_id: sesiId })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  } finally {
    client.release()
  }
})

// GET rekap absensi with filters
router.get('/rekap', authenticate, async (req, res) => {
  const { dari, sampai, kelas, jurusan, mapel, page = 1, limit = 20 } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)

  try {
    let conditions = []
    let params = []
    let i = 1

    if (dari) { conditions.push(`s.tanggal >= $${i}`); params.push(dari); i++ }
    if (sampai) { conditions.push(`s.tanggal <= $${i}`); params.push(sampai); i++ }
    if (kelas) { conditions.push(`s.kelas = $${i}`); params.push(kelas); i++ }
    if (jurusan) { conditions.push(`s.jurusan = $${i}`); params.push(jurusan); i++ }
    if (mapel) { conditions.push(`s.mapel = $${i}`); params.push(mapel); i++ }

    // Guru can only see their own records
    if (req.user.role === 'guru') {
      conditions.push(`s.guru_id = (SELECT id FROM guru WHERE user_id=$${i})`)
      params.push(req.user.id)
      i++
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

    const countRes = await pool.query(
      `SELECT COUNT(*) FROM absensi_sesi s ${where}`,
      params
    )
    const total = parseInt(countRes.rows[0].count)

    const dataRes = await pool.query(
      `SELECT s.*,
        g.nama as guru_nama,
        COUNT(CASE WHEN d.status='H' THEN 1 END)::int as hadir,
        COUNT(CASE WHEN d.status='I' THEN 1 END)::int as izin,
        COUNT(CASE WHEN d.status='S' THEN 1 END)::int as sakit,
        COUNT(CASE WHEN d.status='A' THEN 1 END)::int as alpha,
        COUNT(d.id)::int as total_siswa
       FROM absensi_sesi s
       LEFT JOIN guru g ON g.id = s.guru_id
       LEFT JOIN absensi_detail d ON d.sesi_id = s.id
       ${where}
       GROUP BY s.id, g.nama
       ORDER BY s.tanggal DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...params, parseInt(limit), offset]
    )

    // Compute persen
    const rows = dataRes.rows.map(r => ({
      ...r,
      persen: r.total_siswa > 0 ? Math.round((r.hadir / r.total_siswa) * 100) : 0,
      tanggal: new Date(r.tanggal).toLocaleDateString('id-ID')
    }))

    res.json({ data: rows, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

// GET detail absensi for a session
router.get('/rekap/:id/detail', authenticate, async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT d.*, s.nama as siswa_nama, s.nis
       FROM absensi_detail d
       JOIN siswa s ON s.id = d.siswa_id
       WHERE d.sesi_id = $1
       ORDER BY s.nama`,
      [req.params.id]
    )
    res.json(r.rows)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// GET summary stats for reports
router.get('/summary', authenticate, async (req, res) => {
  const { dari, sampai, kelas, jurusan, mapel } = req.query
  try {
    let conditions = ['1=1']
    let params = []
    let i = 1

    if (dari) { conditions.push(`s.tanggal >= $${i}`); params.push(dari); i++ }
    if (sampai) { conditions.push(`s.tanggal <= $${i}`); params.push(sampai); i++ }
    if (kelas) { conditions.push(`s.kelas = $${i}`); params.push(kelas); i++ }
    if (jurusan) { conditions.push(`s.jurusan = $${i}`); params.push(jurusan); i++ }
    if (mapel) { conditions.push(`s.mapel = $${i}`); params.push(mapel); i++ }

    if (req.user.role === 'guru') {
      conditions.push(`s.guru_id = (SELECT id FROM guru WHERE user_id=$${i})`)
      params.push(req.user.id)
      i++
    }

    const where = 'WHERE ' + conditions.join(' AND ')

    const r = await pool.query(
      `SELECT
        COUNT(DISTINCT s.id)::int as total_pertemuan,
        SUM(CASE WHEN d.status='H' THEN 1 ELSE 0 END)::int as total_hadir,
        SUM(CASE WHEN d.status='I' THEN 1 ELSE 0 END)::int as total_izin,
        SUM(CASE WHEN d.status='S' THEN 1 ELSE 0 END)::int as total_sakit,
        SUM(CASE WHEN d.status='A' THEN 1 ELSE 0 END)::int as total_alpha,
        COUNT(d.id)::int as total_records
       FROM absensi_sesi s
       LEFT JOIN absensi_detail d ON d.sesi_id = s.id
       ${where}`,
      params
    )

    const stats = r.rows[0]
    const total = stats.total_records || 0
    stats.rata_hadir = total > 0 ? Math.round((stats.total_hadir / total) * 100) : 0

    // Siswa dengan alpha terbanyak
    const alphaRes = await pool.query(
      `SELECT si.nama, COUNT(d.id)::int as jumlah
       FROM absensi_detail d
       JOIN absensi_sesi s ON s.id = d.sesi_id
       JOIN siswa si ON si.id = d.siswa_id
       ${where} AND d.status='A'
       GROUP BY si.id, si.nama
       ORDER BY jumlah DESC LIMIT 1`,
      params
    )
    stats.siswa_alpha = alphaRes.rows[0] ? `${alphaRes.rows[0].nama} (${alphaRes.rows[0].jumlah})` : '-'

    // Kelas terbaik
    const kelasRes = await pool.query(
      `SELECT s.kelas,
        ROUND(COUNT(CASE WHEN d.status='H' THEN 1 END)::numeric / NULLIF(COUNT(d.id),0) * 100) as persen
       FROM absensi_detail d
       JOIN absensi_sesi s ON s.id = d.sesi_id
       ${where}
       GROUP BY s.kelas ORDER BY persen DESC LIMIT 1`,
      params
    )
    stats.kelas_terbaik = kelasRes.rows[0] ? `${kelasRes.rows[0].kelas} (${kelasRes.rows[0].persen}%)` : '-'

    // Weekly chart data
    const chartRes = await pool.query(
      `SELECT
        TO_CHAR(DATE_TRUNC('week', s.tanggal), 'Mon DD') as minggu,
        ROUND(COUNT(CASE WHEN d.status='H' THEN 1 END)::numeric / NULLIF(COUNT(d.id),0) * 100)::int as hadir,
        ROUND(COUNT(CASE WHEN d.status='A' THEN 1 END)::numeric / NULLIF(COUNT(d.id),0) * 100)::int as alpha
       FROM absensi_detail d
       JOIN absensi_sesi s ON s.id = d.sesi_id
       ${where}
       GROUP BY DATE_TRUNC('week', s.tanggal)
       ORDER BY DATE_TRUNC('week', s.tanggal)
       LIMIT 8`,
      params
    )
    stats.chart_data = chartRes.rows

    res.json(stats)
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
