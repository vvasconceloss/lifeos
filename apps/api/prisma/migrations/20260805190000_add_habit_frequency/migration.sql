-- CreateEnum
CREATE TYPE "HabitFrequency" AS ENUM ('DAILY', 'WEEKLY_DAYS', 'TIMES_PER_WEEK', 'TIMES_PER_MONTH');

-- Add the new frequency parameter columns before migrating data.
ALTER TABLE "Habit" ADD COLUMN "daysOfWeek" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
ALTER TABLE "Habit" ADD COLUMN "timesPerWeek" INTEGER;
ALTER TABLE "Habit" ADD COLUMN "timesPerMonth" INTEGER;

-- Convert the existing TEXT frequency column to the new enum (all values are 'DAILY').
ALTER TABLE "Habit" ALTER COLUMN "frequency" DROP DEFAULT;
ALTER TABLE "Habit" ALTER COLUMN "frequency" SET DATA TYPE "HabitFrequency" USING ("frequency"::text)::"HabitFrequency";
ALTER TABLE "Habit" ALTER COLUMN "frequency" SET DEFAULT 'DAILY';

-- Backfill: habits that had a monthlyGoal become TIMES_PER_MONTH, preserving their target.
UPDATE "Habit"
SET "frequency" = 'TIMES_PER_MONTH',
    "timesPerMonth" = "monthlyGoal"
WHERE "monthlyGoal" IS NOT NULL;

-- Drop the legacy column now that its meaning is expressed by the frequency model.
ALTER TABLE "Habit" DROP COLUMN "monthlyGoal";
