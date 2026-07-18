import { buildApp } from "./app";

const HOST = process.env.HOST || "0.0.0.0";
const PORT = Number(process.env.PORT) || 3000;

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: PORT, host: HOST });

    const signals = ["SIGINT", "SIGTERM"];

    for (const signal of signals) {
      process.on(signal, async () => {
        app.log.info(`Received ${signal}. Shutting down the application safely...`);

        try {
          await app.close();
          app.log.info("Application shut down successfully.");
          process.exit(0);
        } catch (err: unknown) {
          app.log.error(`Error closing the application: ${err}`);
          process.exit(1);
        }
      });
    }

  } catch (error) {
    console.error("An error occurred whilst launching the application: ", error);
    process.exit(1);
  }
}

start();
