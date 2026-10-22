-- TerraSiklus — data contoh (seed) untuk Neon
-- Jalankan setelah `drizzle/schema.sql`. Skrip idempoten: aman dijalankan berulang kali.
--
-- Catatan: tanggal memakai CURRENT_DATE sehingga contoh selalu tampak "segar"
--_relative_ ke hari ini. Aplikasi juga menyiapkan data ini sendiri lewat
-- `ensureStarterData()` saat API pertama kali dipanggil.

BEGIN;

-- 1. Profil demo.
INSERT INTO profiles (username)
VALUES ('sahabat-tani')
ON CONFLICT (username) DO NOTHING;

-- 2. Keluarga botani.
INSERT INTO plant_families (name)
VALUES
  ('Solanaceae'),
  ('Fabaceae'),
  ('Cucurbitaceae'),
  ('Amaranthaceae'),
  ('Asteraceae'),
  ('Apiaceae'),
  ('Poaceae'),
  ('Brassicaceae'),
  ('Amaryllidaceae'),
  ('Malvaceae'),
  ('Lamiaceae')
ON CONFLICT (name) DO NOTHING;

-- 3. Katalog tanaman + kebutuhan hara.
INSERT INTO crops (common_name, family_id, nutrient_demand)
SELECT v.common_name, f.id, v.nutrient_demand
FROM (VALUES
  ('Tomat',           'Solanaceae',     'Tinggi'),
  ('Cabai',           'Solanaceae',     'Tinggi'),
  ('Terong',          'Solanaceae',     'Tinggi'),
  ('Kacang panjang',  'Fabaceae',       'Rendah'),
  ('Buncis',          'Fabaceae',       'Rendah'),
  ('Kacang tanah',    'Fabaceae',       'Rendah'),
  ('Mentimun',        'Cucurbitaceae',  'Tinggi'),
  ('Labu',            'Cucurbitaceae',  'Tinggi'),
  ('Semangka',        'Cucurbitaceae',  'Tinggi'),
  ('Bayam',           'Amaranthaceae',  'Sedang'),
  ('Selada',          'Asteraceae',     'Sedang'),
  ('Wortel',          'Apiaceae',       'Rendah'),
  ('Jagung',          'Poaceae',        'Tinggi'),
  ('Sawi hijau',      'Brassicaceae',   'Sedang'),
  ('Kubis',           'Brassicaceae',   'Tinggi'),
  ('Bawang merah',    'Amaryllidaceae', 'Sedang'),
  ('Okra',            'Malvaceae',      'Sedang'),
  ('Kemangi',         'Lamiaceae',      'Rendah')
) AS v(common_name, family_name, nutrient_demand)
JOIN plant_families f ON f.name = v.family_name
ON CONFLICT (common_name) DO NOTHING;

-- 4. Kebun contoh.
INSERT INTO farms (owner_id, name, location)
SELECT pr.id, 'Kebun Pagi', 'Bandung, Jawa Barat'
FROM profiles pr
WHERE pr.username = 'sahabat-tani'
  AND NOT EXISTS (
    SELECT 1 FROM farms f WHERE f.owner_id = pr.id AND f.name = 'Kebun Pagi'
  );

-- 5. Petak contoh.
INSERT INTO plots (farm_id, name, area, soil_type)
SELECT f.id, v.name, v.area, v.soil_type
FROM farms f
CROSS JOIN (VALUES
  ('Bedeng Sayur', 12.0::real, 'Lempung berhumus'),
  ('Petak Pangan',  9.5::real, 'Lempung berpasir'),
  ('Kebun Sudut',   7.0::real, 'Humus')
) AS v(name, area, soil_type)
WHERE f.name = 'Kebun Pagi'
  AND NOT EXISTS (
    SELECT 1 FROM plots pl WHERE pl.farm_id = f.id AND pl.name = v.name
  );

-- 6. Riwayat tanam. planted_days / harvested_days = jumlah hari sebelum hari ini.
INSERT INTO plantings (plot_id, crop_id, planted_on, harvested_on, notes)
SELECT
  pl.id,
  c.id,
  (CURRENT_DATE - v.planted_days)::date,
  CASE WHEN v.harvested_days IS NULL THEN NULL ELSE (CURRENT_DATE - v.harvested_days)::date END,
  v.notes
FROM plots pl
CROSS JOIN (VALUES
  ('Bedeng Sayur', 'Bayam',          145,  98::int, 'Panen terakhir sehat, sisa daun dibenamkan sebagai kompos.'),
  ('Bedeng Sayur', 'Tomat',           62, NULL,   'Pertumbuhan baik; cek kelembapan setiap pagi.'),
  ('Petak Pangan',  'Sawi hijau',     180, 135::int, 'Tidak ditemukan serangan hama berarti.'),
  ('Petak Pangan',  'Kacang panjang',  88, NULL,   'Bunga mulai muncul, tanaman tampak sehat.'),
  ('Kebun Sudut',   'Wortel',         110,  52::int, 'Panen umbi berukuran merata.'),
  ('Kebun Sudut',   'Selada',          32, NULL,   'Daun muda mulai rapat; siram secukupnya.')
) AS v(plot_name, crop_name, planted_days, harvested_days, notes)
JOIN crops c ON c.common_name = v.crop_name
WHERE pl.name = v.plot_name
  AND NOT EXISTS (
    SELECT 1 FROM plantings p2
    WHERE p2.plot_id = pl.id
      AND p2.crop_id = c.id
      AND p2.planted_on = (CURRENT_DATE - v.planted_days)::date
  );

-- 7. Hasil uji tanah terakhir.
INSERT INTO soil_tests (plot_id, tested_on, ph, n, p, k, organic_matter)
SELECT
  pl.id,
  (CURRENT_DATE - v.tested_days)::date,
  v.ph,
  v.n,
  v.p,
  v.k,
  v.organic_matter
FROM plots pl
CROSS JOIN (VALUES
  ('Bedeng Sayur',  6::int, 6.4::real, 42::real, 28::real, 138::real, 4.8::real),
  ('Petak Pangan', 14::int, 6.1::real, 35::real, 31::real, 116::real, 4.2::real),
  ('Kebun Sudut',  11::int, 6.7::real, 38::real, 25::real, 124::real, 5.1::real)
) AS v(plot_name, tested_days, ph, n, p, k, organic_matter)
WHERE pl.name = v.plot_name
  AND NOT EXISTS (
    SELECT 1 FROM soil_tests s
    WHERE s.plot_id = pl.id
      AND s.tested_on = (CURRENT_DATE - v.tested_days)::date
  );

COMMIT;
