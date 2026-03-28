"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithMessage(message: string) {
  const query = new URLSearchParams({ message }).toString();
  redirect(`/auth?${query}`);
}

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    redirectWithMessage("Completa email y password.");
  }

  return { email, password };
}

export async function signIn(formData: FormData) {
  const { email, password } = readCredentials(formData);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithMessage(error.message);
  }

  redirect("/");
}

export async function signUp(formData: FormData) {
  const { email, password } = readCredentials(formData);
  const supabase = await createSupabaseServerClient();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) {
    redirectWithMessage(error.message);
  }

  redirectWithMessage("Cuenta creada. Revisa tu email para confirmar la cuenta.");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
  redirectWithMessage("Sesion cerrada.");
}