import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { crops, farms, plantFamilies, plantings, plots } from "@/db/schema";
import { ensureStarterData } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const db = getDb();
    const profile = await ensureStarterData();
    const plotId = Number(new URL(request.url).searchParams.get("plotId"));

    if (!Number.isInteger(plotId) || plotId < 1) {
      return Response.json({ error: "Pilih petak untuk melihat rekomendasi." }, { status: 400 });
    }

    const [plot] = await db
      .select({ id: plots.id, name: plots.name })
      .from(plots)
      .innerJoin(farms, eq(plots.farmId, farms.id))
      .where(and(eq(plots.id, plotId), eq(farms.ownerId, profile.id)))
      .limit(1);

    if (!plot) {
      return Response.json({ error: "Petak tidak ditemukan." }, { status: 404 });
    }

    const history = await db
      .select({
        id: plantings.id,
        plotId: plantings.plotId,
        cropId: crops.id,
        commonName: crops.commonName,
        familyId: plantFamilies.id,
        familyName: plantFamilies.name,
        nutrientDemand: crops.nutrientDemand,
        plantedOn: plantings.plantedOn,
        harvestedOn: plantings.harvestedOn,
        notes: plantings.notes,
      })
      .from(plantings)
      .innerJoin(crops, eq(plantings.cropId, crops.id))
      .innerJoin(plantFamilies, eq(crops.familyId, plantFamilies.id))
      .where(eq(plantings.plotId, plotId))
      .orderBy(desc(plantings.plantedOn), desc(plantings.id));

    const cutoff = new Date();
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 2);
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    const recentPlantings = history.filter((planting) => planting.plantedOn >= cutoffDate);
    const lastPlanting = history[0] ?? null;
    const blockedFamilyIds = new Set(recentPlantings.map((planting) => planting.familyId));
    if (lastPlanting) blockedFamilyIds.add(lastPlanting.familyId);

    const allCrops = await db
      .select({
        id: crops.id,
        commonName: crops.commonName,
        familyId: plantFamilies.id,
        familyName: plantFamilies.name,
        nutrientDemand: crops.nutrientDemand,
      })
      .from(crops)
      .innerJoin(plantFamilies, eq(crops.familyId, plantFamilies.id));

    const demandOrder =
      lastPlanting?.nutrientDemand === "Tinggi"
        ? ["Rendah", "Sedang", "Tinggi"]
        : lastPlanting?.nutrientDemand === "Rendah"
          ? ["Sedang", "Tinggi", "Rendah"]
          : ["Rendah", "Sedang", "Tinggi"];

    const recommendedCrops = allCrops
      .filter((crop) => !blockedFamilyIds.has(crop.familyId))
      .sort((a, b) => {
        const demandDifference = demandOrder.indexOf(a.nutrientDemand) - demandOrder.indexOf(b.nutrientDemand);
        return demandDifference || a.commonName.localeCompare(b.commonName, "id");
      })
      .slice(0, 6);

    const reason = lastPlanting
      ? `Musim terakhir diisi ${lastPlanting.commonName} dari keluarga ${lastPlanting.familyName}. Pilih keluarga berbeda agar siklus hama dan penyakit terputus; tanaman dengan kebutuhan hara lebih ringan juga membantu memulihkan tanah.`
      : "Petak ini belum memiliki riwayat tanam. Memulai dengan keluarga yang beragam membantu menjaga keseimbangan hara dan menekan risiko hama.";

    return Response.json({
      plot,
      lastPlanting,
      recommendedCrops,
      reason,
      recentlyUsedFamilies: [...new Set(recentPlantings.map((planting) => planting.familyName))],
    });
  } catch (error) {
    console.error("TerraSiklus rotation error:", error);
    return Response.json({ error: "Rekomendasi rotasi belum dapat dihitung." }, { status: 500 });
  }
}
