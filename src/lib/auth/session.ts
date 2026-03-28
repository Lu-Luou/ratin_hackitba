import type { User } from "@supabase/supabase-js";
import { Role, type AppUser } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class SessionError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SessionError";
  }
}

type SessionContext = {
  authUser: User;
  appUser: AppUser;
};

function toMetadataRole(role: Role): "user" | "admin" {
  return role === Role.ADMIN ? "admin" : "user";
}

function fromMetadataRole(value: unknown): Role | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = value.toUpperCase();

  if (normalized === Role.ADMIN) {
    return Role.ADMIN;
  }

  if (normalized === Role.USER) {
    return Role.USER;
  }

  return undefined;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function resolveDefaultRole() {
  const usersCount = await prisma.appUser.count();
  return usersCount === 0 ? Role.ADMIN : Role.USER;
}

async function ensureAppUser(authUser: User, requestedRole?: Role) {
  const email = authUser.email?.trim().toLowerCase();

  if (!email) {
    throw new SessionError(400, "El usuario autenticado no tiene email.");
  }

  const existing = await prisma.appUser.findUnique({
    where: { id: authUser.id },
  });

  if (existing) {
    if (existing.email !== email) {
      return prisma.appUser.update({
        where: { id: authUser.id },
        data: { email },
      });
    }

    return existing;
  }

  const role = requestedRole ?? fromMetadataRole(authUser.app_metadata?.role) ?? (await resolveDefaultRole());

  return prisma.appUser.create({
    data: {
      id: authUser.id,
      email,
      role,
    },
  });
}

async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new SessionError(401, "No autenticado.");
  }

  return user;
}

export function serializeAppUser(appUser: AppUser) {
  return {
    id: appUser.id,
    email: appUser.email,
    role: appUser.role,
    createdAt: appUser.createdAt.toISOString(),
    updatedAt: appUser.updatedAt.toISOString(),
  };
}

export async function signInWithEmailPassword(email: string, password: string): Promise<SessionContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });

  if (error || !user) {
    throw new SessionError(401, error?.message ?? "Credenciales invalidas.");
  }

  const appUser = await ensureAppUser(user);

  return {
    authUser: user,
    appUser,
  };
}

export async function registerWithEmailPassword(email: string, password: string): Promise<SessionContext> {
  const normalizedEmail = normalizeEmail(email);
  const role = await resolveDefaultRole();
  const adminClient = createSupabaseAdminClient();

  console.info("[auth][register] Attempting user creation", {
    email: normalizedEmail,
    requestedRole: role,
  });

  const {
    data: { user },
    error,
  } = await adminClient.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    app_metadata: {
      role: toMetadataRole(role),
    },
  });

  if (error || !user) {
    console.error("[auth][register] Supabase admin.createUser failed", {
      email: normalizedEmail,
      message: error?.message,
      code: error?.code,
      status: error?.status,
    });

    const message = error?.message?.toLowerCase().includes("already")
      ? "Ese email ya esta registrado."
      : (error?.message ?? "No se pudo crear la cuenta.");
    const status = error?.message?.toLowerCase().includes("already") ? 409 : 400;
    throw new SessionError(status, message);
  }

  console.info("[auth][register] Supabase user created", {
    userId: user.id,
    email: normalizedEmail,
  });

  const appUser = await ensureAppUser(user, role);

  console.info("[auth][register] Prisma app user ensured", {
    userId: appUser.id,
    role: appUser.role,
  });

  const supabase = await createSupabaseServerClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (signInError) {
    console.error("[auth][register] Automatic sign-in failed", {
      userId: user.id,
      email: normalizedEmail,
      message: signInError.message,
      code: signInError.code,
      status: signInError.status,
    });

    throw new SessionError(500, "Cuenta creada, pero no se pudo iniciar sesion automaticamente.");
  }

  console.info("[auth][register] Automatic sign-in succeeded", {
    userId: user.id,
    email: normalizedEmail,
  });

  return {
    authUser: user,
    appUser,
  };
}

export async function getSessionContext(): Promise<SessionContext> {
  const authUser = await getSessionUser();
  const appUser = await ensureAppUser(authUser);

  return {
    authUser,
    appUser,
  };
}

export async function requireSessionContext(allowedRoles: Role[] = [Role.USER, Role.ADMIN]) {
  const context = await getSessionContext();

  if (!allowedRoles.includes(context.appUser.role)) {
    throw new SessionError(403, "No tienes permisos para esta accion.");
  }

  return context;
}

export async function updateUserRoleById(userId: string, role: Role) {
  const target = await prisma.appUser.findUnique({ where: { id: userId } });

  if (!target) {
    throw new SessionError(404, "Usuario no encontrado.");
  }

  if (target.role === Role.ADMIN && role !== Role.ADMIN) {
    const adminsCount = await prisma.appUser.count({ where: { role: Role.ADMIN } });

    if (adminsCount <= 1) {
      throw new SessionError(400, "Debe existir al menos un usuario ADMIN.");
    }
  }

  const adminClient = createSupabaseAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: {
      role: toMetadataRole(role),
    },
  });

  if (error) {
    throw new SessionError(502, error.message);
  }

  return prisma.appUser.update({
    where: { id: userId },
    data: { role },
  });
}
