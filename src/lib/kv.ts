// src/lib/kv.ts
import { kv } from '@vercel/kv';

// tiny wrappers so the rest of the app can import named helpers
export async function getKV<T = unknown>(key: string) {
  return kv.get<T>(key);
}

export async function setKV<T = unknown>(key: string, value: T) {
  return kv.set(key, value as any);
}

export default kv;
