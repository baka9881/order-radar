import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { orders } from "../../../db/schema";

type Signal = "green" | "yellow" | "red";

type OrderPayload = {
  id?: string;
  createdAt?: string;
  amount?: number;
  distance?: number;
  minutes?: number;
  extraWait?: number;
  returnRisk?: boolean;
  signal?: Signal;
  fullHourly?: number;
  perKm?: number;
};

const SIGNALS = new Set<Signal>(["green", "yellow", "red"]);

function validNumber(value: unknown, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });

  const db = await getDb();
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.userId))
    .orderBy(desc(orders.createdAt))
    .limit(500);

  return Response.json({ orders: rows });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });

  const payload = (await request.json()) as OrderPayload;
  const id = payload.id?.trim() ?? "";
  const createdAt = payload.createdAt ?? "";

  if (
    !id ||
    id.length > 100 ||
    !Number.isFinite(Date.parse(createdAt)) ||
    !validNumber(payload.amount, 0, 100000) ||
    !validNumber(payload.distance, 0, 1000) ||
    !validNumber(payload.minutes, 1, 1440) ||
    !validNumber(payload.extraWait, 0, 1440) ||
    !validNumber(payload.fullHourly, -100000, 100000) ||
    !validNumber(payload.perKm, 0, 100000) ||
    !payload.signal ||
    !SIGNALS.has(payload.signal)
  ) {
    return Response.json({ error: "訂單資料格式不正確" }, { status: 400 });
  }

  const db = await getDb();
  await db
    .insert(orders)
    .values({
      id,
      userId: user.userId,
      createdAt: new Date(createdAt).toISOString(),
      amount: payload.amount!,
      distance: payload.distance!,
      minutes: payload.minutes!,
      extraWait: payload.extraWait!,
      returnRisk: Boolean(payload.returnRisk),
      signal: payload.signal,
      fullHourly: payload.fullHourly!,
      perKm: payload.perKm!,
    })
    .onConflictDoNothing({ target: orders.id });

  return Response.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "請先登入" }, { status: 401 });

  const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
  if (!id) return Response.json({ error: "缺少訂單編號" }, { status: 400 });

  const db = await getDb();
  await db
    .delete(orders)
    .where(and(eq(orders.id, id), eq(orders.userId, user.userId)));

  return Response.json({ ok: true });
}
