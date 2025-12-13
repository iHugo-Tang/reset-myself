import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

describe('Admin dashboard mobile UI (regression)', () => {
  it('keeps goal actions menu visible on mobile', async () => {
    const file = await readFile(
      'src/app/admin/dashboard/AdminDashboard.tsx',
      'utf8'
    );

    expect(file).not.toContain('hidden shrink-0 items-center gap-6');
    expect(file).toContain('<GoalActionsMenu');
    expect(file).toContain('onClick={(event) => event.stopPropagation()}');
  });

  it('renders a mobile nav entrypoint', async () => {
    const file = await readFile(
      'src/app/admin/dashboard/AdminDashboard.tsx',
      'utf8'
    );

    expect(file).toContain('aria-label="Open menu"');
    expect(file).toContain('lg:hidden');
  });

  it('navigates to home when clicking the brand', async () => {
    const file = await readFile(
      'src/app/admin/dashboard/AdminDashboard.tsx',
      'utf8'
    );

    expect(file).toContain('href="/"');
    expect(file).toContain('aria-label="Go to home"');
  });
});
