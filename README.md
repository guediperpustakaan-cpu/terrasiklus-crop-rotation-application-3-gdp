# TerraSiklus

TerraSiklus adalah aplikasi pencatat kebun, riwayat tanam, rotasi keluarga tanaman, dan kesehatan tanah. Antarmuka menggunakan Bahasa Indonesia; data disimpan di PostgreSQL melalui Drizzle ORM.

## Menyiapkan Neon PostgreSQL

1. Buat proyek dan basis data PostgreSQL di Neon.
2. Salin connection string dari **Connect** di dashboard Neon. Connection string harus memakai `sslmode=require`.
3. Buat `.env` dari `.env.example`, lalu isi `DATABASE_URL` dengan connection string Neon. Jangan commit file `.env` atau menaruh kredensial di kode.
4. Pasang dependensi dan terapkan skema:

   ```bash
   npm install
   npx drizzle-kit push
   ```

   Alternatifnya, jalankan SQL di `drizzle/0001_terrasiklus.sql` melalui Neon SQL Editor.
5. Jalankan aplikasi dengan `npm run dev`.

## Skema dan migrasi

Skema yang menjadi sumber tipe berada di `src/db/schema.ts`. Berkas `drizzle/0001_terrasiklus.sql` menyediakan SQL PostgreSQL idempoten untuk membuat tabel, foreign key, dan indeks. Drizzle Kit membaca `DATABASE_URL` dari lingkungan melalui `drizzle.config.ts`.

Tabel yang tersedia: `profiles`, `farms`, `plots`, `plant_families`, `crops`, `plantings`, dan `soil_tests`.

## Fitur

- Ringkasan kebun, petak, aktivitas, tanaman aktif, dan kesehatan tanah.
- Pengelolaan beberapa kebun dan petak dengan luas serta jenis tanah.
- Katalog tanaman Indonesia dengan keluarga botani dan kebutuhan hara.
- Riwayat tanggal tanam/panen serta catatan perawatan, hama, dan penyakit.
- Mesin rekomendasi yang menghindari keluarga yang sama dan keluarga yang ditanam dalam dua tahun terakhir; pencatatan dengan keluarga berulang memerlukan konfirmasi.
- Catatan uji pH, nitrogen, fosfor, kalium, dan bahan organik.
- Aksi panen untuk menutup siklus tanam.

Pada basis data baru, API menyiapkan profil demonstrasi `sahabat-tani`, katalog referensi, serta satu contoh kebun beserta tiga petak dan riwayat ilustratif. Semua endpoint aplikasi menggunakan Drizzle ORM. Sebelum membuka aplikasi untuk pengguna nyata, hubungkan autentikasi dan ganti profil demonstrasi tersebut dengan identitas pengguna.
