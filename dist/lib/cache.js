"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheSet = cacheSet;
exports.cacheGet = cacheGet;
exports.cacheHas = cacheHas;
exports.cacheDel = cacheDel;
exports.cacheClear = cacheClear;
const lru_cache_1 = __importDefault(require("lru-cache"));
let LRUCacheClass;
try {
    // Use require at runtime to handle different module systems (CJS vs ESM) in test runners
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('lru-cache');
    // module may export { LRUCache } or default or be the constructor itself
    LRUCacheClass = (mod && ((_b = (_a = mod.LRUCache) !== null && _a !== void 0 ? _a : mod.default) !== null && _b !== void 0 ? _b : mod));
}
catch {
    // Fallback to the imported LRU (should work in ESM environments)
    LRUCacheClass = lru_cache_1.default;
}
const DEFAULT_MAX = 500;
const DEFAULT_TTL = 1000 * 60 * 5; // 5 minutes
const cache = new LRUCacheClass({ max: DEFAULT_MAX, ttl: DEFAULT_TTL });
function cacheSet(key, value, ttlMs) {
    if (ttlMs) {
        cache.set(key, value, { ttl: ttlMs });
    }
    else {
        cache.set(key, value);
    }
}
function cacheGet(key) {
    return cache.get(key);
}
function cacheHas(key) {
    return cache.has(key);
}
function cacheDel(key) {
    cache.delete(key);
}
function cacheClear() {
    cache.clear();
}
exports.default = cache;
