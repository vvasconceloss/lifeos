import { prisma } from "../../db/client";
import type { PillarResponse } from "./pillar.schemas";

function toResponse(pillar: {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): PillarResponse {
  return {
    id: pillar.id,
    name: pillar.name,
    createdAt: pillar.createdAt,
    updatedAt: pillar.updatedAt,
  };
}

export async function createPillar(
  userId: string,
  name: string,
): Promise<PillarResponse> {
  const pillar = await prisma.pillar.create({
    data: { userId, name },
  });

  return toResponse(pillar);
}

export async function listPillars(userId: string): Promise<PillarResponse[]> {
  const pillars = await prisma.pillar.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return pillars.map(toResponse);
}
