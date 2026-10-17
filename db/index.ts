import { drizzle } from "drizzle-orm/netlify-db";
import { getDatabase } from "@netlify/database";
import * as schema from "./schema";

export async function getDb() {
  return drizzle({ client: getDatabase(), schema });
}
