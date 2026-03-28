"use server";

import { redirect } from "next/navigation";
import { SessionError, registerWithEmailPassword, signInWithEmailPassword } from "@/lib/auth/session";
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

function readSignUpPayload(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const farmName = String(formData.get("farmName") ?? "").trim();

  if (!email || !password || !name || !farmName) {
    redirectWithMessage("Completa nombre, farm, email y password.");
  }

  if (password.length < 6) {
    redirectWithMessage("El password debe tener al menos 6 caracteres.");
  }

  if (password !== confirmPassword) {
    redirectWithMessage("La confirmacion de password no coincide.");
  }

  return {
    email,
    password,
    profile: {
      name,
      farmName,
    },
  };
}

export async function signIn(formData: FormData) {
  const { email, password } = readCredentials(formData);
  try {
    await signInWithEmailPassword(email, password);
  } catch (error) {
    if (error instanceof SessionError) {
      redirectWithMessage(error.message);
    }

    redirectWithMessage("No se pudo iniciar sesion.");
  }

  redirect("/");
}

export async function signUp(formData: FormData) {
  const { email, password, profile } = readSignUpPayload(formData);
  try {
    await registerWithEmailPassword(email, password, profile);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    console.error("[auth][signUp] Register failed", {
      email,
      isSessionError: error instanceof SessionError,
      status: error instanceof SessionError ? error.status : undefined,
      message,
    });

    if (error instanceof SessionError) {
      redirectWithMessage(error.message);
    }

    if (message.includes("ENETUNREACH")) {
      redirectWithMessage(
        "No se pudo conectar a la base de datos. Configura DATABASE_URL_POOLER con la URL de Pooler de Supabase.",
      );
    }

    redirectWithMessage("No se pudo crear la cuenta.");
  }

  redirectWithMessage("Cuenta creada. Ya puedes iniciar sesion sin confirmar email.");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();

  await supabase.auth.signOut();
  redirectWithMessage("Sesion cerrada.");
}