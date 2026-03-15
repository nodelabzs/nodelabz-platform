import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="w-full max-w-2xl space-y-8 rounded-xl bg-white p-8 shadow-sm text-center">
        <h1 className="text-2xl font-bold text-neutral-900">
          Bienvenido a NodeLabz
        </h1>
        <p className="text-neutral-600">
          Tu cuenta esta lista. Conecta tus plataformas para comenzar.
        </p>
        <div className="space-y-4">
          <a
            href="/dashboard"
            className="inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Ir al Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
