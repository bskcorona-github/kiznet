import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const connectionString = process.env.NEON_DATABASE_URL;
if (!connectionString) {
  // eslint-disable-next-line no-console
  console.warn("NEON_DATABASE_URL is not set. Database operations will fail until configured.");
}

const sql = neon(connectionString ?? "");
export const db = drizzle(sql);


