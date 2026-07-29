-- DropForeignKey
ALTER TABLE "Habit" DROP CONSTRAINT "Habit_pillarId_fkey";

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "Pillar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
