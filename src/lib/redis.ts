import { Redis } from '@upstash/redis';
console.log('🧪 REDIS MODULE: This file is being loaded at runtime');
console.log('🧪 [redis.ts] Redis client is being initialized');
console.log('🌐 Redis URL present:', !!process.env.UPSTASH_REDIS_REST_URL);
console.log('🔐 Redis Token present:', !!process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default redis;
