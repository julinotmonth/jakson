const express = require('express')
const cors = require('cors')
require('dotenv').config()

const authRoutes = require('./routes/auth')
const jurusanRoutes = require('./routes/jurusan')
const kelasRoutes = require('./routes/kelas')
const siswRoutes = require('./routes/siswa')
const guruRoutes = require('./routes/guru')
const jadwalRoutes = require('./routes/jadwal')
const absensiRoutes = require('./routes/absensi')
const dashboardRoutes = require('./routes/dashboard')

const app = express()

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ],
  credentials: true
}))
app.use(express.json())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/jurusan', jurusanRoutes)
app.use('/api/kelas', kelasRoutes)
app.use('/api/siswa', siswRoutes)
app.use('/api/guru', guruRoutes)
app.use('/api/jadwal', jadwalRoutes)
app.use('/api/absensi', absensiRoutes)
app.use('/api/dashboard', dashboardRoutes)

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`✅ SMK Backend running on port ${PORT}`)
})
