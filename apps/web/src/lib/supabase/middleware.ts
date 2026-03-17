import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Inactivity timeout: 30 minutes (in seconds)
const INACTIVITY_TIMEOUT_SECONDS = 30 * 60;
const LAST_ACTIVITY_COOKIE = "nodelabz-last-activity";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // --- Inactivity timeout check ---
  if (user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const lastActivity = request.cookies.get(LAST_ACTIVITY_COOKIE)?.value;
    const now = Math.floor(Date.now() / 1000);

    if (lastActivity) {
      const elapsed = now - parseInt(lastActivity, 10);
      if (elapsed > INACTIVITY_TIMEOUT_SECONDS) {
        // Session expired due to inactivity — sign out and redirect
        await supabase.auth.signOut();
        const redirectUrl = new URL("/auth/login", request.url);
        redirectUrl.searchParams.set("reason", "inactivity");
        const response = NextResponse.redirect(redirectUrl);
        // Clear the activity cookie
        response.cookies.delete(LAST_ACTIVITY_COOKIE);
        return response;
      }
    }

    // Update last activity timestamp
    supabaseResponse.cookies.set(LAST_ACTIVITY_COOKIE, String(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: INACTIVITY_TIMEOUT_SECONDS,
    });
  }

  // Pass the current pathname as a header so server components can read it
  supabaseResponse.headers.set("x-pathname", request.nextUrl.pathname);

  return supabaseResponse;
}
