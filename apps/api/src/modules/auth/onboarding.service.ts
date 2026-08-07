import { prisma } from "../../db/client";
import { toUserResponse } from "./auth.service";
import type { OnboardingBody, OnboardingResponse } from "./auth.schemas";

export const ONBOARDING_ERRORS = {
  ALREADY_ONBOARDED: "User already completed onboarding",
  INVALID_PILLAR_INDEX: "A habit references a pillar that was not selected",
  NOT_FOUND: "User not found",
} as const;

export async function completeOnboarding(
  userId: string,
  data: OnboardingBody,
): Promise<OnboardingResponse | { error: string; status: number }> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!existing) {
    return { error: ONBOARDING_ERRORS.NOT_FOUND, status: 404 };
  }

  if (existing.onboarded) {
    return { error: ONBOARDING_ERRORS.ALREADY_ONBOARDED, status: 409 };
  }

  if (data.habits.some((h) => h.pillarIndex >= data.pillars.length)) {
    return { error: ONBOARDING_ERRORS.INVALID_PILLAR_INDEX, status: 400 };
  }

  const result = await prisma.$transaction(async (tx) => {
    const pillars = await Promise.all(
      data.pillars.map((p, index) =>
        tx.pillar.create({
          data: {
            userId,
            name: p.name,
            sortOrder: index,
            ...(p.color ? { color: p.color } : {}),
            ...(p.icon ? { icon: p.icon } : {}),
            ...(p.description ? { description: p.description } : {}),
          },
        }),
      ),
    );

    await Promise.all(
      data.habits.map((h, index) =>
        tx.habit.create({
          data: {
            userId,
            pillarId: pillars[h.pillarIndex]!.id,
            name: h.name,
            frequency: "DAILY",
            sortOrder: index,
            ...(h.icon ? { icon: h.icon } : {}),
            ...(h.color ? { color: h.color } : {}),
          },
        }),
      ),
    );

    const user = await tx.user.update({
      where: { id: userId },
      data: { onboarded: true },
    });

    return { user };
  });

  return {
    user: toUserResponse(result.user),
    pillarsCreated: data.pillars.length,
    habitsCreated: data.habits.length,
  };
}
