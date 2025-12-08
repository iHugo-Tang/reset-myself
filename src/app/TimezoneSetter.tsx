'use client';

import { useEffect } from 'react';

const TZ_COOKIE = 'tz';
const OFFSET_COOKIE = 'tz_offset';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const readCookie = (name: string) => {
	return document.cookie
		.split(';')
		.map((c) => c.trim())
		.find((c) => c.startsWith(`${name}=`))
		?.split('=')[1];
};

const writeCookie = (name: string, value: string) => {
	const existingRaw = readCookie(name);
	const current = existingRaw ? decodeURIComponent(existingRaw) : '';
	if (current === value) return;

	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE}; samesite=lax`;
};

export function TimezoneSetter() {
	useEffect(() => {
		try {
			const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const offsetMinutes = -new Date().getTimezoneOffset(); // 正值表示东区（UTC+）

			if (tz) writeCookie(TZ_COOKIE, tz);
			writeCookie(OFFSET_COOKIE, String(offsetMinutes));
		} catch (error) {
			console.error('timezone cookie write failed', error);
		}
	}, []);

	return null;
}

export default TimezoneSetter;
