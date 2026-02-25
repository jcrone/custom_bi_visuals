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
export declare function today(): Date;
export declare function stripTime(d: Date): Date;
export declare function formatDate(d: Date): string;
export declare function parseDate(s: string): Date | null;
export declare function isSameDay(a: Date, b: Date): boolean;
export declare function isInRange(d: Date, start: Date, end: Date): boolean;
export declare function addDays(d: Date, n: number): Date;
export declare function startOfWeek(d: Date, firstDay: number): Date;
export declare function endOfWeek(d: Date, firstDay: number): Date;
export declare function startOfMonth(d: Date): Date;
export declare function endOfMonth(d: Date): Date;
export type PresetKey = "yesterday" | "today" | "minDate" | "thisWeek" | "lastWeek" | "thisMonth";
export declare function getPresetRange(key: PresetKey, firstDay: number, minDate?: Date): DateRange;
export declare function getDaysUpToToday(n: number): DateRange;
export declare function getDaysStartingToday(n: number): DateRange;
export declare function generateMonthGrid(year: number, month: number, firstDay: number, rangeStart: Date | null, rangeEnd: Date | null): CalendarDay[][];
export declare const MONTH_NAMES: string[];
export declare const DAY_HEADERS_SUN: string[];
export declare const DAY_HEADERS_MON: string[];
