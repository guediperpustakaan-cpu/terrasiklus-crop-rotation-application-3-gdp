# TerraSiklus

**Open Source oleh MZF - 2026**

TerraSiklus adalah aplikasi pencatat kebun, riwayat tanam, rotasi keluarga tanaman, dan kesehatan tanah. Antarmuka sepenuhnya berbahasa Indonesia; data disimpan di PostgreSQL (Neon) melalui Drizzle ORM.

Aplikasi ini gratis, bebas iklan, dan **open source** — source code lengkapnya bisa diunduh langsung dari dalam aplikasi lewat tombol **Unduh Source Code** (sidebar kiri & footer).

---

## Daftar Isi

- [Fitur](#fitur)
- [Teknologi](#teknologi)
- [Menjalankan secara lokal](#menjalankan-secara-lokal)
- [Menyiapkan Neon PostgreSQL](#menyiapkan-neon-postgresql)
- [Skema Basis Data](#skema-basis-data)
- [Deploy ke Vercel](#deploy-ke-vercel)
- [Widget Trakteer](#widget-trakteer)
- [Unduh Source Code](#unduh-source-code)
- [Perintah npm](#perintah-npm)
- [Struktur Proyek](#struktur-proyek)
- [Dokumentasi lanjutan](#dokumentasi-lanjutan)
- [Lisensi](#lisensi)

---

## Fitur

- **Ringkasan kebun** — petak, tanaman aktif, aktivitas terbaru, dan pH rata-rata dalam satu layar.
- **Multi kebun & petak** — setiap kebun memiliki petak (bedeng) dengan luas dan jenis tanah.
- **Katalog tanaman Indonesia** — 18 tanaman dengan keluarga botani dan kebutuhan hara (Rendah/Sedang/Tinggi).
- **Riwayat tanam** — tanggal tanam/panen, catatan perawatan, hama, dan penyakit.
- **Mesin rekomendasi rotasi** — menghindari keluarga tanaman yang sama dalam 2 tahun terakhir; mencatat keluarga berulang memerlukan konfirmasi eksplisit (HTTP `409`).
- **Kesehatan tanah** — uji pH, nitrogen, fosfor, kalium, dan bahan organik per petak.
- **Aksi panen** — menutup siklus tanam dan melepas tanaman dari daftar "tumbuh".
- **Floating widget Trakteer** — pilihan nominal traktiran + QR code langsung di dalam aplikasi.
- **Unduh source code** — paket ZIP lengkap tersedia di dalam aplikasi.

---

## Teknologi

| Lapisan | Teknologi |
| --- | --- |
| Framework | Next.js 16.4.2 (App Router, React 19.2) |
| Bahasa | TypeScript 5.9 (mode `strict`) |
| ORM | Drizzle ORM 0.45 + Drizzle Kit |
| Database | PostgreSQL di Neon (Postgres 18) |
| Driver | `pg` 8.20 (node-postgres) |
| Gaya | Tailwind CSS v4 + CSS kustom |
| Ikon | `lucide-react` |
| QR Code | `react-qr-code` |
| Lint | ESLint 9 (`eslint-config-next`) |

---

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env    # isi DATABASE_URL
npm run dev
```

Buka `http://localhost:3000`.

Script `predev` otomatis membuat paket source code (`public/terrasiklus-source.zip`) supaya tombol unduh langsung berfungsi.

---

## Menyiapkan Neon PostgreSQL

1. Buat proyek dan basis data PostgreSQL di Neon.
2. Salin connection string dari **Connect** di dashboard Neon.
   - Untuk aplikasi di Vercel/serverless, pakai URL **pooled** (host berakhiran `-pooler`) supaya `pg` tidak membuka koneksi baru untuk tiap request.
   - URL direct (tanpa `-pooler`) untuk Neon SQL Editor dan `psql` lokal.
   - Pastikan `sslmode=require` ada di connection string.
3. Buat `.env` dari `.env.example` lalu isi `DATABASE_URL`. **Jangan pernah** commit `.env` atau menaruh kredensial di dalam kode.
4. Terapkan skema ke basis data. Pilih salah satu:

   **Opsi A — Drizzle Kit (disarankan, sinkron dengan `src/db/schema.ts`)**

   ```bash
   npm run db:migrate    # menjalankan migrasi di drizzle/migrations
   # atau
   npm run db:push       # sinkronkan langsung dari src/db/schema.ts
   ```

   **Opsi B — Neon SQL Editor**

   Jalankan berurutan di Neon SQL Editor:

   1. `drizzle/schema.sql` — membuat 7 tabel, foreign key, dan indeks (idempoten).
   2. `drizzle/seed.sql` — mengisi data contoh (idempoten).

   Aplikasi juga menyiapkan data contoh sendiri lewat `ensureStarterData()` saat API pertama kali dipanggil, jadi `seed.sql` bersifat opsional.
5. Verifikasi koneksi:

   ```bash
   curl http://localhost:3000/api/health
   ```

---

## Skema Basis Data

Sumber tipe Drizzle berada di `src/db/schema.ts`.

| Tabel | Kolom | Relasi |
| --- | --- | --- |
| `profiles` | `id`, `username` (unik), `created_at` | — |
| `farms` | `id`, `owner_id`, `name`, `location`, `created_at` | → `profiles` (CASCADE) |
| `plots` | `id`, `farm_id`, `name`, `area`, `soil_type` | → `farms` (CASCADE) |
| `plant_families` | `id`, `name` (unik) | — |
| `crops` | `id`, `common_name` (unik), `family_id`, `nutrient_demand` | → `plant_families` (RESTRICT) |
| `plantings` | `id`, `plot_id`, `crop_id`, `planted_on`, `harvested_on`, `notes` | → `plots` (CASCADE), → `crops` (RESTRICT) |
| `soil_tests` | `id`, `plot_id`, `tested_on`, `ph`, `n`, `p`, `k`, `organic_matter` | → `plots` (CASCADE) |

Diagram relasi:

```
profiles ──1:N──> farms ──1:N──> plots ──1:N──> plantings ──N:1──> crops ──N:1──> plant_families
                      └──1:N──> plots ──1:N──> soil_tests
```

Berkas penting:

| Berkas | Isi |
| --- | --- |
| `drizzle/schema.sql` | SQL idempoten untuk Neon SQL Editor |
| `drizzle/seed.sql` | SQL idempoten data contoh |
| `drizzle/migrations/` | Migrasi yang dikelola Drizzle Kit |
| `src/db/schema.ts` | Definisi tabel & tipe Drizzle |
| `src/db/index.ts` | Pool PostgreSQL + instance Drizzle (lazy, di-cache di `globalThis`) |

---

## Deploy ke Vercel

1. Push kode ke repositori Git, lalu hubungkan repositori tersebut di Vercel (**Add New → Project**). Framework terdeteksi otomatis sebagai Next.js.
2. Tambahkan environment variable:
   - **Key:** `DATABASE_URL`
   - **Value:** connection string Neon **pooled** (host berakhiran `-pooler`).
   - Opsional: `DATABASE_POOL_MAX` (disarankan `5` untuk serverless).
3. **Environment:** pilih `Production` dan `Preview`.
4. Deploy. Vercel menjalankan `npm run build` (yang memicu `prebuild` → pembuatan paket source code) lalu `npm run start`.
5. Smoke test setelah deploy:

   ```bash
   curl https://<domain-anda>.vercel.app/api/health
   ```

### Catatan serverless

- `pg` sudah termasuk daftar `serverExternalPackages` bawaan Next.js, jadi tidak perlu konfigurasi `serverExternalPackages` di `next.config.ts`.
- Pool koneksi dibuat secara lazy di `src/db/index.ts` dan di-cache pada `globalThis`, sehingga tidak membuat koneksi saat build. Listener `pool.on("error")` mencegah crash ketika koneksi idle diputus.
- `DATABASE_POOL_MAX` membatasi jumlah koneksi agar tidak melampaui batas Neon pada paket Anda.
- Semua route API memakai `export const dynamic = "force-dynamic"` sehingga tidak pernah di-cache sebagai halaman statis.

---

## Widget Trakteer

Widget mengambang khas Trakteer berada di **sudut kanan bawah** layar.

| Aspek | Detail |
| --- | --- |
| Teks tombol | "Web app ini gratis & bebas iklan. Kopi kecil, server tetap jalan" |
| Komponen | `src/components/trakteer-widget.tsx` |
| Halaman Trakteer | `https://trakteer.id/perpus_opera` |
| Nominal | Rp6.000 → Rp12.000 → Rp24.000 → Rp48.000 → Rp96.000 → Rp192.000 → Rp384.000 (kelipatan dua) |
| QR Code | Dibuat di sisi klien (`react-qr-code`), isi `https://trakteer.id/perpus_opera?amount=<nominal>` |
| Interaksi | Klik tombol → panel terbuka; pilih nominal → QR & tautan ikut berubah; `Esc` atau klik luar → menutup |

QR code tampil **di dalam** aplikasi tanpa memindahkan pengguna ke halaman lain. Tombol **Buka Trakteer** tersedia sebagai alternatif bagi pengguna yang memindai dari layar komputer.

Mengganti tujuan donasi cukup mengubah konstanta di `src/components/trakteer-widget.tsx`:

```ts
const TRAKTEER_PAGE = "https://trakteer.id/perpus_opera";
const TIP_AMOUNTS = [6_000, 12_000, 24_000, 48_000, 96_000, 192_000, 384_000];
```

---

## Unduh Source Code

Paket source code lengkap dibuat otomatis oleh `scripts/build-source-zip.mjs` dan diletakkan di `public/terrasiklus-source.zip`.

- Dipicu oleh `predev` dan `prebuild`, jadi selalu sinkron dengan kode terbaru.
- Isi: seluruh `src/`, `drizzle/`, `scripts/`, konfigurasi, `README.md`, `LICENSE`, dan `package-lock.json`.
- **Berkas rahasia dikecualikan**: `.env`, `.env.local`, `.env.production`, dan sejenisnya tidak pernah masuk paket.
- `node_modules/`, `.next/`, `.git/`, dan artefak build juga dikecualikan.

Tombol unduh tersedia di dua tempat:

- Sidebar kiri → **Unduh Source Code**
- Footer aplikasi → **Unduh Source Code**

Untuk membuat ulang paket secara manual:

```bash
node scripts/build-source-zip.mjs
```

---

## Perintah npm

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi (menjalankan `prebuild`) |
| `npm run start` | Menjalankan build produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run db:generate` | Membuat migrasi baru dari `src/db/schema.ts` |
| `npm run db:migrate` | Menjalankan migrasi yang belum diterapkan |
| `npm run db:push` | Sinkronkan skema langsung ke basis data |
| `npm run db:studio` | Drizzle Studio (antarmuka web) |

---

## Struktur Proyek

```
terrasiklus/
├─ docs/
│  ├─ API.md              # referensi endpoint
│  └─ ARSITEKTUR.md       # arsitektur, alur data, dan catatan teknis
├─ drizzle/
│  ├─ migrations/         # migrasi Drizzle Kit (+ meta journal)
│  ├─ schema.sql          # SQL idempoten untuk Neon SQL Editor
│  └─ seed.sql            # SQL idempoten data contoh
├─ public/
│  └─ terrasiklus-source.zip  # hasil build script (diabaikan git)
├─ scripts/
│  └─ build-source-zip.mjs   # pembuat paket source code
├─ src/
│  ├─ app/
│  │  ├─ api/             # route handler: dashboard, farms, plots, plantings, ...
│  │  ├─ globals.css      # seluruh gaya aplikasi
│  │  ├─ layout.tsx       # metadata + widget Trakteer
│  │  └─ page.tsx         # halaman utama
│  ├─ components/
│  │  ├─ dashboard.tsx    # shell aplikasi & semua tampilan
│  │  ├─ plot-card.tsx
│  │  ├─ rotation-engine.tsx
│  │  ├─ soil-form.tsx
│  │  └─ trakteer-widget.tsx
│  ├─ db/
│  │  ├─ index.ts         # pool + instance Drizzle (lazy)
│  │  └─ schema.ts        # definisi tabel
│  ├─ lib/
│  │  └─ bootstrap.ts     # seeding profil, katalog, dan data contoh
│  └─ types/garden.ts     # tipe bersama
├─ .env.example
├─ drizzle.config.ts
├─ LICENSE                # MIT — Open Source oleh MZF - 2026
└─ README.md
```

---

## Dokumentasi lanjutan

- [`docs/API.md`](docs/API.md) — referensi lengkap seluruh endpoint.
- [`docs/ARSITEKTUR.md`](docs/ARSITEKTUR.md) — arsitektur, alur data, keputusan teknis, dan daftar periksa sebelum produksi.

---

## Mengganti data contoh

Aplikasi menyiapkan profil demonstrasi `sahabat-tani` beserta satu kebun, tiga petak, dan riwayat tanam ilustratif. Sebelum aplikasi dibuka untuk pengguna nyata:

1. Hubungkan autentikasi (misalnya Clerk, Auth.js, atau session sendiri).
2. Ganti `DEMO_USERNAME` di `src/lib/bootstrap.ts` dengan identitas pengguna sebenarnya.
3. Hapus data contoh dari basis data (`TRUNCATE profiles CASCADE`).

---

## Lisensi

MIT — **Open Source oleh MZF - 2026**.

Lihat [`LICENSE`](LICENSE) untuk teks lengkap.
