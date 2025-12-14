import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

describe('Streak badge electric border integration', () => {
  it('uses the ElectricBorder component with data hooks', async () => {
    const file = await readFile('src/app/timeline/StreakBadge.tsx', 'utf8');

    expect(file).toContain(
      "import ElectricBorder from '@/components/ElectricBorder'"
    );
    expect(file).toContain('data-testid="streak-electric"');
    expect(file).toContain('mode={electricMode}');
  });

  it('removes the legacy global electric-border CSS', async () => {
    const css = await readFile('src/app/globals.css', 'utf8');

    expect(css).not.toContain('.electric-border::before');
    expect(css).not.toContain('@keyframes electric-rotate');
  });

  it('provides a client-side preview page with presets and slider', async () => {
    const file = await readFile(
      'src/app/timeline/streak-preview/page.tsx',
      'utf8'
    );

    expect(file).toContain("'use client'");
    expect(file).toContain('presetStreaks');
    expect(file).toContain('type="range"');
  });
});
