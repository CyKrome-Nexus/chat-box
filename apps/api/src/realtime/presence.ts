import { getRedis } from "@/lib/redis";

const KEY = "presence:online";
const HEARTBEAT_MS = 30_000;
const EXPIRY_MS = 90_000;

// Local socket counts per user, mirrored into a Redis sorted set (score = expiry) for multi-node deployments.
class PresenceStore {
  private readonly local = new Map<string, number>();
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (this.timer || !getRedis()) return;
    this.timer = setInterval(() => void this.heartbeat(), HEARTBEAT_MS);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async connect(userId: string): Promise<boolean> {
    const count = (this.local.get(userId) ?? 0) + 1;
    this.local.set(userId, count);
    const wasOnline = count > 1 || (await this.remoteOnline([userId])).has(userId);
    await getRedis()?.zadd(KEY, Date.now() + EXPIRY_MS, userId);
    return !wasOnline;
  }

  async disconnect(userId: string): Promise<boolean> {
    const count = (this.local.get(userId) ?? 1) - 1;
    if (count > 0) {
      this.local.set(userId, count);
      return false;
    }
    this.local.delete(userId);
    await getRedis()?.zrem(KEY, userId);
    return true;
  }

  async onlineAmong(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const remote = await this.remoteOnline(userIds);
    return userIds.filter((id) => this.local.has(id) || remote.has(id));
  }

  async isOnline(userId: string): Promise<boolean> {
    return (await this.onlineAmong([userId])).length > 0;
  }

  private async remoteOnline(userIds: string[]): Promise<Set<string>> {
    const redis = getRedis();
    if (!redis) return new Set();
    const scores = await redis.zmscore(KEY, ...userIds);
    const now = Date.now();
    return new Set(userIds.filter((_, index) => Number(scores[index] ?? 0) > now));
  }

  private async heartbeat(): Promise<void> {
    const redis = getRedis();
    if (!redis || this.local.size === 0) return;
    const expiry = Date.now() + EXPIRY_MS;
    const args = [...this.local.keys()].flatMap((id) => [expiry, id]);
    await redis.zadd(KEY, ...args);
    await redis.zremrangebyscore(KEY, 0, Date.now());
  }
}

export const presence = new PresenceStore();
