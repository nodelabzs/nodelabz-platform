import { createClient } from "@/lib/supabase/server";
import { findUserBySupabaseId } from "@/server/auth/provision";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const dbUser = await findUserBySupabaseId(user.id);
  if (!dbUser) {
    return new Response("User not found", { status: 404 });
  }

  const body = await req.json();
  const { message, conversationId, section, mcpServers, plan, history } = body;

  if (!message || typeof message !== "string" || message.length > 4000) {
    return new Response("Invalid message", { status: 400 });
  }

  // Forward to AI service with tenant context
  try {
    const aiResponse = await fetch(`${AI_SERVICE_URL}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Platform-Key": process.env.AI_SERVICE_KEY || "",
      },
      body: JSON.stringify({
        tenant_id: dbUser.tenant.id,
        user_id: dbUser.id,
        message,
        conversation_id: conversationId || null,
        section: section || "dashboard",
        mcp_servers: mcpServers || [],
        plan: plan || dbUser.tenant.plan,
        language: dbUser.tenant.language || "es",
        history: history || [],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI service error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Pipe SSE stream from AI service to client
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const reader = aiResponse.body?.getReader();
    if (!reader) {
      return new Response("No stream from AI service", { status: 502 });
    }

    // Pipe in background
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch {
        // Client disconnected or stream error
      } finally {
        await writer.close().catch(() => {});
      }
    })();

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Failed to connect to AI service:", err);
    return new Response(
      JSON.stringify({ error: "Cannot reach AI service" }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
