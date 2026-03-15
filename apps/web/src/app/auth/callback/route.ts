import { createClient } from "@/lib/supabase/server";
import { ensureUserProvisioned } from "@/server/auth/provision";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the authenticated user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Ensure user is provisioned in our DB
        const { isNew } = await ensureUserProvisioned({
          supabaseId: user.id,
          email: user.email!,
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email!.split("@")[0]!,
          companyName: user.user_metadata?.company_name,
          language: "es",
        });

        // New users go to onboarding, existing users go to dashboard
        const destination = isNew ? "/onboarding" : "/dashboard";
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
}
