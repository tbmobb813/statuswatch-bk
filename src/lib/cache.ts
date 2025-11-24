import LRU from 'lru-cache';

// Support both ESM default export and CommonJS interop used by some test runners
type LRUConstructor = new <K, V>(opts?: { max?: number; ttl?: number }) => {
  get(k: K): V | undefined;
  set(k: K, v: V, opts?: { ttl?: number }): void;
  has(k: K): boolean;
  delete(k: K): void;
  clear(): void;
};

let LRUCacheClass: LRUConstructor;
try {
  // Use require at runtime to handle different module systems (CJS vs ESM) in test runners
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('lru-cache');
  // module may export { LRUCache } or default or be the constructor itself
  LRUCacheClass = (mod && (mod.LRUCache ?? mod.default ?? mod)) as LRUConstructor;
} catch {
  // Fallback to the imported LRU (should work in ESM environments)
  LRUCacheClass = (LRU as unknown) as LRUConstructor;
}

type Key = string;

const DEFAULT_MAX = 500;
const DEFAULT_TTL = 1000 * 60 * 5; // 5 minutes

const cache = new LRUCacheClass<Key, unknown>({ max: DEFAULT_MAX, ttl: DEFAULT_TTL });

export function cacheSet(key: Key, value: unknown, ttlMs?: number) {
  if (ttlMs) {
    cache.set(key, value, { ttl: ttlMs });
  } else {
    cache.set(key, value);
  }
}

export function cacheGet<T = unknown>(key: Key): T | undefined {
  return cache.get(key) as T | undefined;
}

export function cacheHas(key: Key): boolean {
  return cache.has(key);
}

export function cacheDel(key: Key): void {
  cache.delete(key);
}

export function cacheClear(): void {
  cache.clear();
}

export default cache;
