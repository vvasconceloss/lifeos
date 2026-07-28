import bcrypt from "bcrypt";
import { prisma } from "../../db/client";
import type { RegisterBody, UserResponse } from "./auth.schemas";

const SALT_ROUNDS = 10;

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

function toUserResponse(user: {
  id: string;
  email: string;
  name: string | null;
}): UserResponse {
  return { id: user.id, email: user.email, name: user.name };
}

export async function createUser(data: RegisterBody): Promise<UserResponse> {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("EMAIL_ALREADY_EXISTS");
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
    throw new Error("INVALID_CREDENTIALS");
  }

  const valid = comparePassword(password, user.passwordHash);

  if (!valid) {
    throw new Error("INVALID_CREDENTIALS");
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

export const AUTH_ERRORS = {
  EMAIL_ALREADY_EXISTS: "Email already in use",
  INVALID_CREDENTIALS: "Invalid email or password",
} as const;
