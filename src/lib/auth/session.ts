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

type RegistrationProfileInput = {
  name?: string;
  farmName?: string;
};

type EnsureAppUserOptions = {
  requestedRole?: Role;
  profile?: RegistrationProfileInput;
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

function normalizeOptionalText(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

async function resolveDefaultRole() {
  const usersCount = await prisma.appUser.count();
  return usersCount === 0 ? Role.ADMIN : Role.USER;
}

async function ensureAppUser(authUser: User, options?: EnsureAppUserOptions) {
  const email = authUser.email?.trim().toLowerCase();
  const name = normalizeOptionalText(options?.profile?.name ?? authUser.user_metadata?.full_name);
  const farmName = normalizeOptionalText(options?.profile?.farmName ?? authUser.user_metadata?.farm_name);

  if (!email) {
    throw new SessionError(400, "El usuario autenticado no tiene email.");
  }

  const existing = await prisma.appUser.findUnique({
    where: { id: authUser.id },
  });

  if (existing) {
    const updateData: {
      email?: string;
      name?: string;
      farmName?: string;
    } = {};

    if (existing.email !== email) {
      updateData.email = email;
    }

    if (name !== undefined && existing.name !== name) {
      updateData.name = name;
    }

    if (farmName !== undefined && existing.farmName !== farmName) {
      updateData.farmName = farmName;
    }

    if (Object.keys(updateData).length > 0) {
      return prisma.appUser.update({
        where: { id: authUser.id },
        data: updateData,
      });
    }

    return existing;
  }

  const role = options?.requestedRole ?? fromMetadataRole(authUser.app_metadata?.role) ?? (await resolveDefaultRole());

  return prisma.appUser.create({
    data: {
      id: authUser.id,
      email,
      role,
      name,
      farmName,
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
    name: appUser.name,
    farmName: appUser.farmName,
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

export async function registerWithEmailPassword(
  email: string,
  password: string,
  profile?: RegistrationProfileInput,
): Promise<SessionContext> {
  const normalizedEmail = normalizeEmail(email);
  const name = normalizeOptionalText(profile?.name);
  const farmName = normalizeOptionalText(profile?.farmName);
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
    user_metadata: {
      full_name: name,
      farm_name: farmName,
    },
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

  const appUser = await ensureAppUser(user, {
    requestedRole: role,
    profile: {
      name,
      farmName,
    },
  });

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
