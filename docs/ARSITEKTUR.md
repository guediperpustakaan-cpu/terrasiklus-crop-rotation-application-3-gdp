# Arsitektur & Catatan Teknis — TerraSiklus

**Open Source oleh MZF - 2026**

Dokumen ini menjelaskan bagaimana TerraSiklus disusun, alur datanya, keputusan teknis yang diambil, dan daftar periksa sebelum aplikasi dipakai di produksi.

---

## 1. Ringkasan Arsitektur

```
Browser
   │
   │  fetch() ke /api/*
   ▼
Next.js 16 (App Router, Node runtime)
   │
   ├─ src/app/api/**/route.ts   ← route handler (semua force-dynamic)
   │        │
   │        ├─ validasi manual (field, rentang, format tanggal)
   │        ├─ ensureStarterData()  ← seeding idempoten
   │        └─ Drizzle ORM
   │
   ├─ src/db/index.ts           ← pool PostgreSQL (lazy, cached)
   ├─ src/db/schema.ts          ← definisi tabel
   ├─ src/lib/bootstrap.ts      ← data contoh & katalog tanaman
   └─ src/components/**         ← UI React (client components)
           │
           └─ Neon PostgreSQL (pooled)
```

### Prinsip yang dipegang

1. **Tidak ada koneksi database saat build.** Pool dibuat secara lazy di dalam fungsi, bukan di level modul. Tanpa ini, `next build` akan gagal di CI/hosting yang tidak punya `DATABASE_URL`.
2. **Semua query berada di route handler.** Tidak ada Server Component yang menyentuh database secara langsung, sehingga data mudah di-cache per request dan tidak membocorkan koneksi ke bundle klien.
3. **Seeding idempoten.** `ensureStarterData()` aman dipanggil di setiap request — ia memeriksa keberadaan data sebelum menulis.
4. **Validasi di server.** Client bisa dilewati; setiap endpoint memvalidasi ulang tipe, panjang, dan rentang nilai.

---

## 2. Struktur Direktori

| Direktori | Isi |
| --- | --- |
| `src/app/` | Layout, halaman, dan route handler API |
| `src/components/` | Komponen React client-side (dashboard, plot card, rotasi, widget Trakteer) |
| `src/db/` | Koneksi pool + skema Drizzle |
| `src/lib/` | Logika bersama (bootstrap/seeding) |
| `src/types/` | Tipe TypeScript bersama |
| `drizzle/` | Skema SQL, seed SQL, dan migrasi Drizzle Kit |
| `scripts/` | Skrip build (pembuat paket source code) |
| `docs/` | Dokumentasi (README, API, arsitektur) |

---

## 3. Lapisan Database

### 3.1 Pool koneksi (`src/db/index.ts`)

```ts
export function getDb() { ... }
export function getPool() { ... }
```

- Pool dibuat **saat dipanggil pertama kali**, bukan saat modul diimpor.
- Di-cache pada `globalThis` agar hot-reload di development tidak membuka pool baru terus-menerus.
- `pool.on("error", ...)` mencatat error idle-connection. Tanpa listener ini, koneksi yang diputus server dapat membuat proses Node berhenti mendadak.
- `connectionTimeoutMillis: 10_000` dan `statement_timeout: 30_000` mencegah request menggantung tanpa batas.
- `DATABASE_POOL_MAX` mengatur jumlah koneksi. Rekomendasi: `10` untuk lokal, `5` untuk Vercel serverless (menghemat kuota Neon).

> **Catatan serverless:** pada model serverless, setiap instance adalah instance terpisah. Karena itu batas koneksi Neon per-project sering menjadi bottleneck. Gunakan URL pooled (`-pooler`) dan nilai `DATABASE_POOL_MAX` yang konservatif.

### 3.2 Skema (`src/db/schema.ts`)

Tujuh tabel dengan foreign key berantai:

```
profiles → farms → plots → { plantings, soil_tests }
                          plantings → crops → plant_families
```

- `ON DELETE CASCADE` dipakai di sisi "pemilik" (hapus kebun → hapus petak → hapus riwayat).
- `ON DELETE RESTRICT` dipakai untuk referensi katalog (`crops`, `plant_families`) supaya data historis tidak pernah menggantung.
- Indeks dibuat pada kolom yang sering disaring: `farms.owner_id`, `plots.farm_id`, `plantings.plot_id`, `soil_tests.plot_id`.

### 3.3 Migrasi vs. SQL manual

Dua jalur setup sengaja disediakan agar onboarding tidak mudah gagal:

