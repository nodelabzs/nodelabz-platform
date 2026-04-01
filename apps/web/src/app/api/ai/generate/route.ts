import { createClient } from "@/lib/supabase/server";
import { findUserBySupabaseId } from "@/server/auth/provision";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await findUserBySupabaseId(user.id);
  if (!dbUser) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  const body = await req.json();
  const { type, platform, context, language, tone } = body;

  if (!type || !context) {
    return Response.json({ error: "type and context are required" }, { status: 400 });
  }

  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/generate/copy`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Platform-Key": process.env.AI_SERVICE_KEY || "",
      },
      body: JSON.stringify({
        tenant_id: dbUser.tenant.id,
        type,
        platform: platform || null,
        context,
        language: language || "es",
        tone: tone || "professional",
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return Response.json(
        { error: `AI service error: ${errorText}` },
        { status: aiResponse.status }
      );
    }

    const data = await aiResponse.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: `Failed to connect to AI service: ${String(error)}` },
      { status: 502 }
    );
  }
}
