declare module 'lru-cache' {
		export interface Options {
			max?: number;
			ttl?: number;
			[key: string]: unknown;
		}

		export default class LRUCache<K = unknown, V = unknown> {
			constructor(options?: Options);
			get(key: K): V | undefined;
			set(key: K, value: V, options?: { ttl?: number }): void;
			has(key: K): boolean;
			delete(key: K): void;
			clear(): void;
		}
}
