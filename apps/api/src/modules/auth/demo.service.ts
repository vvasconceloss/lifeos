import { prisma } from "../../db/client";
import { DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME, hashPassword, toUserResponse } from "../auth/auth.service";

function utcDateKey(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Seed (or re-seed) the public demo account with realistic sample data. Idempotent. */
export async function seedDemoUser(): Promise<{ id: string; email: string }> {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });

  let userId: string;
  if (existing) {
    // Re-seed: drop the demo user's data so the demo always looks fresh.
    await prisma.$transaction([
      prisma.goalHabit.deleteMany({ where: { goal: { userId: existing.id } } }),
      prisma.goal.deleteMany({ where: { userId: existing.id } }),
      prisma.projectTask.deleteMany({ where: { project: { userId: existing.id } } }),
      prisma.project.deleteMany({ where: { userId: existing.id } }),
      prisma.habitCompletion.deleteMany({ where: { habit: { userId: existing.id } } }),
      prisma.dailyLog.deleteMany({ where: { userId: existing.id } }),
      prisma.habit.deleteMany({ where: { userId: existing.id } }),
      prisma.pillar.deleteMany({ where: { userId: existing.id } }),
    ]);
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: DEMO_NAME,
        timezone: "UTC",
        weekStart: 1,
        theme: "system",
        onboarded: true,
        gamification: true,
        passwordHash: hashPassword(DEMO_PASSWORD),
      },
    });
    userId = existing.id;
  } else {
    const user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        passwordHash: hashPassword(DEMO_PASSWORD),
        name: DEMO_NAME,
        timezone: "UTC",
        weekStart: 1,
        theme: "system",
        onboarded: true,
        gamification: true,
      },
    });
    userId = user.id;
  }

  await seedData(userId);

  return { id: userId, email: DEMO_EMAIL };
}

