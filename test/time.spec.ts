import { describe, expect, it, vi } from 'vitest';

import {
	addDaysUtc,
	buildDateKeys,
	formatDateInTimeZone,
	formatTimeInTimeZone,
	formatWeekdayLabel,
	getTodayKey,
	normalizeOffset,
	normalizeTimeZone,
	readOffsetFromCookieHeader,
	readOffsetFromCookies,
	readTimeZoneFromCookieHeader,
	readTimeZoneFromCookies,
	resolveRequestTimeSettings,
	startOfDayUtcMs,
	toDateKey,
	weekDayIndex,
} from '@/utils/time';

describe('utils/time', () => {
	beforeEach(() => {
		vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
	});

	it('normalizes timezone and offset values safely', () => {
		expect(normalizeTimeZone('Europe/Paris')).toBe('Europe/Paris');
		expect(normalizeTimeZone('not-a-zone')).toBe('UTC');
		expect(normalizeOffset(90.7)).toBe(91);
		expect(normalizeOffset(undefined)).toBe(0);
	});

	it('reads timezone and offset from headers or cookies', () => {
		const header = 'foo=1; tz=Asia/Tokyo; tz_offset=540';
		expect(readTimeZoneFromCookieHeader(header)).toBe('Asia/Tokyo');
		expect(readOffsetFromCookieHeader(header)).toBe(540);

		const malformed = 'tz=%E0%A4; tz_offset=not-a-number';
		expect(readTimeZoneFromCookieHeader(malformed)).toBe('UTC');
		expect(readOffsetFromCookieHeader(malformed)).toBe(0);

		const cookies = {
			get: (name: string) => {
				if (name === 'tz') return { value: 'America/New_York' };
				if (name === 'tz_offset') return { value: '-300' };
				return undefined;
			},
		};

		const settings = resolveRequestTimeSettings({ cookies });
		expect(settings.timeZone).toBe('America/New_York');
		expect(settings.offsetMinutes).toBe(-300);

		const fallbackSettings = resolveRequestTimeSettings({ cookieHeader: 'tz=Invalid/Zone; tz_offset=not-a-number' });
		expect(fallbackSettings.timeZone).toBe('UTC');
		expect(fallbackSettings.offsetMinutes).toBe(0);
	});

	it('formats dates and times with sensible fallbacks', () => {
		expect(formatDateInTimeZone('2024-01-05T10:00:00Z', 'Asia/Tokyo')).toBe('2024-01-05');
		expect(formatWeekdayLabel('2024-01-05', 'Invalid/Zone')).toBe('Fri');
		expect(formatTimeInTimeZone('2024-01-05T03:04:00Z', 'Europe/London')).toBe('03:04');
		expect(formatTimeInTimeZone('not-a-date', 'UTC')).toBe('not-a-date');

		const originalFormatter = Intl.DateTimeFormat;
		let first = true;
		// @ts-expect-error override for test
		Intl.DateTimeFormat = function (...args: any[]) {
			if (first) {
				first = false;
				throw new Error('format fail');
			}
			return new (originalFormatter as any)(...args);
		} as any;
		expect(formatWeekdayLabel('2024-01-05', 'UTC')).toBe('Fri');
		expect(formatTimeInTimeZone('2024-01-05T03:04:00Z', 'UTC')).toBe('03:04');
		Intl.DateTimeFormat = originalFormatter;
	});

	it('computes date keys and ranges with offsets', () => {
		expect(toDateKey('2024-06-15', 120)).toBe('2024-06-15');
		expect(toDateKey('bad-date', 0)).toBe('');
		expect(getTodayKey()).toBe('2024-06-15');

		const keys = buildDateKeys(3, 0, Date.parse('2024-06-15T12:00:00Z'));
		expect(keys).toEqual(['2024-06-15', '2024-06-14', '2024-06-13']);

		const start = startOfDayUtcMs(Date.parse('2024-06-15T15:00:00Z'), -60);
		expect(start).toBe(Date.parse('2024-06-15T01:00:00Z'));
		expect(addDaysUtc(start, 2)).toBe(Date.parse('2024-06-17T01:00:00Z'));
	});

	it('returns weekday index deterministically', () => {
		expect(weekDayIndex('2024-06-16')).toBe(0); // Sunday
		expect(weekDayIndex('2024-06-17')).toBe(1); // Monday
	});
});
