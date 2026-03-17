"use server";

import { createClient } from "@/lib/supabase/server";
import { provisionTenant } from "./provision";
import { redirect } from "next/navigation";
import { signUpSchema } from "@nodelabz/shared-types";
import { verifyInviteToken } from "./invites";
import { prisma } from "@nodelabz/db";

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

  redirect("/dashboard/org");
}

export type InviteSignUpState = {
  error?: string;
  success?: boolean;
};

export async function inviteSignUpAction(
  _prevState: InviteSignUpState,
  formData: FormData
): Promise<InviteSignUpState> {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  if (!token || !password || !name) {
    return { error: "Todos los campos son obligatorios" };
  }

  if (password.length < 8) {
    return { error: "La contrasena debe tener al menos 8 caracteres" };
  }

  // Verify invite token
  let invite;
  try {
    invite = await verifyInviteToken(token);
  } catch {
    return { error: "Invitacion invalida o expirada. Solicita una nueva." };
  }

  // Check tenant still exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: invite.tenantId },
  });
  if (!tenant) {
    return { error: "La empresa ya no existe." };
  }

  // Find the role in this tenant
  const role = await prisma.role.findFirst({
    where: { tenantId: invite.tenantId, name: invite.roleName },
  });
  if (!role) {
    return { error: "El rol asignado ya no existe." };
  }

  // Check if email is already registered in this tenant
  const existingUser = await prisma.user.findFirst({
    where: { tenantId: invite.tenantId, email: invite.email },
  });
  if (existingUser) {
    return { error: "Este email ya tiene una cuenta en esta empresa." };
  }

  // Create Supabase auth user
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: invite.email,
    password,
    options: {
      data: { name, company_name: tenant.name },
    },
  });

  if (authError) {
    if (authError.message.includes("already registered")) {
      return { error: "Este email ya esta registrado. Inicia sesion e informa al admin." };
    }
    return { error: authError.message };
  }

  if (!authData.user) {
    return { error: "Error al crear la cuenta." };
  }

  // Create user in our DB linked to the EXISTING tenant with the ASSIGNED role
  try {
    await prisma.user.create({
      data: {
        tenantId: invite.tenantId,
        supabaseId: authData.user.id,
        email: invite.email,
        name,
        roleId: role.id,
      },
    });
  } catch (err) {
    console.error("Failed to create invited user:", err);
    return { error: "Error al configurar tu cuenta." };
  }

  redirect("/dashboard/org");
}
