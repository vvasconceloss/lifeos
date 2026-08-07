import bcrypt from "bcrypt";
import { prisma } from "../../db/client";
import type { RegisterBody, UpdateMeBody, UserResponse } from "./auth.schemas";

const SALT_ROUNDS = 10;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function toUserResponse(user: {
  id: string;
  email: string;
  name: string | null;
  timezone: string | null;
  weekStart: number;
  theme: string;
  onboarded: boolean;
  createdAt: Date;
}): UserResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    timezone: user.timezone,
    weekStart: user.weekStart,
    theme: user.theme,
    onboarded: user.onboarded,
    createdAt: user.createdAt,
  };
}

export async function createUser(data: RegisterBody): Promise<UserResponse> {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error(AUTH_ERRORS.EMAIL_ALREADY_EXISTS);
  }

  const passwordHash = hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name ?? null,
    },
  });

  return toUserResponse(user);
}

export async function authenticate(
  email: string,
  password: string,
): Promise<UserResponse> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
  }

  const valid = comparePassword(password, user.passwordHash);

  if (!valid) {
    throw new Error(AUTH_ERRORS.INVALID_CREDENTIALS);
  }

  return toUserResponse(user);
}

export async function getUserById(
  id: string,
): Promise<UserResponse | null> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    return null;
  }

  return toUserResponse(user);
}

export async function updateUser(
  userId: string,
  data: UpdateMeBody,
): Promise<UserResponse> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.timezone !== undefined && { timezone: data.timezone }),
      ...(data.weekStart !== undefined && { weekStart: data.weekStart }),
      ...(data.theme !== undefined && { theme: data.theme }),
      ...(data.onboarded !== undefined && { onboarded: data.onboarded }),
    },
  });

  return toUserResponse(user);
}

export const AUTH_ERRORS = {
  EMAIL_ALREADY_EXISTS: "Email already in use",
  INVALID_CREDENTIALS: "Invalid email or password",
} as const;
