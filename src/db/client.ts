/**
 * Database client — connects to Neon Postgres via serverless driver.
 *
 * Usage:
 *   import { db } from "@/db/client";
 *   const rows = await db.select().from(users);
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local and fill in your Neon connection string."
  );
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
