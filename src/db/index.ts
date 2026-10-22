import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __terraSiklusPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__terraSiklusPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
    max: process.env.NODE_ENV === "production" ? 5 : 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__terraSiklusPostgresqlPool = pool;
}

export const db = drizzle(pool, { schema });
