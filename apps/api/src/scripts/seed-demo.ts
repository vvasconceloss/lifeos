import { seedDemoUser } from "../modules/auth/demo.service";
import { prisma } from "../db/client";

async function main() {
  const { id, email } = await seedDemoUser();
  console.log(`Demo account ready: ${email} (${id})`);
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
