import type { FastifyInstance } from "fastify";
import { prisma } from "../src/db/client";

const createdEmails: string[] = [];

export function uniqueEmail(): string {
  const suffix = Math.random().toString(36).slice(2, 10);
  const email = `test-${suffix}@lifeos.com`;
  createdEmails.push(email);
  return email;
}

export async function cleanupTestUsers(): Promise<void> {
  if (createdEmails.length > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: createdEmails } },
    });
  }
}

export async function registerAndGetCookie(
  app: FastifyInstance,
  email: string,
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/v1/auth/register",
    payload: { email, password: "Test1234!" },
  });
  const tokenCookie = res.cookies.find((c) => c.name === "token");
  return `token=${tokenCookie!.value}`;
}

/**
 * Logs in an existing user and returns a fresh session cookie. Used after a
 * sensitive change (e.g. deletion request) that invalidated earlier sessions.
 */
export async function loginAndGetCookie(
  app: FastifyInstance,
  email: string,
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/v1/auth/login",
    payload: { email, password: "Test1234!" },
  });
  const tokenCookie = res.cookies.find((c) => c.name === "token");
  return `token=${tokenCookie!.value}`;
}

/**
 * Registers a user and marks their email as verified — required by modules that
 * gate on `requireVerified` (goals, projects, daily logs, stats, progression).
 */
export async function registerAndGetCookieVerified(
  app: FastifyInstance,
  email: string,
): Promise<string> {
  const cookie = await registerAndGetCookie(app, email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });
  }
  return cookie;
}

export async function createPillar(
  app: FastifyInstance,
  cookie: string,
  name: string,
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/v1/pillars",
    headers: { cookie },
    payload: { name },
  });
  return res.json().pillar.id;
}

export async function createHabit(
  app: FastifyInstance,
  cookie: string,
  name: string,
  pillarId: string,
): Promise<string> {
  const res = await app.inject({
    method: "POST",
    url: "/v1/habits",
    headers: { cookie },
    payload: { name, pillarId },
  });
  return res.json().habit.id;
}

export async function markCompletion(
  app: FastifyInstance,
  cookie: string,
  habitId: string,
  date: string,
): Promise<number> {
  const res = await app.inject({
    method: "PUT",
    url: `/v1/habits/${habitId}/completions/${date}`,
    headers: { cookie },
  });
  return res.statusCode;
}
