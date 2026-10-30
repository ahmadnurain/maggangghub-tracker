/**
 * In-Memory & Cloudflare Cache Layer
 */

const memoryCache = new Map();
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getCache(key) {
  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return item.data;
}

export function setCache(key, data, ttlMs = DEFAULT_TTL_MS) {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
    savedAt: Date.now(),
  });
}

export function clearCache() {
  memoryCache.clear();
}
