import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { farms, plots, soilTests } from "@/db/schema";
import { ensureStarterData } from "@/lib/bootstrap";

export const dynamic = "force-dynamic";

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      plotId?: unknown;
      testedOn?: unknown;
      ph?: unknown;
      n?: unknown;
      p?: unknown;
      k?: unknown;
      organicMatter?: unknown;
    };
    const plotId = Number(body.plotId);
    const testedOn = typeof body.testedOn === "string" ? body.testedOn : "";
    const ph = Number(body.ph);
    const n = Number(body.n);
    const p = Number(body.p);
    const k = Number(body.k);
    const organicMatter = Number(body.organicMatter);

    if (!Number.isInteger(plotId) || plotId < 1) {
      return Response.json({ error: "Pilih petak terlebih dahulu." }, { status: 400 });
    }
    if (!isValidDate(testedOn)) {
      return Response.json({ error: "Tanggal pemeriksaan belum valid." }, { status: 400 });
    }
    if (!Number.isFinite(ph) || ph < 0 || ph > 14) {
      return Response.json({ error: "pH harus berada di antara 0 dan 14." }, { status: 400 });
    }
    if ([n, p, k].some((value) => !Number.isFinite(value) || value < 0 || value > 1000000)) {
      return Response.json({ error: "Nilai N, P, dan K harus berupa angka positif." }, { status: 400 });
    }
    if (!Number.isFinite(organicMatter) || organicMatter < 0 || organicMatter > 100) {
      return Response.json({ error: "Bahan organik harus berada di antara 0 dan 100%." }, { status: 400 });
    }

    const profile = await ensureStarterData();
    const [plot] = await db
      .select({ id: plots.id })
      .from(plots)
      .innerJoin(farms, eq(plots.farmId, farms.id))
      .where(and(eq(plots.id, plotId), eq(farms.ownerId, profile.id)))
      .limit(1);

    if (!plot) return Response.json({ error: "Petak tidak ditemukan." }, { status: 404 });

    const [soilTest] = await db
      .insert(soilTests)
      .values({ plotId, testedOn, ph, n, p, k, organicMatter })
      .returning();

    return Response.json({ soilTest }, { status: 201 });
  } catch (error) {
    console.error("TerraSiklus soil test error:", error);
    return Response.json({ error: "Hasil uji tanah belum dapat disimpan." }, { status: 500 });
  }
}
