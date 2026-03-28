import { NextResponse } from "next/server";
import { mapRouteError } from "@/lib/auth/http";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    return NextResponse.json({ message: "Sesion cerrada." });
  } catch (error) {
    return mapRouteError(error);
  }
}
