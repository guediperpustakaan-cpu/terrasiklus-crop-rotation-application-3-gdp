import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type TerraSiklusDatabase = NodePgDatabase<typeof schema>;

const globalForDb = globalThis as typeof globalThis & {
  __terraSiklusPool?: Pool;
  __terraSiklusDb?: TerraSiklusDatabase;
};

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL belum diatur. Isi connection string Neon pada variabel lingkungan sebelum memakai API.",
    );
  }

  const pool = new Pool({
    connectionString,
    max: Number(
      process.env.DATABASE_POOL_MAX ??
        (process.env.NODE_ENV === "production" ? 5 : 10),
    ),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });

  // Pool memancarkan event "error" ketika koneksi idle diputus server atau pooler.
  // Tanpa listener, Node melempar error tak tertangani dan proses ikut berhenti.
  pool.on("error", (error) => {
    console.error("TerraSiklus: koneksi PostgreSQL bermasalah:", error);
  });

  return pool;
}

export function getPool(): Pool {
  if (!globalForDb.__terraSiklusPool) {
    globalForDb.__terraSiklusPool = createPool();
  }

  return globalForDb.__terraSiklusPool;
}

export function getDb(): TerraSiklusDatabase {
  if (!globalForDb.__terraSiklusDb) {
    globalForDb.__terraSiklusDb = drizzle(getPool(), { schema });
  }

  return globalForDb.__terraSiklusDb;
}
