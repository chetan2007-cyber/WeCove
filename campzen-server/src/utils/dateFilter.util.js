/**
 * Date Filter and Timezone Utility for Indian Campus Operations (IST / UTC+05:30)
 * Computes exact calendar boundaries in IST and returns UTC Date objects for MongoDB queries.
 */

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds

/**
 * Returns the current date broken down in IST (year, month: 0-11, day: 1-31, dayOfWeek: 0-6 where 0=Sun)
 */
function getISTDateParts(date = new Date()) {
    const istTime = new Date(date.getTime() + IST_OFFSET_MS);
    return {
        year: istTime.getUTCFullYear(),
        month: istTime.getUTCMonth(),
        date: istTime.getUTCDate(),
        day: istTime.getUTCDay()
    };
}

/**
 * Converts IST year, month (0-11), date (1-31), hour, minute, second, ms to UTC Date
 */
function istPartsToUTCDate(year, month, date, hours = 0, minutes = 0, seconds = 0, ms = 0) {
    // Construct Date in UTC representing the IST wall clock
    const utcEpoch = Date.UTC(year, month, date, hours, minutes, seconds, ms);
    // Subtract IST offset to get actual UTC
    return new Date(utcEpoch - IST_OFFSET_MS);
}

/**
 * Parse an ISO or YYYY-MM-DD date string into IST calendar day boundary
 */
function parseDateBoundary(dateStr, isEndOfDay = false) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;

    // If string is YYYY-MM-DD
    const match = String(dateStr).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) - 1;
        const date = parseInt(match[3], 10);
        if (isEndOfDay) {
            return istPartsToUTCDate(year, month, date, 23, 59, 59, 999);
        }
        return istPartsToUTCDate(year, month, date, 0, 0, 0, 0);
    }

    // Otherwise use parsed date in IST
    const parts = getISTDateParts(d);
    if (isEndOfDay) {
        return istPartsToUTCDate(parts.year, parts.month, parts.date, 23, 59, 59, 999);
    }
    return istPartsToUTCDate(parts.year, parts.month, parts.date, 0, 0, 0, 0);
}

/**
 * Resolves a date query into { startUTC, endUTC }
 * @param {Object} params
 * @param {string} [params.datePreset] - 'today' | 'yesterday' | 'last7days' | 'thisWeek' | 'thisMonth'
 * @param {string} [params.startDate] - Custom ISO/YYYY-MM-DD start date
 * @param {string} [params.endDate] - Custom ISO/YYYY-MM-DD end date
 */
function resolveDateRange({ datePreset, startDate, endDate }) {
    const now = new Date();
    const { year, month, date, day } = getISTDateParts(now);

    if (datePreset) {
        const preset = String(datePreset).toLowerCase().trim();

        if (preset === 'today') {
            const startUTC = istPartsToUTCDate(year, month, date, 0, 0, 0, 0);
            const endUTC = istPartsToUTCDate(year, month, date, 23, 59, 59, 999);
            return { startUTC, endUTC, preset: 'today' };
        }

        if (preset === 'yesterday') {
            // Subtract 1 day in IST
            const yesterdayDate = new Date(Date.UTC(year, month, date - 1));
            const yYear = yesterdayDate.getUTCFullYear();
            const yMonth = yesterdayDate.getUTCMonth();
            const yDate = yesterdayDate.getUTCDate();

            const startUTC = istPartsToUTCDate(yYear, yMonth, yDate, 0, 0, 0, 0);
            const endUTC = istPartsToUTCDate(yYear, yMonth, yDate, 23, 59, 59, 999);
            return { startUTC, endUTC, preset: 'yesterday' };
        }

        if (preset === 'last7days') {
            // Previous 7 calendar days up to end of today
            const pastDate = new Date(Date.UTC(year, month, date - 6));
            const startUTC = istPartsToUTCDate(pastDate.getUTCFullYear(), pastDate.getUTCMonth(), pastDate.getUTCDate(), 0, 0, 0, 0);
            const endUTC = istPartsToUTCDate(year, month, date, 23, 59, 59, 999);
            return { startUTC, endUTC, preset: 'last7days' };
        }

        if (preset === 'thisweek') {
            // Monday-to-Sunday definition of the week
            // In JS getUTCDay: 0=Sun, 1=Mon, ..., 6=Sat
            const diffToMonday = day === 0 ? -6 : 1 - day;
            const monday = new Date(Date.UTC(year, month, date + diffToMonday));
            const sunday = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + 6));

            const startUTC = istPartsToUTCDate(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate(), 0, 0, 0, 0);
            const endUTC = istPartsToUTCDate(sunday.getUTCFullYear(), sunday.getUTCMonth(), sunday.getUTCDate(), 23, 59, 59, 999);
            return { startUTC, endUTC, preset: 'thisWeek' };
        }

        if (preset === 'thismonth') {
            // 1st of month to last day of month
            const firstDay = 1;
            const lastDayDate = new Date(Date.UTC(year, month + 1, 0)); // last day of current month
            const startUTC = istPartsToUTCDate(year, month, firstDay, 0, 0, 0, 0);
            const endUTC = istPartsToUTCDate(year, month, lastDayDate.getUTCDate(), 23, 59, 59, 999);
            return { startUTC, endUTC, preset: 'thisMonth' };
        }
    }

    if (startDate || endDate) {
        const startUTC = startDate ? parseDateBoundary(startDate, false) : null;
        const endUTC = endDate ? parseDateBoundary(endDate, true) : null;

        if (startUTC && isNaN(startUTC.getTime())) {
            throw new Error('Invalid startDate format');
        }
        if (endUTC && isNaN(endUTC.getTime())) {
            throw new Error('Invalid endDate format');
        }
        if (startUTC && endUTC && startUTC.getTime() > endUTC.getTime()) {
            throw new Error('Start date cannot be after end date');
        }

        return { startUTC, endUTC, preset: 'custom' };
    }

    return null;
}

module.exports = {
    IST_OFFSET_MS,
    getISTDateParts,
    istPartsToUTCDate,
    parseDateBoundary,
    resolveDateRange
};
