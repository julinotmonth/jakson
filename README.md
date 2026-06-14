# 🏫 SMK Angkasa — Sistem Informasi Absensi
**Full-Stack: React + Express.js + PostgreSQL**

---

## 📁 Struktur Proyek

```
smk-absensi/
├── smk-backend/          ← Express.js + PostgreSQL
│   ├── src/
│   │   ├── index.js        ← Entry point server
│   │   ├── db.js           ← Koneksi PostgreSQL
│   │   ├── middleware/
│   │   │   └── auth.js     ← JWT middleware
│   │   └── routes/
│   │       ├── auth.js     ← Login, ganti password
│   │       ├── jurusan.js  ← CRUD jurusan
│   │       ├── kelas.js    ← CRUD kelas
│   │       ├── siswa.js    ← CRUD siswa (pagination + filter)
│   │       ├── guru.js     ← CRUD guru (+ buat akun user)
│   │       ├── jadwal.js   ← CRUD jadwal mengajar
│   │       ├── absensi.js  ← Input & rekap absensi
│   │       └── dashboard.js← Stats dashboard admin & guru
│   ├── database/
│   │   └── schema.sql      ← Schema + seed data PostgreSQL
│   ├── .env.example
│   └── package.json
│
└── smk-frontend/         ← React + Vite + Tailwind
    ├── src/
    │   ├── utils/
    │   │   └── api.js      ← ⭐ Semua API call ke backend
    │   ├── pages/
    │   │   ├── admin/      ← Dashboard, Siswa, Guru, Kelas, Jurusan, Laporan, Profil
    │   │   └── guru/       ← Dashboard, Absensi, Jadwal, Laporan, Profil
    │   └── store/
    │       └── authStore.js← Zustand auth state
    └── .env
```

---

## 🚀 Cara Menjalankan

### 1. Setup Database PostgreSQL

```bash
# Buat database
psql -U postgres -c "CREATE DATABASE smk_absensi"

# Jalankan schema + seed data
psql -U postgres -d smk_absensi -f smk-backend/database/schema.sql
```

### 2. Backend (Express.js)

```bash
cd smk-backend

# Copy dan sesuaikan environment
cp .env.example .env
# Edit .env sesuai konfigurasi PostgreSQL Anda

# Install dependencies
npm install

# Jalankan server (development)
npm run dev
# atau production
npm start
```

Server berjalan di **http://localhost:3001**

### 3. Frontend (React)

```bash
cd smk-frontend

# Install dependencies
npm install

# Jalankan dev server
npm run dev
```

Frontend berjalan di **http://localhost:5173**

---

## 🔐 Kredensial Login

| Role  | Identifier      | Password   |
|-------|-----------------|------------|
| Admin | `admin`         | `admin123` |
| Guru  | `197001000001`  | `guru123`  |

---

## 🛢️ Skema Database

| Tabel             | Keterangan                          |
|-------------------|-------------------------------------|
| `users`           | Akun login (admin & guru)           |
| `jurusan`         | Program keahlian                    |
| `kelas`           | Kelas aktif per jurusan             |
| `guru`            | Data guru + relasi ke users         |
| `siswa`           | Data siswa                          |
| `jadwal`          | Jadwal mengajar per guru            |
| `absensi_sesi`    | Sesi absensi (per kelas per mapel)  |
| `absensi_detail`  | Status tiap siswa per sesi          |

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint                    | Keterangan         |
|--------|-----------------------------|--------------------|
| POST   | `/api/auth/login`           | Login              |
| GET    | `/api/auth/me`              | Cek token          |
| PUT    | `/api/auth/change-password` | Ganti password     |

### Data Master
| Method | Endpoint             | Keterangan              |
|--------|----------------------|-------------------------|
| GET    | `/api/jurusan`       | List jurusan            |
| POST   | `/api/jurusan`       | Tambah jurusan (admin)  |
| PUT    | `/api/jurusan/:id`   | Edit jurusan (admin)    |
| DELETE | `/api/jurusan/:id`   | Hapus jurusan (admin)   |
| *(sama)* | `/api/kelas`       | CRUD kelas              |

### Siswa
| Method | Endpoint       | Query Params                          |
|--------|----------------|---------------------------------------|
| GET    | `/api/siswa`   | `search`, `kelas`, `jurusan`, `page`, `limit` |
| POST   | `/api/siswa`   | Body: `{nama, nis, jenis_kelamin, kelas, jurusan, tahun_masuk}` |
| PUT    | `/api/siswa/:id` | Update siswa                        |
| DELETE | `/api/siswa/:id` | Hapus satu                          |
| DELETE | `/api/siswa`   | Body: `{ids: [1,2,3]}` — bulk delete |

### Guru
| Method | Endpoint           | Keterangan                              |
|--------|--------------------|-----------------------------------------|
| GET    | `/api/guru`        | List guru (dengan `search`)             |
| POST   | `/api/guru`        | Tambah guru + buat akun user otomatis   |
| PUT    | `/api/guru/:id`    | Edit guru (admin)                       |
| PUT    | `/api/guru/:id/profil` | Edit profil sendiri (guru)          |
| DELETE | `/api/guru/:id`    | Hapus guru + akun user                  |

### Absensi
| Method | Endpoint                       | Keterangan              |
|--------|--------------------------------|-------------------------|
| POST   | `/api/absensi`                 | Simpan absensi          |
| GET    | `/api/absensi/rekap`           | Rekap dengan filter     |
| GET    | `/api/absensi/rekap/:id/detail`| Detail per sesi         |
| GET    | `/api/absensi/summary`         | Statistik ringkasan     |

### Dashboard
| Method | Endpoint               | Keterangan         |
|--------|------------------------|--------------------|
| GET    | `/api/dashboard/admin` | Stats untuk admin  |
| GET    | `/api/dashboard/guru`  | Stats untuk guru   |

---

## ⚙️ Environment Variables (Backend `.env`)

```env
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=smk_absensi
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=ganti-dengan-secret-yang-kuat
FRONTEND_URL=http://localhost:5173
```

---

## ✅ Fitur yang Sudah Terhubung ke Backend

- [x] Login/Logout (JWT)
- [x] Dashboard Admin (stats real-time dari DB)
- [x] Dashboard Guru (stats personal)
- [x] CRUD Siswa + pagination + filter + bulk delete
- [x] CRUD Guru + otomatis buat akun login
- [x] CRUD Kelas
- [x] CRUD Jurusan
- [x] Jadwal Mengajar (per guru)
- [x] Input Absensi → tersimpan ke PostgreSQL
- [x] Rekap Laporan Absensi dengan filter
- [x] Detail absensi per sesi
- [x] Statistik & chart tren kehadiran
- [x] Ganti password (admin & guru)
- [x] Edit profil (guru)
