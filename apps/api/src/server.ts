import { buildApp } from "./app";
import { prisma } from "./db/client";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;

async function start() {
  const app = await buildApp();

  process.on("unhandledRejection", (reason) => {
    app.log.error({ err: reason }, "Unhandled promise rejection");
  });

  process.on("uncaughtException", (error) => {
    app.log.error({ err: error }, "Uncaught exception");
    process.exit(1);
  });

  let shuttingDown = false;
  async function shutdown(signal: string): Promise<void> {
    if (shuttingDown) {
      app.log.warn(`Received a second ${signal}. Forcing shutdown.`);
      process.exit(1);
    }
    shuttingDown = true;

    app.log.info(`Received ${signal}. Shutting down the application safely...`);
    try {
      await app.close();
      await prisma.$disconnect();
      app.log.info("Application shut down successfully.");
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error }, "Error during shutdown");
      process.exit(1);
    }
  }

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => void shutdown(signal));
  }

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`LifeOS API listening on http://${HOST}:${PORT}`);
  } catch (error) {
    app.log.error({ err: error }, "An error occurred whilst launching the application");
    process.exit(1);
  }
}

start();
