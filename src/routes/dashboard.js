const router = require('express').Router()
const pool = require('../db')
const { authenticate } = require('../middleware/auth')

router.get('/admin', authenticate, async (req, res) => {
  try {
    const [siswaRes, guruRes, kelasRes, jurusanRes, recentSiswa, absensiToday] = await Promise.all([
      pool.query('SELECT COUNT(*)::int as total FROM siswa'),
      pool.query('SELECT COUNT(*)::int as total FROM guru'),
      pool.query('SELECT COUNT(*)::int as total FROM kelas'),
      pool.query('SELECT COUNT(*)::int as total FROM jurusan'),
      pool.query('SELECT * FROM siswa ORDER BY created_at DESC LIMIT 10'),
      pool.query(`
        SELECT COUNT(DISTINCT sesi_id)::int as sesi_hari_ini
        FROM absensi_detail d
        JOIN absensi_sesi s ON s.id = d.sesi_id
        WHERE s.tanggal = CURRENT_DATE
      `)
    ])

    res.json({
      stats: {
        total_siswa: siswaRes.rows[0].total,
        total_guru: guruRes.rows[0].total,
        total_kelas: kelasRes.rows[0].total,
        total_jurusan: jurusanRes.rows[0].total,
        sesi_hari_ini: absensiToday.rows[0].sesi_hari_ini
      },
      recent_siswa: recentSiswa.rows
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

router.get('/guru', authenticate, async (req, res) => {
  try {
    const guruRes = await pool.query('SELECT id FROM guru WHERE user_id=$1', [req.user.id])
    const guruId = guruRes.rows[0]?.id

    if (!guruId) return res.status(404).json({ message: 'Data guru tidak ditemukan' })

    const [jadwalRes, absensiStat, recentAbsensi] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int as total FROM jadwal WHERE guru_id=$1`,
        [guruId]
      ),
      pool.query(
        `SELECT
          COUNT(DISTINCT s.id)::int as total_sesi,
          COUNT(CASE WHEN d.status='H' THEN 1 END)::int as total_hadir,
          COUNT(d.id)::int as total_records
         FROM absensi_sesi s
         LEFT JOIN absensi_detail d ON d.sesi_id = s.id
         WHERE s.guru_id=$1 AND s.tanggal >= CURRENT_DATE - INTERVAL '30 days'`,
        [guruId]
      ),
      pool.query(
        `SELECT s.tanggal, s.mapel, s.kelas,
          COUNT(CASE WHEN d.status='H' THEN 1 END)::int as hadir,
          COUNT(CASE WHEN d.status='A' THEN 1 END)::int as alpha,
          COUNT(d.id)::int as total
         FROM absensi_sesi s
         LEFT JOIN absensi_detail d ON d.sesi_id = s.id
         WHERE s.guru_id=$1
         GROUP BY s.id
         ORDER BY s.tanggal DESC LIMIT 5`,
        [guruId]
      )
    ])

    const stat = absensiStat.rows[0]
    const rataHadir = stat.total_records > 0
      ? Math.round((stat.total_hadir / stat.total_records) * 100) : 0

    res.json({
      stats: {
        total_jadwal: jadwalRes.rows[0].total,
        total_sesi_bulan_ini: stat.total_sesi,
        rata_kehadiran: rataHadir
      },
      recent_absensi: recentAbsensi.rows.map(r => ({
        ...r,
        tanggal: new Date(r.tanggal).toLocaleDateString('id-ID'),
        persen: r.total > 0 ? Math.round((r.hadir / r.total) * 100) : 0
      }))
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
