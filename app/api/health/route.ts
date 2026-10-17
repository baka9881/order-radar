import { getDatabase } from "@netlify/database";

export const dynamic = "force-dynamic";

export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const db = getDatabase();
    await db.sql`SELECT 1`;
    return Response.json({ ok: true, database: "ready" }, { headers });
  } catch {
    return Response.json({ ok: false, database: "unavailable" }, { status: 503, headers });
  }
}
