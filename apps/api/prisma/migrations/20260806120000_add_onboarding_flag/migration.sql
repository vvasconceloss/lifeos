-- AlterTable User: onboarding flag (existing users are considered onboarded)
ALTER TABLE "User" ADD COLUMN "onboarded" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User" SET "onboarded" = true;
