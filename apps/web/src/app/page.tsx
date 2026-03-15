import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findUserBySupabaseId } from "@/server/auth/provision";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user has been provisioned
  const dbUser = await findUserBySupabaseId(user.id);
  if (!dbUser) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}
