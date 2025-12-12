import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

const TZ_COOKIE = 'tz';
const TZ_OFFSET_COOKIE = 'tz_offset';
const DEFAULT_TZ = 'UTC';
const DEFAULT_OFFSET_MINUTES = 0; // UTC
const MS_PER_DAY = 86_400_000;

export type TimeSettings = {
	timeZone: string;
	offsetMinutes: number; // Positive for east (UTC+), negative for west
};

const isValidTimeZone = (tz?: string | null): tz is string => {
	if (!tz) return false;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: tz }).format();
		return true;
	} catch {
		return false;
	}
};

const decodeCookieValue = (raw?: string | null) => {
	if (!raw) return '';
	try {
		return decodeURIComponent(raw);
	} catch {
		return raw;
	}
};

const parseOffset = (raw?: string | null) => {
	const parsed = Number(raw);
	return Number.isFinite(parsed) ? Math.round(parsed) : DEFAULT_OFFSET_MINUTES;
};

export const normalizeTimeZone = (tz?: string | null): string =>
	isValidTimeZone(tz) ? tz! : DEFAULT_TZ;

export const normalizeOffset = (offsetMinutes?: number | null) =>
	Number.isFinite(offsetMinutes)
		? Math.round(offsetMinutes!)
		: DEFAULT_OFFSET_MINUTES;

export const readTimeZoneFromCookieHeader = (
	cookieHeader?: string | null
): string => {
	if (!cookieHeader) return DEFAULT_TZ;
	const parts = cookieHeader.split(';').map((c) => c.trim());
	const raw = parts.find((c) => c.startsWith(`${TZ_COOKIE}=`))?.split('=')[1];
	return normalizeTimeZone(decodeCookieValue(raw));
};

export const readOffsetFromCookieHeader = (
	cookieHeader?: string | null
): number => {
	if (!cookieHeader) return DEFAULT_OFFSET_MINUTES;
	const parts = cookieHeader.split(';').map((c) => c.trim());
	const raw = parts
		.find((c) => c.startsWith(`${TZ_OFFSET_COOKIE}=`))
		?.split('=')[1];
	return normalizeOffset(parseOffset(decodeCookieValue(raw)));
};

export const readTimeZoneFromCookies = (cookies?: {
	get: (name: string) => { value?: string } | undefined;
}): string => {
	const raw = cookies?.get(TZ_COOKIE)?.value;
	return normalizeTimeZone(decodeCookieValue(raw));
};

export const readOffsetFromCookies = (cookies?: {
	get: (name: string) => { value?: string } | undefined;
}): number => {
	const raw = cookies?.get(TZ_OFFSET_COOKIE)?.value;
	return normalizeOffset(parseOffset(decodeCookieValue(raw)));
};

export const resolveRequestTimeSettings = (opts: {
	cookieHeader?: string | null;
	cookies?: { get: (name: string) => { value?: string } | undefined };
}): TimeSettings => {
	if (opts.cookies) {
		return {
			timeZone: readTimeZoneFromCookies(opts.cookies),
			offsetMinutes: readOffsetFromCookies(opts.cookies),
		};
	}

	return {
		timeZone: readTimeZoneFromCookieHeader(opts.cookieHeader),
		offsetMinutes: readOffsetFromCookieHeader(opts.cookieHeader),
	};
};

export const formatDateInTimeZone = (
	input: Date | number | string,
	timeZone: string
): string => {
	const tz = normalizeTimeZone(timeZone);
	const date = typeof input === 'string' ? new Date(input) : new Date(input);
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: tz,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(date);
};

// Convert a UTC timestamp to the user's local date key (YYYY-MM-DD)
const toUtcDayjs = (input: Date | number | string) => {
	if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
		return dayjs.utc(`${input}T00:00:00Z`);
	}
	return dayjs.utc(input);
};

export const toDateKey = (
	input: Date | number | string,
	offsetMinutes = DEFAULT_OFFSET_MINUTES
): string => {
	const utcDate = toUtcDayjs(input);
	if (!utcDate.isValid()) return '';
	return utcDate.add(offsetMinutes, 'minute').format('YYYY-MM-DD');
};

export const getTodayKey = (offsetMinutes = DEFAULT_OFFSET_MINUTES): string =>
	toDateKey(Date.now(), offsetMinutes);

export const buildDateKeys = (
	days: number,
	offsetMinutes = DEFAULT_OFFSET_MINUTES,
	endUtcMs = Date.now()
): string[] => {
	const keys: string[] = [];
	for (let i = 0; i < days; i++) {
		const utcMs = endUtcMs - i * MS_PER_DAY;
		keys.push(toDateKey(utcMs, offsetMinutes));
	}
	return keys;
};

// Return the UTC timestamp (ms) for local day start (00:00)
export const startOfDayUtcMs = (
	utcMs = Date.now(),
	offsetMinutes = DEFAULT_OFFSET_MINUTES
): number => {
	const localMs = utcMs + offsetMinutes * 60_000;
	const localStart = Math.floor(localMs / MS_PER_DAY) * MS_PER_DAY;
	return localStart - offsetMinutes * 60_000;
};

export const addDaysUtc = (utcMs: number, days: number) =>
	utcMs + days * MS_PER_DAY;

export const formatWeekdayLabel = (
	dateKey: string,
	timeZone: string,
	locale = 'en-US'
) => {
	const tz = normalizeTimeZone(timeZone);
	const date = new Date(`${dateKey}T00:00:00Z`);
	try {
		return new Intl.DateTimeFormat(locale, {
			weekday: 'short',
			timeZone: tz,
		}).format(date);
	} catch {
		/* c8 ignore start */
		return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
		/* c8 ignore end */
	}
};

export const formatTimeInTimeZone = (
	iso: string,
	timeZone: string,
	locale = 'en-US'
) => {
	const tz = normalizeTimeZone(timeZone);
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	try {
		return new Intl.DateTimeFormat(locale, {
			timeZone: tz,
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
		}).format(d);
	} catch {
		/* c8 ignore start */
		return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
		/* c8 ignore end */
	}
};

export const weekDayIndex = (dateKey: string) => {
	const d = new Date(`${dateKey}T00:00:00Z`);
	return d.getUTCDay();
};

export {
	TZ_COOKIE,
	TZ_OFFSET_COOKIE,
	DEFAULT_TZ,
	DEFAULT_OFFSET_MINUTES,
	MS_PER_DAY,
};
