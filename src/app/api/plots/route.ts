import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { farms, plots } from "@/db/schema";
import { ensureStarterData } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const db = getDb();
    const body = (await request.json()) as {
      farmId?: unknown;
      name?: unknown;
      area?: unknown;
      soilType?: unknown;
    };
    const farmId = Number(body.farmId);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const area = Number(body.area);
    const soilType = typeof body.soilType === "string" ? body.soilType.trim() : "";

    if (!Number.isInteger(farmId) || farmId < 1) {
      return Response.json({ error: "Pilih kebun yang valid." }, { status: 400 });
    }
    if (name.length < 2 || name.length > 120) {
      return Response.json({ error: "Nama petak harus terdiri dari 2–120 karakter." }, { status: 400 });
    }
    if (!Number.isFinite(area) || area <= 0 || area > 100000) {
      return Response.json({ error: "Luas petak harus lebih besar dari 0 m²." }, { status: 400 });
    }
    if (soilType.length < 2 || soilType.length > 120) {
      return Response.json({ error: "Isi tipe tanah petak terlebih dahulu." }, { status: 400 });
    }

    const profile = await ensureStarterData();
    const [farm] = await db
      .select({ id: farms.id })
      .from(farms)
      .where(and(eq(farms.id, farmId), eq(farms.ownerId, profile.id)))
      .limit(1);

    if (!farm) {
      return Response.json({ error: "Kebun tidak ditemukan." }, { status: 404 });
    }

    const [plot] = await db
      .insert(plots)
      .values({ farmId, name, area, soilType })
      .returning();

    return Response.json({ plot }, { status: 201 });
  } catch (error) {
    console.error("TerraSiklus create plot error:", error);
    return Response.json({ error: "Petak belum dapat dibuat. Coba lagi." }, { status: 500 });
  }
}
