/**
 * Timezone utility for consistent time handling across the UI.
 * All factory operations are in America/Chicago (Central Time).
 */

import { format, parse } from 'date-fns';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

// Factory timezone - all times should be interpreted/displayed in this zone
export const FACTORY_TIMEZONE = 'America/Chicago';

/**
 * Format an ISO timestamp for display in factory timezone.
 * @example formatForDisplay('2026-01-19T16:00:00Z') => 'Jan 19, 10:00' (in Chicago)
 */
export const formatForDisplay = (isoString: string, formatStr: string = 'MMM d, HH:mm'): string => {
    try {
        return formatInTimeZone(new Date(isoString), FACTORY_TIMEZONE, formatStr);
    } catch {
        return isoString;
    }
};

/**
 * Format an ISO timestamp as datetime-local input value (YYYY-MM-DDTHH:mm) in factory timezone.
 * @example toDatetimeLocalValue('2026-01-19T16:00:00Z') => '2026-01-19T10:00' (in Chicago)
 */
export const toDatetimeLocalValue = (isoString: string): string => {
    try {
        return formatInTimeZone(new Date(isoString), FACTORY_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
    } catch {
        return '';
    }
};

/**
 * Convert datetime-local input value to ISO string, interpreting the input as factory timezone.
 * @example fromDatetimeLocalValue('2026-01-19T10:00') => '2026-01-19T16:00:00.000Z' (Chicago 10 AM = UTC 4 PM in winter)
 */
export const fromDatetimeLocalValue = (localValue: string): string => {
    try {
        if (!localValue) return '';
        // Parse the datetime-local value as if it's in factory timezone
        const date = fromZonedTime(localValue, FACTORY_TIMEZONE);
        return date.toISOString();
    } catch {
        return '';
    }
};

/**
 * Get current time as datetime-local value in factory timezone.
 * @example getNowAsDatetimeLocal() => '2026-01-19T10:00'
 */
export const getNowAsDatetimeLocal = (): string => {
    return formatInTimeZone(new Date(), FACTORY_TIMEZONE, "yyyy-MM-dd'T'HH:mm");
};

/**
 * Get current time as ISO string (always UTC).
 */
export const getNowAsIso = (): string => {
    return new Date().toISOString();
};

/**
 * Format time-only input (HH:mm) to full ISO, using a reference date and factory timezone.
 * @example timeToIso('10:00', '2026-01-19') => '2026-01-19T16:00:00.000Z'
 */
export const timeToIso = (time: string, dateStr: string): string => {
    try {
        const localDatetime = `${dateStr}T${time.padStart(5, '0')}`;
        return fromDatetimeLocalValue(localDatetime);
    } catch {
        return '';
    }
};

/**
 * Extract date part from ISO string in factory timezone.
 * @example getDateInFactoryTz('2026-01-19T16:00:00Z') => '2026-01-19'
 */
export const getDateInFactoryTz = (isoString: string): string => {
    try {
        return formatInTimeZone(new Date(isoString), FACTORY_TIMEZONE, 'yyyy-MM-dd');
    } catch {
        return '';
    }
};

/**
 * Extract time part (HH:mm) from ISO string in factory timezone.
 * @example getTimeInFactoryTz('2026-01-19T16:00:00Z') => '10:00'
 */
export const getTimeInFactoryTz = (isoString: string): string => {
    try {
        return formatInTimeZone(new Date(isoString), FACTORY_TIMEZONE, 'HH:mm');
    } catch {
        return '';
    }
};

/**
 * Get timezone abbreviation for display (CST/CDT).
 */
export const getTimezoneAbbr = (): string => {
    try {
        return formatInTimeZone(new Date(), FACTORY_TIMEZONE, 'zzz');
    } catch {
        return 'CT';
    }
};
