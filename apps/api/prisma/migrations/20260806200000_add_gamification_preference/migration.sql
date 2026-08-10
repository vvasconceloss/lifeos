-- AlterTable User: gamification preference (off by default)
ALTER TABLE "User" ADD COLUMN "gamification" BOOLEAN NOT NULL DEFAULT false;
