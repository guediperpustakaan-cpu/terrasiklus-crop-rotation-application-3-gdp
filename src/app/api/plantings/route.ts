import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { crops, farms, plantings, plots } from "@/db/schema";
import { ensureStarterData } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = (await request.json()) as {
      plotId?: unknown;
      cropId?: unknown;
      plantedOn?: unknown;
      harvestedOn?: unknown;
      notes?: unknown;
      confirmRotation?: unknown;
    };
    const plotId = Number(body.plotId);
    const cropId = Number(body.cropId);
    const plantedOn = typeof body.plantedOn === "string" ? body.plantedOn : "";
    const harvestedOn = typeof body.harvestedOn === "string" ? body.harvestedOn : "";
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";

    if (!Number.isInteger(plotId) || plotId < 1 || !Number.isInteger(cropId) || cropId < 1) {
      return Response.json({ error: "Pilih petak dan tanaman yang valid." }, { status: 400 });
    }
    if (!isValidDate(plantedOn)) {
      return Response.json({ error: "Tanggal tanam belum valid." }, { status: 400 });
    }
    if (harvestedOn && (!isValidDate(harvestedOn) || harvestedOn < plantedOn)) {
      return Response.json({ error: "Tanggal panen harus sama atau setelah tanggal tanam." }, { status: 400 });
    }
    if (notes.length > 2000) {
      return Response.json({ error: "Catatan maksimal 2.000 karakter." }, { status: 400 });
    }

    const profile = await ensureStarterData();
    const [[plot], [crop]] = await Promise.all([
      db
        .select({ id: plots.id, name: plots.name })
        .from(plots)
        .innerJoin(farms, eq(plots.farmId, farms.id))
        .where(and(eq(plots.id, plotId), eq(farms.ownerId, profile.id)))
        .limit(1),
      db.select({ id: crops.id, familyId: crops.familyId, commonName: crops.commonName }).from(crops).where(eq(crops.id, cropId)).limit(1),
    ]);

    if (!plot) return Response.json({ error: "Petak tidak ditemukan." }, { status: 404 });
    if (!crop) return Response.json({ error: "Tanaman tidak ditemukan." }, { status: 404 });

    const history = await db
      .select({ familyId: crops.familyId, commonName: crops.commonName, plantedOn: plantings.plantedOn })
      .from(plantings)
      .innerJoin(crops, eq(plantings.cropId, crops.id))
      .where(eq(plantings.plotId, plotId))
      .orderBy(desc(plantings.plantedOn), desc(plantings.id));

    const cutoff = new Date();
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 2);
    const cutoffDate = cutoff.toISOString().slice(0, 10);
    const matchingRecentPlanting = history.find(
      (entry) => entry.familyId === crop.familyId && entry.plantedOn >= cutoffDate,
    );

    if (matchingRecentPlanting && body.confirmRotation !== true) {
      return Response.json(
        {
          rotationWarning: true,
          warning: `Keluarga ${crop.commonName} pernah ditanam di petak ini dalam dua tahun terakhir. Rotasi ke keluarga berbeda membantu memutus siklus hama dan penyakit.`,
          previousCrop: matchingRecentPlanting.commonName,
        },
        { status: 409 },
      );
    }

    const [planting] = await db
      .insert(plantings)
      .values({
        plotId,
        cropId,
        plantedOn,
        harvestedOn: harvestedOn || null,
        notes: notes || null,
      })
      .returning();

    return Response.json({ planting, rotationWarning: Boolean(matchingRecentPlanting) }, { status: 201 });
  } catch (error) {
    console.error("TerraSiklus planting error:", error);
    return Response.json({ error: "Catatan tanam belum dapat disimpan." }, { status: 500 });
  }
}
