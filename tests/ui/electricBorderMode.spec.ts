import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

describe('ElectricBorder performance modes', () => {
  it('exposes a mode prop with lite/off options', async () => {
    const file = await readFile('src/components/ElectricBorder.tsx', 'utf8');

    expect(file).toContain("mode?: 'full' | 'lite' | 'off'");
    expect(file).toContain("mode = 'full'");
    expect(file).toContain("resolvedMode === 'lite'");
    expect(file).toContain("resolvedMode === 'off'");
  });

  it('respects reduced motion and save-data by degrading to lite', async () => {
    const file = await readFile('src/components/ElectricBorder.tsx', 'utf8');

    expect(file).toContain('prefers-reduced-motion: reduce');
    expect(file).toContain('saveData');
    expect(file).toContain("? 'lite' : mode");
  });

  it('adds an OKLCH support fallback in CSS', async () => {
    const css = await readFile('src/components/ElectricBorder.css', 'utf8');

    expect(css).toContain('@supports (color: oklch(0 0 0))');
    expect(css).toContain('--electric-light-color');
  });
});

