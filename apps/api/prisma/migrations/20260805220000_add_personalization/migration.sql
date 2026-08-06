-- AlterTable User: profile & preferences
ALTER TABLE "User" ADD COLUMN "timezone" TEXT,
ADD COLUMN "weekStart" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'system';

-- AlterTable Pillar: icon, description, ordering
ALTER TABLE "Pillar" ADD COLUMN "icon" TEXT,
ADD COLUMN "description" TEXT,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable Habit: icon, color, ordering
ALTER TABLE "Habit" ADD COLUMN "icon" TEXT,
ADD COLUMN "color" TEXT,
ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
