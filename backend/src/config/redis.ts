import { createClient, RedisClientType } from "redis";
import { env } from "./index";

let redisClient: RedisClientType | null = null;

export const connectRedis = async (): Promise<RedisClientType> => {
  if (redisClient && redisClient.isReady) {
    return redisClient;
  }

  try {
    redisClient = createClient({
      url: env.redisUrl,
    });

    redisClient.on("error", (err) => {
      console.error("Redis error:", err);
    });

    redisClient.on("connect", () => {
      console.log("Redis connected");
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error("Redis connection error:", error);
    throw error;
  }
};

export const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error("Redis client not initialized");
  }
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    console.log("Redis disconnected");
  }
};

export const cacheService = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = getRedisClient();
      const data = await client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const client = getRedisClient();
      const data = JSON.stringify(value);
      if (ttlSeconds) {
        await client.setEx(key, ttlSeconds, data);
      } else {
        await client.set(key, data);
      }
    } catch (error) {
      console.error("Cache set error:", error);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const client = getRedisClient();
      await client.del(key);
    } catch (error) {
      console.error("Cache delete error:", error);
    }
  },

  async deletePattern(pattern: string): Promise<void> {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error("Cache delete pattern error:", error);
    }
  },
};
