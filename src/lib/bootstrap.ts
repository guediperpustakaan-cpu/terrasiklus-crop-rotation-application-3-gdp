import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  crops,
  farms,
  plantFamilies,
  plantings,
  plots,
  profiles,
  soilTests,
} from "@/db/schema";

const starterCatalog = [
  { commonName: "Tomat", familyName: "Solanaceae", nutrientDemand: "Tinggi" },
  { commonName: "Cabai", familyName: "Solanaceae", nutrientDemand: "Tinggi" },
  { commonName: "Terong", familyName: "Solanaceae", nutrientDemand: "Tinggi" },
  { commonName: "Kacang panjang", familyName: "Fabaceae", nutrientDemand: "Rendah" },
  { commonName: "Buncis", familyName: "Fabaceae", nutrientDemand: "Rendah" },
  { commonName: "Kacang tanah", familyName: "Fabaceae", nutrientDemand: "Rendah" },
  { commonName: "Mentimun", familyName: "Cucurbitaceae", nutrientDemand: "Tinggi" },
  { commonName: "Labu", familyName: "Cucurbitaceae", nutrientDemand: "Tinggi" },
  { commonName: "Semangka", familyName: "Cucurbitaceae", nutrientDemand: "Tinggi" },
  { commonName: "Bayam", familyName: "Amaranthaceae", nutrientDemand: "Sedang" },
  { commonName: "Selada", familyName: "Asteraceae", nutrientDemand: "Sedang" },
  { commonName: "Wortel", familyName: "Apiaceae", nutrientDemand: "Rendah" },
  { commonName: "Jagung", familyName: "Poaceae", nutrientDemand: "Tinggi" },
  { commonName: "Sawi hijau", familyName: "Brassicaceae", nutrientDemand: "Sedang" },
  { commonName: "Kubis", familyName: "Brassicaceae", nutrientDemand: "Tinggi" },
  { commonName: "Bawang merah", familyName: "Amaryllidaceae", nutrientDemand: "Sedang" },
  { commonName: "Okra", familyName: "Malvaceae", nutrientDemand: "Sedang" },
  { commonName: "Kemangi", familyName: "Lamiaceae", nutrientDemand: "Rendah" },
] as const;

function daysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export async function ensureStarterData() {
  await db
    .insert(profiles)
    .values({ username: "sahabat-tani" })
    .onConflictDoNothing({ target: profiles.username });

  const [profile] = await db
    .select({ id: profiles.id, username: profiles.username })
    .from(profiles)
    .where(eq(profiles.username, "sahabat-tani"))
    .limit(1);

  if (!profile) {
    throw new Error("Profil TerraSiklus tidak dapat disiapkan.");
  }

  const familyNames = [...new Set(starterCatalog.map((crop) => crop.familyName))];
  await db
    .insert(plantFamilies)
    .values(familyNames.map((name) => ({ name })))
    .onConflictDoNothing({ target: plantFamilies.name });

  const familyRows = await db.select().from(plantFamilies);
  const familyIds = new Map(familyRows.map((family) => [family.name, family.id]));

  const cropValues = starterCatalog.map((crop) => {
    const familyId = familyIds.get(crop.familyName);
    if (!familyId) {
      throw new Error(`Keluarga tanaman ${crop.familyName} tidak ditemukan.`);
    }
    return {
      commonName: crop.commonName,
      familyId,
      nutrientDemand: crop.nutrientDemand,
    };
  });

  await db
    .insert(crops)
    .values(cropValues)
    .onConflictDoNothing({ target: crops.commonName });

  const cropRows = await db.select().from(crops);
  const cropIds = new Map(cropRows.map((crop) => [crop.commonName, crop.id]));

  let [farm] = await db
    .select()
    .from(farms)
    .where(eq(farms.ownerId, profile.id))
    .orderBy(farms.id)
    .limit(1);

  if (!farm) {
    [farm] = await db
      .insert(farms)
      .values({
        ownerId: profile.id,
        name: "Kebun Pagi",
        location: "Bandung, Jawa Barat",
      })
      .returning();
  }

  const existingPlots = await db.select().from(plots).where(eq(plots.farmId, farm.id));

  if (existingPlots.length === 0) {
    const seededPlots = await db
      .insert(plots)
      .values([
        { farmId: farm.id, name: "Bedeng Sayur", area: 12, soilType: "Lempung berhumus" },
        { farmId: farm.id, name: "Petak Pangan", area: 9.5, soilType: "Lempung berpasir" },
        { farmId: farm.id, name: "Kebun Sudut", area: 7, soilType: "Humus" },
      ])
      .returning();

    const plotIdByName = new Map(seededPlots.map((plot) => [plot.name, plot.id]));
    const requiredCrops = ["Bayam", "Tomat", "Sawi hijau", "Kacang panjang", "Wortel", "Selada"];
    for (const cropName of requiredCrops) {
      if (!cropIds.has(cropName)) {
        throw new Error(`Tanaman contoh ${cropName} tidak ditemukan.`);
      }
    }

    const bedengSayurId = plotIdByName.get("Bedeng Sayur");
    const petakPanganId = plotIdByName.get("Petak Pangan");
    const kebunSudutId = plotIdByName.get("Kebun Sudut");
    const idForCrop = (name: string) => {
      const id = cropIds.get(name);
      if (!id) throw new Error(`Tanaman ${name} tidak ditemukan.`);
      return id;
    };

    if (!bedengSayurId || !petakPanganId || !kebunSudutId) {
      throw new Error("Petak contoh tidak berhasil dibuat.");
    }

    await db.insert(plantings).values([
      {
        plotId: bedengSayurId,
        cropId: idForCrop("Bayam"),
        plantedOn: daysAgo(145),
        harvestedOn: daysAgo(98),
        notes: "Panen terakhir sehat, sisa daun dibenamkan sebagai kompos.",
      },
      {
        plotId: bedengSayurId,
        cropId: idForCrop("Tomat"),
        plantedOn: daysAgo(62),
        notes: "Pertumbuhan baik; cek kelembapan setiap pagi.",
      },
      {
        plotId: petakPanganId,
        cropId: idForCrop("Sawi hijau"),
        plantedOn: daysAgo(180),
        harvestedOn: daysAgo(135),
        notes: "Tidak ditemukan serangan hama berarti.",
      },
      {
        plotId: petakPanganId,
        cropId: idForCrop("Kacang panjang"),
        plantedOn: daysAgo(88),
        notes: "Bunga mulai muncul, tanaman tampak sehat.",
      },
      {
        plotId: kebunSudutId,
        cropId: idForCrop("Wortel"),
        plantedOn: daysAgo(110),
        harvestedOn: daysAgo(52),
        notes: "Panen umbi berukuran merata.",
      },
      {
        plotId: kebunSudutId,
        cropId: idForCrop("Selada"),
        plantedOn: daysAgo(32),
        notes: "Daun muda mulai rapat; siram secukupnya.",
      },
    ]);

    await db.insert(soilTests).values([
      { plotId: bedengSayurId, testedOn: daysAgo(6), ph: 6.4, n: 42, p: 28, k: 138, organicMatter: 4.8 },
      { plotId: petakPanganId, testedOn: daysAgo(14), ph: 6.1, n: 35, p: 31, k: 116, organicMatter: 4.2 },
      { plotId: kebunSudutId, testedOn: daysAgo(11), ph: 6.7, n: 38, p: 25, k: 124, organicMatter: 5.1 },
    ]);
  }

  return profile;
}

export { starterCatalog };
