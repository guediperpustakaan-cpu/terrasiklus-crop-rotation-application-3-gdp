-- TerraSiklus — skema PostgreSQL untuk Neon
-- Jalankan skrip ini di Neon SQL Editor (atau lewat psql).
-- Skrip bersifat idempoten: aman dijalankan berulang kali.
--
-- Padding: jalankan `drizzle/schema.sql` lebih dulu, lalu `drizzle/seed.sql`.

BEGIN;

-- Profil pengguna. Ganti "sahabat-tani" dengan identitas pengguna sebenarnya
-- ketika autentikasi sudah ditambahkan.
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique
  ON profiles (username);

-- Kebun milik satu profil.
CREATE TABLE IF NOT EXISTS farms (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name VARCHAR(160) NOT NULL,
  location VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS farms_owner_id_idx ON farms (owner_id);

-- Petak (bedeng) di dalam sebuah kebun.
CREATE TABLE IF NOT EXISTS plots (
  id SERIAL PRIMARY KEY,
  farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name VARCHAR(120) NOT NULL,
  area REAL NOT NULL,
  soil_type VARCHAR(120) NOT NULL
);

CREATE INDEX IF NOT EXISTS plots_farm_id_idx ON plots (farm_id);

-- Keluarga botani tanaman (Solanaceae, Fabaceae, ...).
CREATE TABLE IF NOT EXISTS plant_families (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS plant_families_name_unique
  ON plant_families (name);

-- Katalog tanaman beserta kebutuhan hara (Rendah / Sedang / Tinggi).
CREATE TABLE IF NOT EXISTS crops (
  id SERIAL PRIMARY KEY,
  common_name VARCHAR(120) NOT NULL,
  family_id INTEGER NOT NULL REFERENCES plant_families(id) ON DELETE RESTRICT,
  nutrient_demand VARCHAR(24) NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS crops_common_name_unique
  ON crops (common_name);
CREATE INDEX IF NOT EXISTS crops_family_id_idx ON crops (family_id);

-- Satu baris = satu siklus tanam pada satu petak.
CREATE TABLE IF NOT EXISTS plantings (
  id SERIAL PRIMARY KEY,
  plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  crop_id INTEGER NOT NULL REFERENCES crops(id) ON DELETE RESTRICT,
  planted_on DATE NOT NULL,
  harvested_on DATE,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS plantings_plot_planted_idx
  ON plantings (plot_id, planted_on);
CREATE INDEX IF NOT EXISTS plantings_crop_id_idx ON plantings (crop_id);

-- Hasil uji tanah per petak.
CREATE TABLE IF NOT EXISTS soil_tests (
  id SERIAL PRIMARY KEY,
  plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
  tested_on DATE NOT NULL,
  ph REAL NOT NULL,
  n REAL NOT NULL,
  p REAL NOT NULL,
  k REAL NOT NULL,
  organic_matter REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS soil_tests_plot_tested_idx
  ON soil_tests (plot_id, tested_on);

COMMIT;
