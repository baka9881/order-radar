import { inArray, lt } from "drizzle-orm";
import { getDb } from "../../../../db";
import { marketContributions } from "../../../../db/schema";

type Signal = "green" | "yellow" | "red";

type ContributionPayload = {
  receiptId?: string;
  consentVersion?: string;
  observedHour?: string;
  amountBand?: number;
  distanceBand?: number;
  durationBand?: number;
  waitBand?: number;
  signal?: Signal;
  areaLat?: number | null;
  areaLng?: number | null;
};

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONSENT_VERSION = "2026-08-15-v1";
const SIGNALS = new Set<Signal>(["green", "yellow", "red"]);

function validBand(value: unknown, step: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= max && value % step === 0;
}

function validCoordinate(value: unknown, min: number, max: number) {
  if (value === null) return true;
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max && Math.abs(value * 100 - Math.round(value * 100)) < 0.000001;
}

function isHourBucket(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
}

export async function POST(request: Request) {
  let payload: ContributionPayload;
  try {
    payload = (await request.json()) as ContributionPayload;
  } catch {
    return Response.json({ error: "資料格式不正確" }, { status: 400 });
  }

  const receiptId = payload.receiptId?.trim() ?? "";
  const observedHour = payload.observedHour ?? "";
  if (
    !UUID_V4.test(receiptId) ||
    payload.consentVersion !== CONSENT_VERSION ||
    !isHourBucket(observedHour) ||
    !validBand(payload.amountBand, 20, 5000) ||
    !validBand(payload.distanceBand, 2, 200) ||
    !validBand(payload.durationBand, 10, 300) ||
    !validBand(payload.waitBand, 5, 120) ||
    !payload.signal ||
    !SIGNALS.has(payload.signal) ||
    !validCoordinate(payload.areaLat, -90, 90) ||
    !validCoordinate(payload.areaLng, -180, 180) ||
    (payload.areaLat === null) !== (payload.areaLng === null)
  ) {
    return Response.json({ error: "匿名資料格式不正確" }, { status: 400 });
  }

  const expiresAt = new Date();
  expiresAt.setUTCDate(expiresAt.getUTCDate() + 180);
  const db = await getDb();
  await db.delete(marketContributions).where(lt(marketContributions.expiresAt, new Date().toISOString()));
  await db
    .insert(marketContributions)
    .values({
      receiptId,
      consentVersion: payload.consentVersion,
      observedHour,
      amountBand: payload.amountBand!,
      distanceBand: payload.distanceBand!,
      durationBand: payload.durationBand!,
      waitBand: payload.waitBand!,
      signal: payload.signal,
      areaLat: payload.areaLat ?? null,
      areaLng: payload.areaLng ?? null,
      expiresAt: expiresAt.toISOString(),
    })
    .onConflictDoNothing({ target: marketContributions.receiptId });

  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  let payload: { receiptIds?: unknown };
  try {
    payload = (await request.json()) as { receiptIds?: unknown };
  } catch {
    return Response.json({ error: "資料格式不正確" }, { status: 400 });
  }

  if (!Array.isArray(payload.receiptIds) || payload.receiptIds.length > 500) {
    return Response.json({ error: "刪除憑證格式不正確" }, { status: 400 });
  }
  const receiptIds = payload.receiptIds.filter(
    (value): value is string => typeof value === "string" && UUID_V4.test(value),
  );
  if (receiptIds.length !== payload.receiptIds.length) {
    return Response.json({ error: "刪除憑證格式不正確" }, { status: 400 });
  }

  if (receiptIds.length) {
    const db = await getDb();
    await db.delete(marketContributions).where(lt(marketContributions.expiresAt, new Date().toISOString()));
    await db.delete(marketContributions).where(inArray(marketContributions.receiptId, receiptIds));
  }
  return Response.json({ ok: true });
}