async function seedData(userId: string): Promise<void> {
  const pillars = [
    { name: "Health", icon: "❤️", color: "#ef4444", description: "Sleep, exercise, nutrition and energy" },
    { name: "Engineering", icon: "💻", color: "#3b82f6", description: "Coding, learning and building" },
    { name: "Knowledge", icon: "📚", color: "#8b5cf6", description: "Reading, studying and curiosity" },
    { name: "Relationships", icon: "🤝", color: "#ec4899", description: "Family, friends and connection" },
  ] as const;

  const created = [];
  for (let i = 0; i < pillars.length; i++) {
    const p = await prisma.pillar.create({
      data: {
        userId,
        name: pillars[i]!.name,
        icon: pillars[i]!.icon,
        color: pillars[i]!.color,
        description: pillars[i]!.description,
        sortOrder: i,
      },
    });
    created.push(p);
  }

  const [health, eng, knowledge, relationships] = created;

  interface HabitSpec {
    name: string;
    icon: string;
    color: string;
    pillarId: string;
    frequency: "DAILY" | "WEEKLY_DAYS" | "TIMES_PER_WEEK" | "TIMES_PER_MONTH";
    daysOfWeek?: number[];
    timesPerWeek?: number;
    timesPerMonth?: number;
  }

  const habitSpecs: HabitSpec[] = [
    { name: "Morning run", icon: "🏃", color: "#ef4444", pillarId: health!.id, frequency: "DAILY" },
    { name: "Drink 2L of water", icon: "💧", color: "#06b6d4", pillarId: health!.id, frequency: "DAILY" },
    { name: "Meditate 10 minutes", icon: "🧘", color: "#10b981", pillarId: health!.id, frequency: "WEEKLY_DAYS", daysOfWeek: [1, 2, 3, 4, 5] },
    { name: "Code for 1 hour", icon: "⌨️", color: "#3b82f6", pillarId: eng!.id, frequency: "TIMES_PER_WEEK", timesPerWeek: 5 },
    { name: "Review or refactor code", icon: "🔧", color: "#f59e0b", pillarId: eng!.id, frequency: "WEEKLY_DAYS", daysOfWeek: [2, 4, 6] },
    { name: "Read for 20 minutes", icon: "📖", color: "#8b5cf6", pillarId: knowledge!.id, frequency: "DAILY" },
    { name: "Call a friend or family", icon: "📞", color: "#ec4899", pillarId: relationships!.id, frequency: "TIMES_PER_MONTH", timesPerMonth: 10 },
  ];

  const habits = [];
  for (let i = 0; i < habitSpecs.length; i++) {
    const spec = habitSpecs[i]!;
    const habit = await prisma.habit.create({
      data: {
        userId,
        pillarId: spec.pillarId,
        name: spec.name,
        icon: spec.icon,
        color: spec.color,
        frequency: spec.frequency,
        daysOfWeek: spec.daysOfWeek ?? [],
        timesPerWeek: spec.timesPerWeek ?? null,
        timesPerMonth: spec.timesPerMonth ?? null,
        sortOrder: i,
      },
    });
    habits.push(habit);
  }

  // Completions over the last 90 days, ~85% completion, 7 days ahead never completed.
  const today = utcDateKey(new Date());
  for (let i = 0; i < 90; i++) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    if (date > today) continue;
    for (const habit of habits) {
      const skip = (i * 7 + habit.name.length) % 10 < 2; // ~80% deterministic
      if (skip) continue;
      await prisma.habitCompletion.create({
        data: { habitId: habit.id, date: utcDateKey(date) },
      });
    }
  }

  // Goals with linked habits.
  const runHabit = habits[0]!;
  const readHabit = habits[5]!;
  const codeHabit = habits[3]!;
  const callHabit = habits[6]!;

  await prisma.goal.create({
    data: {
      userId,
      pillarId: health!.id,
      title: "Run a half marathon",
      description: "Build up to a 21 km run over the next months.",
      status: "ACTIVE",
      deadline: new Date(Date.UTC(2026, 9, 15)),
      habits: { create: [{ habitId: runHabit.id }, { habitId: habits[1]!.id }] },
    },
  });
  await prisma.goal.create({
    data: {
      userId,
      pillarId: eng!.id,
      title: "Ship the LifeOS beta",
      description: "Land the public beta release.",
      status: "ACTIVE",
      habits: { create: [{ habitId: codeHabit.id }, { habitId: habits[4]!.id }] },
    },
  });
  await prisma.goal.create({
    data: {
      userId,
      pillarId: knowledge!.id,
      title: "Read 12 books this year",
      status: "ACTIVE",
      habits: { create: [{ habitId: readHabit.id }] },
    },
  });
  await prisma.goal.create({
    data: {
      userId,
      pillarId: relationships!.id,
      title: "Grow a close network",
      status: "COMPLETED",
      completedAt: new Date(),
      habits: { create: [{ habitId: callHabit.id }] },
    },
  });

  // Projects with tasks.
  const shipProject = await prisma.project.create({
    data: {
      userId,
      pillarId: eng!.id,
      title: "Deploy the public landing page",
      description: "Vercel + Render + Neon.",
      status: "IN_PROGRESS",
      tasks: {
        create: [
          { title: "Configure vercel.json", isDone: true, position: 0 },
          { title: "Add render.yaml", isDone: true, position: 1 },
          { title: "Set up the demo account", isDone: true, position: 2 },
          { title: "Add analytics screenshots", isDone: false, position: 3 },
        ],
      },
    },
  });
  await prisma.project.create({
    data: {
      userId,
      pillarId: knowledge!.id,
      title: "Write the deployment guide",
      status: "PLANNING",
      tasks: { create: [{ title: "Draft DEPLOYMENT.md", isDone: false, position: 0 }] },
    },
  });

  // Daily logs for the last 21 days.
  for (let i = 0; i < 21; i++) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const mood = 5 + ((i * 3) % 5); // 5-9
    const energy = 4 + ((i * 2) % 6); // 4-9
    const sleepHours = 6.5 + ((i % 4) * 0.5); // 6.5-8
    await prisma.dailyLog.create({
      data: {
        userId,
        date: utcDateKey(date),
        mood,
        energy,
        sleepHours,
        notes: i === 0 ? "Solid day — got everything done." : null,
      },
    });
  }

  void shipProject;
}

export async function getDemoUserResponse() {
  const user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) return null;
  return toUserResponse(user);
}