| | Drizzle Kit | SQL Editor |
| --- | --- | --- |
| Perintah | `npm run db:migrate` / `db:push` | tempel `drizzle/schema.sql` lalu `drizzle/seed.sql` |
| Sumber kebenaran | `src/db/schema.ts` + `migrations/` | `drizzle/schema.sql` |
| Cocok untuk | Developers | Siap deploy dari SQL Editor |
| Idempoten | Ya (drizzle mencatat migrasi) | Ya (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT`) |

Keduanya menghasilkan skema yang identik.

> **Peringatan encoding:** berkas migrasi/seed harus disimpan **tanpa BOM**. PowerShell `Set-Content -Encoding utf8` menulis BOM, dan `drizzle-kit migrate` akan keluar dengan kode `1` tanpa pesan error yang jelas. Selalu gunakan `[System.IO.File]::WriteAllText($path, $text, (New-Object System.Text.UTF8Encoding($false)))` saat menulis berkas dari PowerShell.

### 3.4 Seeding (`src/lib/bootstrap.ts`)

| Fungsi | Perilaku |
| --- | --- |
| `ensureDemoProfile()` | Membuat profil `sahabat-tani` bila belum ada |
| `ensureCatalog()` | Mengisi 11 keluarga + 18 tanaman bila belum ada |
| `ensureStarterData()` | Membuat 1 kebun, 3 petak, dan riwayat tanam contoh bila belum ada |

`ensureStarterData()` dipanggil oleh semua endpoint. Pada kondisi stabil (data sudah ada) ia hanya menjalankan **4 query baca dan 0 query tulis** — tidak membebani database.

---

## 4. Lapisan API

Semua route handler berada di `src/app/api/` dan menandai dirinya `export const dynamic = "force-dynamic"` agar tidak pernah di-cache sebagai statis.

| Route | Tanggung jawab |
| --- | --- |
| `health/route.ts` | Health check + uji koneksi database |
| `dashboard/route.ts` | Menggabungkan profil, kebun, petak, tanam, dan uji tanah menjadi satu payload |
| `farms/route.ts` | Daftar dan pembuatan kebun |
| `plots/route.ts` | Pembuatan petak |
| `rotation/route.ts` | Mesin rekomendasi rotasi |
| `plantings/route.ts` | Pencatatan siklus tanam + deteksi keluarga berulang |
| `plantings/harvest/route.ts` | Penutupan siklus panen |
| `soil-tests/route.ts` | Penyimpanan hasil uji tanah |

### Pola validasi

Tiga lapis, konsisten di semua endpoint:

1. **Bentuk & tipe** — `Number.isInteger`, `typeof body.x === "string"`, dll.
2. **Rentang & panjang** — luas petak, pH 0–14, catatan ≤ 2.000 karakter, nama 2–120 karakter.
3. **Kepemilikan** — query dengan join ke `farms.owner_id = profile.id` memastikan data milik profil aktif. Pengembalian 404 (bukan 403) agar keberadaan sumber daya tidak bocor.

### Aturan rotasi

Mesin rotasi bukan sekadar "hindari tanaman yang sama", tetapi menghindari **keluarga botani** yang sama:

- Semua keluarga yang dipakai dalam 2 tahun terakhir diblokir.
- Keluarga tanaman terakhir ikut diblokir, apa pun usianya.
- Urutan rekomendasi mengikuti kebutuhan hara: bila tanaman terakhir butuh hara tinggi, kali ini rekomendasikan tanaman berhara ringan lebih dulu — membantu tanah pulih.

Ketika pengguna tetap memilih keluarga yang diblokir, server membalas `409` dengan pesan yang memuat tanaman sebelumnya. Client menampilkannya sebagai dialog konfirmasi, lalu mengirim ulang dengan `confirmRotation: true`.

---

## 5. Lapisan Antarmuka

Semua komponen di `src/components/` adalah Client Component yang mengambil data lewat `fetch`.

### Pola state React yang dipakai

| Masalah | Solusi yang dipakai |
| --- | --- |
| Race condition saat beberapa fetch paralel | Kunci request (`requestKey`) sehingga respons lama diabaikan |
| `useEffect` yang memanggil `setState` sinkron | State diturunkan (`useMemo`) atau di-update di dalam callback async |
| Input yang di-nilai ulang tiap render | `select` memakai `value` + `onChange` (controlled), bukan `defaultValue` |
| Stale state antar render | State aktif dipisah dari state pilihan (`activePlotId` vs `selectedPlotId`) |

Pola ini diterapkan di `dashboard.tsx` dan `rotation-engine.tsx`.

### Gaya

Tailwind CSS v4 disetelan lewat `@import "tailwindcss"` di `src/app/globals.css`, diiringi CSS kustom untuk komponen yang butuh aturan spesifik (widget Trakteer, panel samping, footer).

---

## 6. Widget Trakteer

Berkas: `src/components/trakteer-widget.tsx`.

| Aspek | Keputusan |
| --- | --- |
| Sifat | Client Component; state lokal (`isOpen`, `selectedAmount`) |
| Render | `<TrakteerWidget />` disisipkan di `src/app/layout.tsx` |
| Styling | `position: fixed`, kanan bawah, `z-index` di atas konten aplikasi |
| Nominal | Konstanta `TIP_AMOUNTS` (mulai Rp6.000, kelipatan dua) |
| QR | `react-qr-code` — dirender di klien, isi `https://trakteer.id/perpus_opera?amount=<nominal>` |
| Aksesibilitas | `aria-haspopup="dialog"`, `aria-expanded`, panel `role="dialog"`, tombol dengan label yang jelas |
| Keyboard | `Escape` menutup panel |
| Toast | Notifikasi aplikasi dipindahkan ke kanan-**atas** agar tidak tertutup FAB |

### Mengapa bukan script resmi Trakteer?

Script resmi (`trakteer.id/script.min.js`) memerlukan parameter bertanda tangan (`s` untuk id situs, `k` untuk kunci) yang hanya diberikan kepada creator terdaftar. Karena aplikasi ini milik creator, implementasinya dibuat sendiri — tampilannya konsisten, QR dirender di dalam aplikasi, dan pengguna tidak meninggalkan halaman.

### Mengganti halaman donasi

Ubah satu konstanta di `src/components/trakteer-widget.tsx`:

```ts
const TRAKTEER_PAGE = "https://trakteer.id/perpus_opera";
```

---

## 7. Paket Source Code

Berkas: `scripts/build-source-zip.mjs`.

| Aspek | Detail |
| --- | --- |
| Pemicu | `predev` dan `prebuild` di `package.json` |
| Keluaran | `public/terrasiklus-source.zip` (root archive `terrasiklus-source`) |
| Isi | `src/`, `drizzle/`, `scripts/`, `docs/`, seluruh konfigurasi, `README.md`, `LICENSE`, `package.json`, `package-lock.json` |
| Pengecualian | `.env*` (kecuali `.env.example`), `node_modules`, `.next`, `.git`, `public/terrasiklus-source.zip`, log, dan artefak build |
| Pustaka | `archiver` v8 (ESM, `import { ZipArchive } from "archiver"` — **tanpa default export**) |
| Git | Artefak ZIP masuk `.gitignore`; dibuat ulang setiap build |

Akses dari UI: tautan `href="/terrasiklus-source.zip"` dengan atribut `download` di sidebar dan footer.

---

## 8. Deployment

### Vercel

| Item | Nilai |
| --- | --- |
| Build command | `npm run build` |
| Install command | `npm install` |
| Environment variable | `DATABASE_URL` (URL **pooled**), opsional `DATABASE_POOL_MAX` |
| Node runtime | Bawaan Next.js (`nodejs20.x`+) |

### Checklist sebelum produksi

- [ ] `DATABASE_URL` di Vercel memakai host pooled (`-pooler`).
- [ ] Password database Neon sudah dirotasi bila pernah terlihat di log, commit, atau screenshot.
- [ ] `DATABASE_POOL_MAX` disesuaikan dengan batas koneksi paket Neon.
- [ ] `npm run build` berhasil tanpa `.env` lokal.
- [ ] `curl https://<domain>/api/health` mengembalikan `{"status":"ok"}`.
- [ ] `/terrasiklus-source.zip` dapat diunduh (200) dan **tidak** memuat berkas `.env` asli.
- [ ] Autentikasi sudah dipasang; data demo dibersihkan.
- [ ] `npm audit` ditinjau — beberapa advisory tingkat tinggi berasal dari toolchain dev (`drizzle-kit`, `eslint-config-next`) dan tidak memengaruhi runtime produksi.

### appealed

`npm audit fix --force` **tidak** dijalankan: memaksa downgrade `drizzle-kit` ke versi lama dan merusak kompatibilitas Drizzle ORM.

---

## 9. Perintah Pengembangan

```bash
npm run dev          # server pengembangan (+ buat ZIP source code)
npm run build        # build produksi (+ buat ZIP source code)
npm run start        # jalankan hasil build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
npm run db:generate  # buat migrasi baru
npm run db:migrate   # jalankan migrasi
npm run db:push      # sinkronkan skema
npm run db:studio    # Drizzle Studio
```

---

## 10. Trade-off yang Diketahui

| Keputusan | Alasan | Alternatif (kapan perlu) |
| --- | --- | --- |
| Validasi manual di tiap route | Tidak menambah dependensi; pesan galat spesifik berbahasa Indonesia | Zod / Valibot bila jumlah endpoint bertambah banyak |
| JSON tanpa paginasi | Data skala kebun kecil | Cursor pagination bila data tumbuh |
| Tanpa autentikasi | Fokus pada inti agronomi; profil demo menyederhanakan demo | Auth.js / Clerk sebelum akses publik |
| Rotasi berbasis keluarga, bukan tanaman | Cakupan hama & penyakit lebih akurat | Analisis keluarga yang lebih kompleks bila dibutuhkan |
| QR digambar di klien | Tidak perlu endpoint server; instan | QR server-side bila halaman perlu di-crawl bot |

---

**Open Source oleh MZF - 2026** — MIT License.
