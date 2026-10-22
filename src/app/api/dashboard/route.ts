import { desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { crops, farms, plantFamilies, plantings, plots, soilTests } from "@/db/schema";
import { ensureStarterData } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const profile = await ensureStarterData();
    const url = new URL(request.url);
    const requestedFarmId = Number(url.searchParams.get("farmId"));

    const farmRows = await db
      .select()
      .from(farms)
      .where(eq(farms.ownerId, profile.id))
      .orderBy(farms.id);

    const selectedFarm =
      farmRows.find((farm) => farm.id === requestedFarmId) ?? farmRows[0];

    if (!selectedFarm) {
      return Response.json({ error: "Kebun belum tersedia." }, { status: 404 });
    }

    const [cropRows, plotRows] = await Promise.all([
      db
        .select({
          id: crops.id,
          commonName: crops.commonName,
          familyId: plantFamilies.id,
          familyName: plantFamilies.name,
          nutrientDemand: crops.nutrientDemand,
        })
        .from(crops)
        .innerJoin(plantFamilies, eq(crops.familyId, plantFamilies.id))
        .orderBy(crops.commonName),
      db.select().from(plots).where(eq(plots.farmId, selectedFarm.id)).orderBy(plots.id),
    ]);

    const plotIds = plotRows.map((plot) => plot.id);
    const [plantingRows, soilRows] = plotIds.length
      ? await Promise.all([
          db
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
            .where(inArray(plantings.plotId, plotIds))
            .orderBy(desc(plantings.plantedOn), desc(plantings.id)),
          db
            .select()
            .from(soilTests)
            .where(inArray(soilTests.plotId, plotIds))
            .orderBy(desc(soilTests.testedOn), desc(soilTests.id)),
        ])
      : [[], []];

    const plotData = plotRows.map((plot) => ({
      id: plot.id,
      farmId: plot.farmId,
      name: plot.name,
      area: plot.area,
      soilType: plot.soilType,
      plantings: plantingRows.filter((planting) => planting.plotId === plot.id),
      latestSoil: soilRows.find((test) => test.plotId === plot.id) ?? null,
    }));

    return Response.json({
      profile,
      farms: farmRows.map((farm) => ({
        id: farm.id,
        name: farm.name,
        location: farm.location,
        createdAt: farm.createdAt,
      })),
      selectedFarmId: selectedFarm.id,
      plots: plotData,
      crops: cropRows,
    });
  } catch (error) {
    console.error("TerraSiklus dashboard error:", error);
    return Response.json(
      { error: "Data kebun belum dapat dimuat. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}
