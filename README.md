# TerraSiklus

TerraSiklus adalah aplikasi pencatat kebun, riwayat tanam, rotasi keluarga tanaman, dan kesehatan tanah. Antarmuka menggunakan Bahasa Indonesia; data disimpan di PostgreSQL melalui Drizzle ORM.

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env    # isi DATABASE_URL
npm run dev
```

Aplikasi tersedia di `http://localhost:3000`.

## Menyiapkan Neon PostgreSQL

1. Buat proyek dan basis data PostgreSQL di Neon.
2. Salin connection string dari **Connect** di dashboard Neon.
   - Untuk aplikasi yang berjalan di Vercel/serverless, pakai URL **pooled** (host berakhiran `-pooler`) supaya `pg` tidak membuka koneksi baru untuk tiap request.
   - URL direct (tanpa `-pooler`) tetap dipakai untuk Neon SQL Editor dan `psql` lokal.
   - Pastikan `sslmode=require` ada di connection string.
3. Buat `.env` dari `.env.example`, lalu isi `DATABASE_URL` dengan connection string Neon. Jangan pernah commit `.env` atau menaruh kredensial di dalam kode.
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

## Skema basis data

Sumber tipe Drizzle berada di `src/db/schema.ts`.

| Tabel | Isi |
| --- | --- |
| `profiles` | Profil pengguna (`username` unik) |
| `farms` | Kebun milik satu profil |
| `plots` | Petak/bedeng di dalam kebun |
| `plant_families` | Keluarga botani tanaman |
| `crops` | Katalog tanaman + kebutuhan hara |
| `plantings` | Satu siklus tanam pada satu petak |
| `soil_tests` | Hasil uji tanah per petak |

Berkas penting:

- `drizzle/schema.sql` — SQL idempoten untuk Neon SQL Editor.
- `drizzle/seed.sql` — SQL idempoten data contoh.
- `drizzle/migrations/` — migrasi yang dikelola Drizzle Kit (`npm run db:migrate`).

## Deploy ke Vercel

1. Push kode ke repositori Git, lalu hubungkan repositori tersebut di Vercel (**Add New → Project**). Framework terdeteksi otomatis sebagai Next.js.
2. Tambahkan environment variable:
   - **Key:** `DATABASE_URL`
   - **Value:** connection string Neon **pooled** (host berakhiran `-pooler`).
   - Opsional: `DATABASE_POOL_MAX` (disarankan `5` untuk serverless).
3. **Environment:** pilih `Production` dan `Preview`.
4. Deploy. Vercel menjalankan `npm run build` lalu `npm run start` secara otomatis.
5. Smoke test setelah deploy:

   ```bash
   curl https://<domain-anda>.vercel.app/api/health
   ```

### Catatan serverless

- `pg` sudah termasuk daftar `serverExternalPackages` bawaan Next.js, jadi tidak perlu konfigurasi `serverExternalPackages` di `next.config.ts`.
- Pool koneksi dibuat secara lazy di `src/db/index.ts` dan di-cache pada `globalThis`, sehingga tidak membuat koneksi saat build. Listener `pool.on("error")` mencegah crash pada koneksi yang terputus.
- `DATABASE_POOL_MAX` membatasi jumlah koneksi agar tidak melampaui batas Neon pada paket Anda.

### Mengganti data contoh

Aplikasi menyiapkan profil demonstrasi `sahabat-tani` beserta satu kebun, tiga petak, dan riwayat tanam ilustratif. Sebelum aplikasi dibuka untuk pengguna nyata, hubungkan autentikasi dan ganti `DEMO_USERNAME` di `src/lib/bootstrap.ts` dengan identitas pengguna sebenarnya.

## Perintah yang tersedia

| Perintah | Kegunaan |
| --- | --- |
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm run start` | Menjalankan build produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run db:generate` | Membuat migrasi baru dari `src/db/schema.ts` |
| `npm run db:migrate` | Menjalankan migrasi yang belum diterapkan |
| `npm run db:push` | Sinkronkan skema langsung ke basis data |
| `npm run db:studio` | Drizzle Studio (antarmuka web) |

## Fitur

- Ringkasan kebun, petak, aktivitas, tanaman aktif, dan kesehatan tanah.
- Pengelolaan beberapa kebun dan petak dengan luas serta jenis tanah.
- Katalog tanaman Indonesia dengan keluarga botani dan kebutuhan hara.
- Riwayat tanggal tanam/panen serta catatan perawatan, hama, dan penyakit.
- Mesin rekomendasi yang menghindari keluarga yang sama dan keluarga yang ditanam dalam dua tahun terakhir; pencatatan dengan keluarga berulang memerlukan konfirmasi.
- Catatan uji pH, nitrogen, fosfor, kalium, dan bahan organik.
- Aksi panen untuk menutup siklus tanam.

Semua endpoint aplikasi menggunakan Drizzle ORM.
