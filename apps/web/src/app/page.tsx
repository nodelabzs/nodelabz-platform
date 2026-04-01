import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { findUserBySupabaseId } from "@/server/auth/provision";

export default async function Home() {
  try {
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

    redirect("/dashboard/org");
  } catch (error: unknown) {
    // Re-throw redirect errors (Next.js uses errors for redirects)
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    // On DB connection failure, redirect to login
    redirect("/auth/login");
  }
}
