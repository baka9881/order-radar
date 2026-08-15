import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { feedback } from "../../../db/schema";

const CATEGORIES = new Set(["feature", "problem", "pro_interest"]);

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  const payload = (await request.json()) as {
    email?: string;
    category?: string;
    message?: string;
    website?: string;
  };

  if (payload.website) return Response.json({ ok: true }, { status: 201 });

  const email = user?.email ?? payload.email?.trim() ?? "";
  const category = payload.category?.trim() ?? "feature";
  const message = payload.message?.trim() ?? "";

  if (!user && !/^\S+@\S+\.\S+$/.test(email)) {
    return Response.json({ error: "請留下可聯絡的 Email" }, { status: 400 });
  }
  if (!CATEGORIES.has(category) || message.length < 5 || message.length > 1500) {
    return Response.json({ error: "請輸入 5～1500 字的內容" }, { status: 400 });
  }

  const db = await getDb();
  await db.insert(feedback).values({
    id: crypto.randomUUID(),
    userId: user?.userId ?? null,
    email: email || null,
    category: category as "feature" | "problem" | "pro_interest",
    message,
  });

  return Response.json({ ok: true }, { status: 201 });
}
