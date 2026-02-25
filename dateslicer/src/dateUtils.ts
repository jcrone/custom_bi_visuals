export interface CalendarDay {
    date: Date;
    day: number;
    isCurrentMonth: boolean;
    isToday: boolean;
    isInRange: boolean;
    isRangeStart: boolean;
    isRangeEnd: boolean;
}

export interface DateRange {
    start: Date;
    end: Date;
}

export function today(): Date {
    const d = new Date();
    return stripTime(d);
}

export function stripTime(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatDate(d: Date): string {
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${mm}/${dd}/${d.getFullYear()}`;
}

export function parseDate(s: string): Date | null {
    const parts = s.split("/");
    if (parts.length !== 3) return null;
    const m = parseInt(parts[0], 10) - 1;
    const d = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (isNaN(m) || isNaN(d) || isNaN(y)) return null;
    const date = new Date(y, m, d);
    if (date.getMonth() !== m || date.getDate() !== d) return null;
    return date;
}

export function isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

export function isInRange(d: Date, start: Date, end: Date): boolean {
    const t = stripTime(d).getTime();
    return t >= stripTime(start).getTime() && t <= stripTime(end).getTime();
}

export function addDays(d: Date, n: number): Date {
    const r = new Date(d);
    r.setDate(r.getDate() + n);
    return stripTime(r);
}

export function startOfWeek(d: Date, firstDay: number): Date {
    const result = new Date(d);
    const day = result.getDay();
    const diff = (day - firstDay + 7) % 7;
    result.setDate(result.getDate() - diff);
    return stripTime(result);
}

export function endOfWeek(d: Date, firstDay: number): Date {
    const s = startOfWeek(d, firstDay);
    return addDays(s, 6);
}

export function startOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export type PresetKey = "yesterday" | "today" | "minDate" | "thisWeek" | "lastWeek" | "thisMonth";

export function getPresetRange(key: PresetKey, firstDay: number, minDate?: Date): DateRange {
    const t = today();
    switch (key) {
        case "yesterday": {
            const y = addDays(t, -1);
            return { start: y, end: y };
        }
        case "today":
            return { start: t, end: t };
        case "minDate": {
            const min = minDate || t;
            return { start: min, end: t };
        }
        case "thisWeek":
            return { start: startOfWeek(t, firstDay), end: endOfWeek(t, firstDay) };
        case "lastWeek": {
            const lastWeekDay = addDays(t, -7);
            return { start: startOfWeek(lastWeekDay, firstDay), end: endOfWeek(lastWeekDay, firstDay) };
        }
        case "thisMonth":
            return { start: startOfMonth(t), end: endOfMonth(t) };
        default:
            return { start: t, end: t };
    }
}

export function getDaysUpToToday(n: number): DateRange {
    const t = today();
    return { start: addDays(t, -(n - 1)), end: t };
}

export function getDaysStartingToday(n: number): DateRange {
    const t = today();
    return { start: t, end: addDays(t, n - 1) };
}

export function generateMonthGrid(
    year: number,
    month: number,
    firstDay: number,
    rangeStart: Date | null,
    rangeEnd: Date | null
): CalendarDay[][] {
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const t = today();

    const gridStart = startOfWeek(firstOfMonth, firstDay);

    const weeks: CalendarDay[][] = [];
    let current = new Date(gridStart);

    for (let w = 0; w < 6; w++) {
        const week: CalendarDay[] = [];
        for (let d = 0; d < 7; d++) {
            const date = new Date(current);
            const isCurrentMonth = date.getMonth() === month;
            const isTodayFlag = isSameDay(date, t);
            let inRange = false;
            let isStart = false;
            let isEnd = false;

            if (rangeStart && rangeEnd) {
                inRange = isInRange(date, rangeStart, rangeEnd);
                isStart = isSameDay(date, rangeStart);
                isEnd = isSameDay(date, rangeEnd);
            }

            week.push({
                date,
                day: date.getDate(),
                isCurrentMonth,
                isToday: isTodayFlag,
                isInRange: inRange,
                isRangeStart: isStart,
                isRangeEnd: isEnd,
            });
            current.setDate(current.getDate() + 1);
        }
        weeks.push(week);

        if (current > lastOfMonth && current.getDay() === firstDay) break;
    }

    return weeks;
}

export const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

export const DAY_HEADERS_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_HEADERS_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
