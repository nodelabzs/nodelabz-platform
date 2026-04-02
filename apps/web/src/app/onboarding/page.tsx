import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureUserProvisioned } from "@/server/auth/provision";
import { OnboardingWizard } from "./onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Ensure user is provisioned in our DB (creates tenant + roles if new)
  await ensureUserProvisioned({
    supabaseId: user.id,
    email: user.email!,
    name:
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email!.split("@")[0]!,
    companyName: user.user_metadata?.company_name,
    language: "es",
  });

  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Usuario";

  return <OnboardingWizard userName={displayName} />;
}
