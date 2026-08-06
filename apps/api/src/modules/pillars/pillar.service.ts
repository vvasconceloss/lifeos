import { prisma } from "../../db/client";
import type { CreatePillarBody, PillarResponse, UpdatePillarBody } from "./pillar.schemas";

function toResponse(pillar: {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): PillarResponse {
  return {
    id: pillar.id,
    name: pillar.name,
    color: pillar.color,
    icon: pillar.icon,
    description: pillar.description,
    sortOrder: pillar.sortOrder,
    createdAt: pillar.createdAt,
    updatedAt: pillar.updatedAt,
  };
}

export async function createPillar(
  userId: string,
  data: CreatePillarBody,
): Promise<PillarResponse> {
  const pillar = await prisma.pillar.create({
    data: {
      userId,
      name: data.name,
      ...(data.color ? { color: data.color } : {}),
      ...(data.icon ? { icon: data.icon } : {}),
      ...(data.description ? { description: data.description } : {}),
    },
  });

  return toResponse(pillar);
}

export async function updatePillar(
  id: string,
  userId: string,
  data: UpdatePillarBody,
): Promise<{ pillar: PillarResponse } | { error: string; status: number }> {
  const pillar = await prisma.pillar.findFirst({
    where: { id, userId },
  });

  if (!pillar) {
    return { error: PILLAR_ERRORS.NOT_FOUND, status: 404 };
  }

  const updated = await prisma.pillar.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.icon !== undefined ? { icon: data.icon } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  });

  return { pillar: toResponse(updated) };
}

export async function reorderPillars(
  userId: string,
  ids: string[],
): Promise<{ error: string; status: number } | { count: number }> {
  const owned = await prisma.pillar.findMany({
    where: { id: { in: ids }, userId },
    select: { id: true },
  });

  if (owned.length !== ids.length) {
    return { error: PILLAR_ERRORS.NOT_FOUND, status: 404 };
  }

  await prisma.$transaction(
    ids.map((id, index) => prisma.pillar.update({ where: { id }, data: { sortOrder: index } })),
  );

  return { count: ids.length };
}

export const PILLAR_ERRORS = {
  HAS_HABITS: "Cannot delete pillar with associated habits. Archive or delete the habits first.",
  NOT_FOUND: "Pillar not found",
} as const;

export async function deletePillar(
  id: string,
  userId: string,
): Promise<true | { error: string; status: number }> {
  const pillar = await prisma.pillar.findFirst({
    where: { id, userId },
  });

  if (!pillar) {
    return { error: PILLAR_ERRORS.NOT_FOUND, status: 404 };
  }

  const habitCount = await prisma.habit.count({
    where: { pillarId: id },
  });

  if (habitCount > 0) {
    return { error: PILLAR_ERRORS.HAS_HABITS, status: 409 };
  }

  await prisma.pillar.delete({ where: { id } });
  return true;
}

export async function listPillars(userId: string): Promise<PillarResponse[]> {
  const pillars = await prisma.pillar.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return pillars.map(toResponse);
}
