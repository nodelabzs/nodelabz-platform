"use server";

import { createClient } from "@/lib/supabase/server";
import { provisionTenant } from "./provision";
import { redirect } from "next/navigation";
import { signUpSchema } from "@nodelabz/shared-types";

export type SignUpState = {
  error?: string;
  success?: boolean;
};

export async function signUpAction(
  _prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    name: formData.get("name") as string,
    companyName: formData.get("companyName") as string,
    language: (formData.get("language") as string) || "es",
  };

  // Validate input
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Datos inválidos" };
  }

  const { email, password, name, companyName, language } = parsed.data;

  // Create Supabase auth user
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, company_name: companyName },
    },
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      return { error: "Este email ya está registrado. Inicia sesión." };
    }
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Error al crear la cuenta. Intenta de nuevo." };
  }

  // Provision tenant + roles + user in our DB
  try {
    await provisionTenant({
      supabaseId: authData.user.id,
      email,
      name,
      companyName,
      language,
    });
  } catch (err) {
    console.error("Provisioning failed:", err);
    return { error: "Error al configurar tu cuenta. Contacta soporte." };
  }

  redirect("/dashboard");
}
