import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { farms, plantings, plots } from "@/db/schema";
import { ensureStarterData } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { plantingId?: unknown; harvestedOn?: unknown };
    const plantingId = Number(body.plantingId);
    const harvestedOn = typeof body.harvestedOn === "string" ? body.harvestedOn : "";

    if (!Number.isInteger(plantingId) || plantingId < 1 || !isValidDate(harvestedOn)) {
      return Response.json({ error: "Pilih catatan tanam dan tanggal panen yang valid." }, { status: 400 });
    }

    const profile = await ensureStarterData();
    const [entry] = await db
      .select({ id: plantings.id, plantedOn: plantings.plantedOn, harvestedOn: plantings.harvestedOn })
      .from(plantings)
      .innerJoin(plots, eq(plantings.plotId, plots.id))
      .innerJoin(farms, eq(plots.farmId, farms.id))
      .where(and(eq(plantings.id, plantingId), eq(farms.ownerId, profile.id)))
      .limit(1);

    if (!entry) return Response.json({ error: "Catatan tanam tidak ditemukan." }, { status: 404 });
    if (harvestedOn < entry.plantedOn) {
      return Response.json({ error: "Tanggal panen tidak boleh sebelum tanggal tanam." }, { status: 400 });
    }

    const [updated] = await db
      .update(plantings)
      .set({ harvestedOn })
      .where(eq(plantings.id, plantingId))
      .returning();

    return Response.json({ planting: updated });
  } catch (error) {
    console.error("TerraSiklus harvest error:", error);
    return Response.json({ error: "Catatan panen belum dapat diperbarui." }, { status: 500 });
  }
}
