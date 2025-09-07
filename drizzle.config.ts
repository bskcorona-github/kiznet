import type { Config } from "drizzle-kit";
import "dotenv/config";

export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { 
    url: process.env.NEON_DATABASE_URL! 
  },
} satisfies Config;
