import { describe, expect, it } from 'vitest';
import { getErrorMessage, readJson } from '@/utils/api';

describe('getErrorMessage', () => {
  it('returns message when present', () => {
    expect(getErrorMessage({ message: 'Nope' })).toBe('Nope');
  });

  it('falls back to error when message missing', () => {
    expect(getErrorMessage({ error: 'bad_request' })).toBe('bad_request');
  });

  it('returns null for non-objects', () => {
    expect(getErrorMessage(null)).toBeNull();
    expect(getErrorMessage('nope')).toBeNull();
  });
});

describe('readJson', () => {
  it('parses valid JSON', async () => {
    const res = new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await readJson<{ ok: boolean }>(res);
    expect(json).toEqual({ ok: true });
  });

  it('returns null for invalid JSON', async () => {
    const res = new Response('{', {
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await readJson<{ ok: boolean }>(res);
    expect(json).toBeNull();
  });

  it('returns null for empty body', async () => {
    const res = new Response('');
    const json = await readJson<{ ok: boolean }>(res);
    expect(json).toBeNull();
  });
});

