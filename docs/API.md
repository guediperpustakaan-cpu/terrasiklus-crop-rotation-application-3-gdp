# Referensi API — TerraSiklus

Seluruh endpoint memakai Drizzle ORM dan mengembalikan JSON.
Base URL lokal: `http://localhost:3000`.

> Belum ada autentikasi pada versi ini. Seluruh request implicitly memakai profil demo (`sahabat-tani`) yang disiapkan oleh `ensureStarterData()`. Lihat bagian "Menjadikan produksi" di `ARSITEKTUR.md` sebelum aplikasi dibuka untuk publik.

---

## Konvensi umum

| Status | Arti |
| --- | --- |
| `200` | Berhasil |
| `201` | Data baru berhasil dibuat |
| `400` | Masukan tidak valid |
| `404` | Data tidak ditemukan (atau bukan milik profil aktif) |
| `409` | Konflik aturan domain — contoh: rotasi keluarga berulang |
| `500` | Kesalahan server (detail dicatat di log server) |

Bentuk pesan galat:

```json
{ "error": "Pesan yang bisa dibaca pengguna." }
```

Bentuk peringatan rotasi (`409`):

```json
{
  "rotationWarning": true,
  "warning": "Keluarga Tomat pernah ditanam di petak ini dalam dua tahun terakhir. ...",
  "previousCrop": "Tomat"
}
```

---

## `GET /api/health`

Memeriksa koneksi ke PostgreSQL. Dipakai sebagai smoke test setelah deploy.

**Respons `200`**

```json
{ "status": "ok", "database": "connected" }
```

**Respons `500`** bila database tidak dapat dijangkau:

```json
{ "status": "error", "database": "unreachable", "error": "..." }
```

---

## `GET /api/dashboard`

Ringkasan lengkap kebun untuk halaman utama.

**Query parameter**

| Parameter | Tipe | Keterangan |
| --- | --- | --- |
| `farmId` | number (opsional) | Memilih kebun aktif. Jika kosong, memakai kebun pertama. |

**Respons `200`**

```jsonc
{
  "profile": { "id": 1, "username": "sahabat-tani" },
  "farms": [
    { "id": 1, "name": "Kebun Pagi", "location": "Bandung, Jawa Barat", "createdAt": "2026-10-22T03:30:11.767Z" }
  ],
  "selectedFarmId": 1,
  "plots": [
    {
      "id": 1,
      "farmId": 1,
      "name": "Bedeng Sayur",
      "area": 12,
      "soilType": "Lempung berhumus",
      "plantings": [
        {
          "id": 2,
          "plotId": 1,
          "cropId": 1,
          "commonName": "Tomat",
          "familyId": 1,
          "familyName": "Solanaceae",
          "nutrientDemand": "Tinggi",
          "plantedOn": "2026-08-21",
          "harvestedOn": null,
          "notes": "Pertumbuhan baik; cek kelembapan setiap pagi."
        }
      ],
      "latestSoil": {
        "id": 1,
        "plotId": 1,
        "testedOn": "2026-10-16",
        "ph": 6.4,
        "n": 42,
        "p": 28,
        "k": 138,
        "organicMatter": 4.8
      }
    }
  ],
  "crops": [
    { "id": 1, "commonName": "Tomat", "familyId": 1, "familyName": "Solanaceae", "nutrientDemand": "Tinggi" }
  ]
}
```

---

## `GET /api/farms`

Mengembalikan seluruh kebun milik profil aktif.

**Respons `200`**

```json
[
  { "id": 1, "name": "Kebun Pagi", "location": "Bandung, Jawa Barat", "createdAt": "2026-10-22T03:30:11.767Z" }
]
```

---

## `POST /api/farms`

Membuat kebun baru.

**Body**

| Field | Tipe | Wajib | Validasi |
| --- | --- | --- | --- |
| `name` | string | ya | 2–160 karakter |
| `location` | string | tidak | Maksimal 200 karakter |

**Contoh**

```bash
curl -X POST http://localhost:3000/api/farms \
  -H "Content-Type: application/json" \
  -d '{"name":"Kebun Pagi","location":"Bandung, Jawa Barat"}'
```

**Respons `201`**

```json
{ "farm": { "id": 2, "name": "Kebun Pagi", "location": "Bandung, Jawa Barat", "createdAt": "..." } }
```

---

## `POST /api/plots`

Menambahkan petak ke sebuah kebun.

**Body**

| Field | Tipe | Wajib | Validasi |
| --- | --- | --- | --- |
| `farmId` | number | ya | Kebun milik profil aktif |
| `name` | string | ya | 2–120 karakter |
| `area` | number | ya | > 0 dan ≤ 100.000 (m²) |
| `soilType` | string | ya | 2–120 karakter |

**Respons `201`**

```json
{ "plot": { "id": 4, "farmId": 1, "name": "Petak Uji", "area": 5, "soilType": "Lat" } }
```

---

## `GET /api/rotation`

Menghitung rekomendasi tanaman untuk satu petak.

**Query parameter**

| Parameter | Tipe | Wajib |
| --- | --- | --- |
| `plotId` | number | ya |

