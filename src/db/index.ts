import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
}

// postgres-js works with both local Postgres (docker compose) and Neon.
// In production, point DATABASE_URL at Neon's pooled connection string.
const client = postgres(connectionString);

export const db = drizzle(client, { schema });
