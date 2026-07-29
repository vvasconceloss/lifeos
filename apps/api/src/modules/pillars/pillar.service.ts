import { prisma } from "../../db/client";
import type { CreatePillarBody, PillarResponse, UpdatePillarBody } from "./pillar.schemas";

function toResponse(pillar: {
  id: string;
  name: string;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}): PillarResponse {
  return {
    id: pillar.id,
    name: pillar.name,
    color: pillar.color,
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
    },
  });

  return toResponse(pillar);
}

export async function updatePillar(
  id: string,
  userId: string,
  data: UpdatePillarBody,
): Promise<PillarResponse | null> {
  const pillar = await prisma.pillar.findFirst({
    where: { id, userId },
  });

  if (!pillar) return null;

  const updated = await prisma.pillar.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
    },
  });

  return toResponse(updated);
}

export const PILLAR_ERRORS = {
  HAS_HABITS: "Cannot delete pillar with associated habits. Archive or delete the habits first.",
  NOT_FOUND: "Pillar not found",
} as const;

export async function deletePillar(
  id: string,
  userId: string,
): Promise<{ success: true } | { success: false; reason: string }> {
  const pillar = await prisma.pillar.findFirst({
    where: { id, userId },
  });

  if (!pillar) {
    return { success: false, reason: PILLAR_ERRORS.NOT_FOUND };
  }

  const habitCount = await prisma.habit.count({
    where: { pillarId: id },
  });

  if (habitCount > 0) {
    return { success: false, reason: PILLAR_ERRORS.HAS_HABITS };
  }

  await prisma.pillar.delete({ where: { id } });
  return { success: true };
}

export async function listPillars(userId: string): Promise<PillarResponse[]> {
  const pillars = await prisma.pillar.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return pillars.map(toResponse);
}