**Respons `200`**

```jsonc
{
  "plot": { "id": 1, "name": "Bedeng Sayur" },
  "lastPlanting": {
    "id": 2, "plotId": 1, "cropId": 1,
    "commonName": "Tomat", "familyId": 1, "familyName": "Solanaceae",
    "nutrientDemand": "Tinggi",
    "plantedOn": "2026-08-21", "harvestedOn": null, "notes": "..."
  },
  "recommendedCrops": [
    { "id": 5, "commonName": "Buncis", "familyId": 2, "familyName": "Fabaceae", "nutrientDemand": "Rendah" }
  ],
  "reason": "Musim terakhir diisi Tomat dari keluarga Solanaceae. Pilih keluarga berbeda agar siklus hama dan penyakit terputus; ...",
  "recentlyUsedFamilies": ["Solanaceae", "Amaranthaceae"]
}
```

### Aturan rekomendasi

1. Semua keluarga tanaman yang dipakai dalam **2 tahun terakhir** di petak itu diblokir.
2. Keluarga dari **tanaman terakhir** juga diblokir (meski sudah lebih dari 2 tahun).
3. Semua tanaman diurutkan berdasarkan kebutuhan hara — urutan awal bergantung pada hara tanaman terakhir:
   - terakhir `Tinggi` → Rendah, Sedang, Tinggi
   - terakhir `Rendah` → Sedang, Tinggi, Rendah
   - terakhir `Sedang` / belum ada → Rendah, Sedang, Tinggi
4. Maksimal 6 tanaman direkomendasikan; pengurutan sekunder memakai nama tanaman (locale `id`).

---

## `POST /api/plantings`

Mencatat satu siklus tanam.

**Body**

| Field | Tipe | Wajib | Validasi |
| --- | --- | --- | --- |
| `plotId` | number | ya | Petak milik profil aktif |
| `cropId` | number | ya | Tanaman dari katalog |
| `plantedOn` | string | ya | Format `YYYY-MM-DD` |
| `harvestedOn` | string | tidak | `YYYY-MM-DD`, ≥ `plantedOn` |
| `notes` | string | tidak | Maksimal 2.000 karakter |
| `confirmRotation` | boolean | tidak | Wajib `true` bila keluarga dipakai ulang dalam 2 tahun |

**Contoh**

```bash
curl -X POST http://localhost:3000/api/plantings \
  -H "Content-Type: application/json" \
  -d '{"plotId":1,"cropId":1,"plantedOn":"2026-10-01","notes":"uji","confirmRotation":false}'
```

**Respons `201`**

```json
{ "planting": { "id": 7, "plotId": 1, "cropId": 1, "plantedOn": "2026-10-01", "harvestedOn": null, "notes": "uji" }, "rotationWarning": true }
```

**Respons `409`** bila keluarga tanaman pernah ditanam di petak itu dalam 2 tahun terakhir dan `confirmRotation` bukan `true`.

---

## `POST /api/plantings/harvest`

Menutup siklus tanam dengan mencatat tanggal panen.

**Body**

| Field | Tipe | Wajib | Validasi |
| --- | --- | --- | --- |
| `plantingId` | number | ya | Tanaman milik profil aktif |
| `harvestedOn` | string | ya | Format `YYYY-MM-DD` |

**Respons `200`**

```json
{ "planting": { "id": 7, "plotId": 1, "cropId": 1, "plantedOn": "2026-10-01", "harvestedOn": "2026-10-20", "notes": "..." } }
```

---

## `POST /api/soil-tests`

Menyimpan hasil uji tanah untuk satu petak.

**Body**

| Field | Tipe | Wajib | Validasi |
| --- | --- | --- | --- |
| `plotId` | number | ya | Petak milik profil aktif |
| `testedOn` | string | ya | Format `YYYY-MM-DD` |
| `ph` | number | ya | 0–14 |
| `n` | number | ya | 0–1.000.000 (mg/kg) |
| `p` | number | ya | 0–1.000.000 (mg/kg) |
| `k` | number | ya | 0–1.000.000 (mg/kg) |
| `organicMatter` | number | ya | 0–100 (persen) |

**Respons `201`**

```json
{ "soilTest": { "id": 4, "plotId": 1, "testedOn": "2026-10-15", "ph": 6.2, "n": 40, "p": 30, "k": 120, "organicMatter": 4.5 } }
```

---

## Ringkasan cepat

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/api/health` | Health check + status koneksi |
| `GET` | `/api/dashboard` | Ringkasan kebun (opsional `?farmId=`) |
| `GET` | `/api/farms` | Daftar kebun |
| `POST` | `/api/farms` | Buat kebun |
| `POST` | `/api/plots` | Buat petak |
| `GET` | `/api/rotation?plotId=` | Rekomendasi rotasi |
| `POST` | `/api/plantings` | Catat tanam |
| `POST` | `/api/plantings/harvest` | Catat panen |
| `POST` | `/api/soil-tests` | Catat uji tanah |

---

**Open Source oleh MZF - 2026** — MIT License.
