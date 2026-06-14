-- =============================================
-- SMK Angkasa Absensi - Database Schema
-- =============================================

-- Drop existing tables in reverse dependency order
DROP TABLE IF EXISTS absensi_detail CASCADE;
DROP TABLE IF EXISTS absensi_sesi CASCADE;
DROP TABLE IF EXISTS jadwal CASCADE;
DROP TABLE IF EXISTS siswa CASCADE;
DROP TABLE IF EXISTS guru CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS kelas CASCADE;
DROP TABLE IF EXISTS jurusan CASCADE;

-- JURUSAN
CREATE TABLE jurusan (
  id          SERIAL PRIMARY KEY,
  nama        VARCHAR(100) NOT NULL,
  kode        VARCHAR(10)  NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- KELAS
CREATE TABLE kelas (
  id          SERIAL PRIMARY KEY,
  nama        VARCHAR(50) NOT NULL UNIQUE,
  tingkat     VARCHAR(5)  NOT NULL CHECK (tingkat IN ('X','XI','XII')),
  jurusan     VARCHAR(10) NOT NULL REFERENCES jurusan(kode) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- USERS (auth accounts)
CREATE TABLE users (
  id             SERIAL PRIMARY KEY,
  username       VARCHAR(50) NOT NULL UNIQUE,
  password_hash  TEXT        NOT NULL,
  role           VARCHAR(10) NOT NULL CHECK (role IN ('admin','guru')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- GURU
CREATE TABLE guru (
  id          SERIAL PRIMARY KEY,
  nama        VARCHAR(100) NOT NULL,
  nip         VARCHAR(30)  NOT NULL UNIQUE,
  mapel       VARCHAR(100),
  email       VARCHAR(100),
  no_hp       VARCHAR(20),
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- SISWA
CREATE TABLE siswa (
  id            SERIAL PRIMARY KEY,
  nama          VARCHAR(100) NOT NULL,
  nis           VARCHAR(20)  NOT NULL UNIQUE,
  jenis_kelamin VARCHAR(15) DEFAULT 'Laki-laki',
  kelas         VARCHAR(50) REFERENCES kelas(nama) ON UPDATE CASCADE ON DELETE SET NULL,
  jurusan       VARCHAR(10) REFERENCES jurusan(kode) ON UPDATE CASCADE ON DELETE SET NULL,
  tahun_masuk   INTEGER,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- JADWAL MENGAJAR
CREATE TABLE jadwal (
  id           SERIAL PRIMARY KEY,
  hari         VARCHAR(10) NOT NULL,
  jam          VARCHAR(20),
  jam_mulai    VARCHAR(10),
  jam_selesai  VARCHAR(10),
  mapel        VARCHAR(100) NOT NULL,
  kelas        VARCHAR(50),
  guru_id      INTEGER REFERENCES guru(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ABSENSI SESI (per class session)
CREATE TABLE absensi_sesi (
  id          SERIAL PRIMARY KEY,
  tanggal     DATE NOT NULL,
  mapel       VARCHAR(100) NOT NULL,
  kelas       VARCHAR(50)  NOT NULL,
  jurusan     VARCHAR(10),
  guru_id     INTEGER REFERENCES guru(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tanggal, mapel, kelas)
);

-- ABSENSI DETAIL (per student per session)
CREATE TABLE absensi_detail (
  id          SERIAL PRIMARY KEY,
  sesi_id     INTEGER NOT NULL REFERENCES absensi_sesi(id) ON DELETE CASCADE,
  siswa_id    INTEGER NOT NULL REFERENCES siswa(id) ON DELETE CASCADE,
  status      CHAR(1) NOT NULL CHECK (status IN ('H','I','S','A')),
  keterangan  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (sesi_id, siswa_id)
);

-- Indexes
CREATE INDEX idx_siswa_kelas    ON siswa(kelas);
CREATE INDEX idx_siswa_jurusan  ON siswa(jurusan);
CREATE INDEX idx_jadwal_guru    ON jadwal(guru_id);
CREATE INDEX idx_absensi_sesi_tanggal ON absensi_sesi(tanggal);
CREATE INDEX idx_absensi_sesi_guru    ON absensi_sesi(guru_id);
CREATE INDEX idx_absensi_detail_sesi  ON absensi_detail(sesi_id);
CREATE INDEX idx_absensi_detail_siswa ON absensi_detail(siswa_id);

-- =============================================
-- SEED DATA
-- =============================================

-- Admin user (password: admin123)
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
-- Note: hash above is bcrypt of 'admin123'

-- Jurusan
INSERT INTO jurusan (nama, kode) VALUES
('Rekayasa Perangkat Lunak', 'RPL'),
('Teknik Komputer & Jaringan', 'TKJ'),
('Akuntansi', 'AKT'),
('Administrasi Perkantoran', 'AP');

-- Kelas
INSERT INTO kelas (nama, tingkat, jurusan) VALUES
('X RPL 1', 'X', 'RPL'), ('X RPL 2', 'X', 'RPL'),
('XI RPL 1', 'XI', 'RPL'), ('XI RPL 2', 'XI', 'RPL'),
('XII RPL 1', 'XII', 'RPL'),
('X TKJ 1', 'X', 'TKJ'), ('XI TKJ 1', 'XI', 'TKJ'), ('XII TKJ 1', 'XII', 'TKJ'),
('X AKT 1', 'X', 'AKT'), ('XI AKT 1', 'XI', 'AKT'),
('X AP 1', 'X', 'AP'), ('XI AP 1', 'XI', 'AP');

-- Guru users (password: guru123)
-- bcrypt hash of 'guru123'
INSERT INTO users (username, password_hash, role) VALUES
('197001000001', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7y', 'guru'),
('197002000002', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7y', 'guru'),
('197003000003', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7y', 'guru'),
('197004000004', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7y', 'guru'),
('197005000005', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7y', 'guru'),
('197006000006', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7y', 'guru'),
('197007000007', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7y', 'guru'),
('197008000008', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7y', 'guru'),
('197009000009', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7y', 'guru'),
('197010000010', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh7y', 'guru');

-- Guru records
INSERT INTO guru (nama, nip, mapel, email, no_hp, user_id) VALUES
('Ahmad Fauzi, S.Kom',      '197001000001', 'Pemrograman Web',     'guru1@smkangkasa.sch.id',  '081234567890', (SELECT id FROM users WHERE username='197001000001')),
('Budi Raharjo, S.T',       '197002000002', 'Basis Data',          'guru2@smkangkasa.sch.id',  '081234567891', (SELECT id FROM users WHERE username='197002000002')),
('Citra Lestari, S.Pd',     '197003000003', 'Jaringan Komputer',   'guru3@smkangkasa.sch.id',  '081234567892', (SELECT id FROM users WHERE username='197003000003')),
('Dewi Anggraini, S.E',     '197004000004', 'Matematika',          'guru4@smkangkasa.sch.id',  '081234567893', (SELECT id FROM users WHERE username='197004000004')),
('Eko Santoso, M.Kom',      '197005000005', 'Bahasa Indonesia',    'guru5@smkangkasa.sch.id',  '081234567894', (SELECT id FROM users WHERE username='197005000005')),
('Fitri Handayani, S.Pd',   '197006000006', 'Pemrograman Web',     'guru6@smkangkasa.sch.id',  '081234567895', (SELECT id FROM users WHERE username='197006000006')),
('Guntur Wicaksono, S.T',   '197007000007', 'Basis Data',          'guru7@smkangkasa.sch.id',  '081234567896', (SELECT id FROM users WHERE username='197007000007')),
('Hani Pratiwi, S.Pd',      '197008000008', 'Jaringan Komputer',   'guru8@smkangkasa.sch.id',  '081234567897', (SELECT id FROM users WHERE username='197008000008')),
('Irfan Maulana, S.Kom',    '197009000009', 'Matematika',          'guru9@smkangkasa.sch.id',  '081234567898', (SELECT id FROM users WHERE username='197009000009')),
('Junaedi Prasetyo, M.Pd',  '197010000010', 'Bahasa Indonesia',    'guru10@smkangkasa.sch.id', '081234567899', (SELECT id FROM users WHERE username='197010000010'));

-- Siswa (20 students across classes)
INSERT INTO siswa (nama, nis, jenis_kelamin, kelas, jurusan, tahun_masuk) VALUES
('Andi Pratama',       '221010010001', 'Laki-laki',  'X RPL 1',    'RPL', 2022),
('Budi Santoso',       '221010010002', 'Laki-laki',  'X RPL 2',    'RPL', 2022),
('Citra Dewi',         '221010010003', 'Perempuan',  'XI RPL 1',   'RPL', 2022),
('Dian Rahayu',        '221010010004', 'Perempuan',  'XI RPL 2',   'RPL', 2022),
('Eko Wahyudi',        '221010010005', 'Laki-laki',  'XII RPL 1',  'RPL', 2022),
('Fajar Nugroho',      '221010010006', 'Laki-laki',  'X TKJ 1',   'TKJ', 2022),
('Gita Permata',       '221010010007', 'Perempuan',  'XI TKJ 1',  'TKJ', 2022),
('Hendra Kusuma',      '221010010008', 'Laki-laki',  'XII TKJ 1', 'TKJ', 2022),
('Indah Sari',         '221010010009', 'Perempuan',  'X AKT 1',   'AKT', 2023),
('Joko Prabowo',       '221010010010', 'Laki-laki',  'XI AKT 1',  'AKT', 2023),
('Kartika Wulandari',  '221010010011', 'Perempuan',  'X AP 1',    'AP',  2023),
('Lina Marlina',       '221010010012', 'Perempuan',  'XI AP 1',   'AP',  2023),
('Maulana Akbar',      '221010010013', 'Laki-laki',  'X RPL 1',   'RPL', 2023),
('Nadia Putri',        '221010010014', 'Perempuan',  'X RPL 2',   'RPL', 2023),
('Oki Setiawan',       '221010010015', 'Laki-laki',  'XI RPL 1',  'RPL', 2023),
('Putri Rahmawati',    '221010010016', 'Perempuan',  'XI RPL 2',  'RPL', 2023),
('Qori Annisa',        '221010010017', 'Perempuan',  'XII RPL 1', 'RPL', 2022),
('Rizky Firmansyah',   '221010010018', 'Laki-laki',  'X TKJ 1',  'TKJ', 2023),
('Sari Dewi',          '221010010019', 'Perempuan',  'X AKT 1',  'AKT', 2023),
('Taufik Hidayat',     '221010010020', 'Laki-laki',  'X AP 1',   'AP',  2023);

-- Jadwal Mengajar
INSERT INTO jadwal (hari, jam, jam_mulai, jam_selesai, mapel, kelas, guru_id) VALUES
('Senin',  '07.30 – 09.00', '07.30', '09.00', 'Pemrograman Web', 'XI RPL 1',   1),
('Senin',  '09.15 – 10.45', '09.15', '10.45', 'Basis Data',      'XI RPL 2',   1),
('Selasa', '07.30 – 09.00', '07.30', '09.00', 'Pemrograman Web', 'X RPL 1',    1),
('Rabu',   '10.00 – 11.30', '10.00', '11.30', 'Basis Data',      'XII RPL 1',  1),
('Kamis',  '07.30 – 09.00', '07.30', '09.00', 'Pemrograman Web', 'XI RPL 2',   1),
('Jumat',  '07.30 – 09.00', '07.30', '09.00', 'Basis Data',      'X RPL 2',    1),
('Senin',  '07.30 – 09.00', '07.30', '09.00', 'Jaringan Komputer','X TKJ 1',   3),
('Rabu',   '07.30 – 09.00', '07.30', '09.00', 'Jaringan Komputer','XI TKJ 1',  3),
('Kamis',  '09.15 – 10.45', '09.15', '10.45', 'Matematika',      'X AKT 1',   4),
('Jumat',  '09.15 – 10.45', '09.15', '10.45', 'Bahasa Indonesia', 'X AP 1',   5);
