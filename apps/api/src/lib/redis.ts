import { Redis } from "ioredis";

import { env } from "@/config/env";

let client: Redis | null = null;

export const getRedis = (): Redis | null => {
  if (!env.REDIS_URL) return null;
  client ??= new Redis(env.REDIS_URL, { maxRetriesPerRequest: 3, lazyConnect: false });
  return client;
};

export const createRedisConnection = (): Redis | null => (env.REDIS_URL ? new Redis(env.REDIS_URL) : null);

export const closeRedis = async (): Promise<void> => {
  await client?.quit();
  client = null;
};
