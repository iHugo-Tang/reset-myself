import { describe, expect, it, vi, afterEach } from 'vitest';
import { normalizeHeatmap } from '@/app/timeline/heatmap';

describe('normalizeHeatmap', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fills weeks relative to UTC offset 0', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-11T12:00:00Z'));

    const data = normalizeHeatmap([{ date: '2024-02-13', count: 2 }], 0, 7);

    expect(data).toHaveLength(7);
    expect(data[0].date).toBe('2024-02-11');
    expect(data[2]).toMatchObject({ date: '2024-02-13', count: 2 });
  });

  it('shifts calendar bounds when offset crosses local day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-11T02:00:00Z'));

    const heatmap = [{ date: '2024-02-10', count: 5 }];

    const utcData = normalizeHeatmap(heatmap, 0, 7);
    const offsetData = normalizeHeatmap(heatmap, -600, 7);

    expect(utcData.some((entry) => entry.date === '2024-02-10')).toBe(false);
    expect(offsetData[offsetData.length - 1]).toMatchObject({
      date: '2024-02-10',
      count: 5,
    });
  });
});
