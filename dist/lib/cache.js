"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheSet = cacheSet;
exports.cacheGet = cacheGet;
exports.cacheHas = cacheHas;
exports.cacheDel = cacheDel;
exports.cacheClear = cacheClear;
const lru_cache_1 = __importDefault(require("lru-cache"));
const DEFAULT_MAX = 500;
const DEFAULT_TTL = 1000 * 60 * 5; // 5 minutes
const cache = new lru_cache_1.default({ max: DEFAULT_MAX, ttl: DEFAULT_TTL });
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
