import { describe, expect, it } from 'vitest';

import {
  createFishSchool,
  mulberry32,
  stepFishSchool,
} from '@/app/login/fishSimulation';

describe('login fish simulation', () => {
  it('creates fish within bounds', () => {
    const rng = mulberry32(1);
    const fish = createFishSchool({ count: 12, width: 800, height: 600, rng });

    expect(fish).toHaveLength(12);
    for (const item of fish) {
      expect(item.x).toBeGreaterThanOrEqual(0);
      expect(item.x).toBeLessThanOrEqual(800);
      expect(item.y).toBeGreaterThanOrEqual(0);
      expect(item.y).toBeLessThanOrEqual(600);
      expect(item.size).toBeGreaterThan(0);
    }
  });

  it('wraps fish when swimming beyond the edges', () => {
    const rng = mulberry32(2);
    const fish = createFishSchool({ count: 1, width: 200, height: 100, rng });
    fish[0].x = -999;

    const stepped = stepFishSchool({
      fish,
      dtSeconds: 1 / 60,
      width: 200,
      height: 100,
      rng,
    });

    expect(stepped[0].x).toBeGreaterThan(0);
  });
});

