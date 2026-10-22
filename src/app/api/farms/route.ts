import { eq } from "drizzle-orm";
import { db } from "@/db";
import { farms } from "@/db/schema";
import { ensureStarterData } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown; location?: unknown };
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const location = typeof body.location === "string" ? body.location.trim() : "";

    if (name.length < 2 || name.length > 160) {
      return Response.json({ error: "Nama kebun harus terdiri dari 2–160 karakter." }, { status: 400 });
    }

    const profile = await ensureStarterData();
    const [farm] = await db
      .insert(farms)
      .values({ ownerId: profile.id, name, location: location || null })
      .returning({ id: farms.id, name: farms.name, location: farms.location });

    return Response.json({ farm }, { status: 201 });
  } catch (error) {
    console.error("TerraSiklus create farm error:", error);
    return Response.json({ error: "Kebun belum dapat dibuat. Coba lagi." }, { status: 500 });
  }
}

export async function GET() {
  try {
    const profile = await ensureStarterData();
    const rows = await db
      .select({ id: farms.id, name: farms.name, location: farms.location })
      .from(farms)
      .where(eq(farms.ownerId, profile.id))
      .orderBy(farms.id);
    return Response.json({ farms: rows });
  } catch (error) {
    console.error("TerraSiklus farms error:", error);
    return Response.json({ error: "Daftar kebun belum dapat dimuat." }, { status: 500 });
  }
}
