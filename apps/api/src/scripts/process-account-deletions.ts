import { prisma } from "../db/client";
import { loadEmailConfig, createEmailService } from "../lib/email";
import { processAccountDeletions } from "../modules/account/account.service";

/**
 * Daily job: permanently deletes accounts whose 15-day recovery window elapsed.
 * The final email is sent before deletion (the address won't exist afterwards).
 *
 * Run via `pnpm --filter @lifeos/api jobs:process-account-deletions` or a cron
 * hitting the Render API. Idempotent — safe to run more than once a day.
 */
async function main() {
  const emailService = createEmailService({
    config: loadEmailConfig(),
    logger: console,
  });

  const { deleted } = await processAccountDeletions(async (email) => {
    await emailService.send({
      to: email,
      template: "account-deleted",
      data: {},
    });
  });

  console.log(`Account deletions processed: ${deleted.length}`);
  if (deleted.length > 0) {
    console.log(`Deleted: ${deleted.map((d) => d.userIdHash).join(", ")}`);
  }
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
