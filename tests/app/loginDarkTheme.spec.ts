import { describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';

describe('Login page dark theme (regression)', () => {
  it('renders a dark login layout with fish background', async () => {
    const file = await readFile('src/app/login/page.tsx', 'utf8');

    expect(file).toContain("from './FishBackground'");
    expect(file).toContain('<FishBackground />');
    expect(file).toContain('bg-[#05070a]');
    expect(file).toContain('text-slate-100');
    expect(file).toContain('overflow-hidden');
  });

  it('uses Supabase auth UI in dark mode', async () => {
    const file = await readFile('src/app/login/SupabaseAuthUI.tsx', 'utf8');

    expect(file).toContain('dark');
    expect(file).toContain('ThemeSupa');
    expect(file).toContain('panel-card');
  });
});

