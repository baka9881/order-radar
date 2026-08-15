import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { profiles } from "../../../db/schema";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json({ error: "請先登入" }, { status: 401 });
  }

  const db = await getDb();
  await db
    .insert(profiles)
    .values({
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
    })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: {
        email: user.email,
        displayName: user.displayName,
        updatedAt: new Date().toISOString(),
      },
    });

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, user.userId))
    .limit(1);

  return Response.json({
    user: {
      displayName: profile?.displayName ?? user.displayName,
      email: profile?.email ?? user.email,
    },
    plan: profile?.plan ?? "free",
  });
}
