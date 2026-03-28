import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServerEnv, hasSupabaseServerEnv } from "@/lib/supabase/config";
import type { Database } from "@/types/database";

const PUBLIC_API_PATHS = new Set(["/api/auth/register", "/api/auth/login"]);

function isPublicPage(pathname: string) {
  return pathname === "/" || pathname.startsWith("/auth") || pathname.startsWith("/login");
}

function isApiPath(pathname: string) {
  return pathname.startsWith("/api/");
}

function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
}

function isAdminRole(role: unknown) {
  return typeof role === "string" && role.toUpperCase() === "ADMIN";
}

function toAuthRedirect(request: NextRequest, message: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth";
  url.search = "";
  url.searchParams.set("message", message);
  return NextResponse.redirect(url);
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  if (!hasSupabaseServerEnv()) {
    return response;
  }

  const { supabaseUrl, supabaseKey } = getSupabaseServerEnv();

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const publicApiPath = PUBLIC_API_PATHS.has(pathname);

  if (!user) {
    if (isApiPath(pathname) && !publicApiPath) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    if (!isPublicPage(pathname)) {
      return toAuthRedirect(request, "Debes iniciar sesion para continuar.");
    }
  }

  if (user && isAdminPath(pathname) && !isAdminRole(user.app_metadata?.role)) {
    if (isApiPath(pathname)) {
      return NextResponse.json({ error: "Requiere rol ADMIN." }, { status: 403 });
    }

    return toAuthRedirect(request, "Esta ruta requiere rol admin.");
  }

  return response;
}