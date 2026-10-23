import { env } from "@/config/env";
import { buildApp } from "./app";
import { connectDatabase, disconnectDatabase } from "./lib/db";
import { closeRedis } from "./lib/redis";
import { corsOriginsFrom, createRealtime } from "./realtime";
import { presence } from "./realtime/presence";

const main = async () => {
  const app = await buildApp();
  await connectDatabase(env.MONGODB_URI);
  const io = createRealtime(app.server, corsOriginsFrom(env.CORS_ORIGINS));

  await app.listen({ host: env.HOST, port: env.PORT });

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received, shutting down`);
    presence.stop();
    await new Promise<void>((resolve) => io.close(() => resolve()));
    await app.close();
    await Promise.allSettled([disconnectDatabase(), closeRedis()]);
    process.exit(0);
  };
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
};

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
