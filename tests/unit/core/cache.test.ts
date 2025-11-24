import { cacheSet, cacheGet, cacheHas, cacheDel, cacheClear } from '../../../src/lib/cache';

describe('core/critical: cache wrapper', () => {
  const key = 'test:key';

  beforeEach(() => {
    cacheClear();
  });

  test('set/get/has/del flow', () => {
    expect(cacheHas(key)).toBe(false);
    cacheSet(key, { value: 42 });
    expect(cacheHas(key)).toBe(true);
    const v = cacheGet<{ value: number }>(key);
    expect(v).toBeDefined();
    expect(v!.value).toBe(42);
    cacheDel(key);
    expect(cacheHas(key)).toBe(false);
  });
});
