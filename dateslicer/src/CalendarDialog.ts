"use strict";

import powerbi from "powerbi-visuals-api";
import DialogConstructorOptions = powerbi.extensibility.visual.DialogConstructorOptions;
import IDialogHost = powerbi.extensibility.visual.IDialogHost;

import "./../style/visual.less";

import { CalendarRenderer, CalendarCallbacks } from "./calendarRenderer";
import { CalendarDialogInitialState, CalendarDialogResult } from "./dialogTypes";
import {
    stripTime, getPresetRange, getDaysUpToToday, getDaysStartingToday,
    parseDate, PresetKey, DateRange
} from "./dateUtils";

class CalendarDialog {
    static id = "CalendarDialog";

    private host: IDialogHost;
    private renderer: CalendarRenderer;

    private viewYear: number;
    private viewMonth: number;
    private rangeStart: Date | null = null;
    private rangeEnd: Date | null = null;
    private isRangeMode: boolean = true;
    private clickState: "first" | "second" = "first";
    private firstDayOfWeek: number = 0;
    private showSidebar: boolean = true;
    private minYear: number;
    private maxYear: number;
    private minDate: Date | null = null;

    constructor(options: DialogConstructorOptions, initialState: CalendarDialogInitialState) {
        this.host = options.host;

        // Restore state from the visual
        this.viewYear = initialState.viewYear;
        this.viewMonth = initialState.viewMonth;
        this.isRangeMode = initialState.isRangeMode;
        this.firstDayOfWeek = initialState.firstDayOfWeek;
        this.showSidebar = initialState.showSidebar;
        this.minYear = initialState.minYear;
        this.maxYear = initialState.maxYear;

        if (initialState.rangeStartISO) {
            this.rangeStart = stripTime(new Date(initialState.rangeStartISO));
        }
        if (initialState.rangeEndISO) {
            this.rangeEnd = stripTime(new Date(initialState.rangeEndISO));
        }
        if (initialState.minDateISO) {
            this.minDate = stripTime(new Date(initialState.minDateISO));
        }

        // Apply appearance CSS custom properties
        const el = options.element;
        el.style.setProperty("--ds-accent", initialState.accentColor);
        el.style.setProperty("--ds-bg", initialState.bgColor);
        el.style.setProperty("--ds-text", initialState.textColor);
        el.style.setProperty("--ds-border", initialState.borderColor);

        const callbacks: CalendarCallbacks = {
            onPreset: (key: PresetKey) => this.handlePreset(key),
            onDayClick: (date: Date) => this.handleDayClick(date),
            onTodayClick: () => this.handlePreset("today"),
            onPrevMonth: () => this.navigateMonth(-1),
            onNextMonth: () => this.navigateMonth(1),
            onMonthSelect: (m: number) => { this.viewMonth = m; this.renderAndSync(); },
            onYearSelect: (y: number) => { this.viewYear = y; this.renderAndSync(); },
            onDateRangeToggle: (enabled: boolean) => {
                this.isRangeMode = enabled;
                if (!enabled && this.rangeStart) {
                    this.rangeEnd = this.rangeStart;
                }
                this.renderAndSync();
            },
            onDaysUpToToday: (n: number) => {
                this.setRange(getDaysUpToToday(n));
            },
            onDaysStartingToday: (n: number) => {
                this.setRange(getDaysStartingToday(n));
            },
            onStartDateInput: (val: string) => {
                const d = parseDate(val);
                if (d) {
                    this.rangeStart = d;
                    if (!this.rangeEnd || d > this.rangeEnd) this.rangeEnd = d;
                    this.viewYear = d.getFullYear();
                    this.viewMonth = d.getMonth();
                    this.renderAndSync();
                }
            },
            onEndDateInput: (val: string) => {
                const d = parseDate(val);
                if (d) {
                    this.rangeEnd = d;
                    if (!this.rangeStart || d < this.rangeStart) this.rangeStart = d;
                    this.renderAndSync();
                }
            },
        };

        // Create renderer in "expanded" mode inside the dialog element
        this.renderer = new CalendarRenderer(el, callbacks);
        this.renderer.setDisplayMode("expanded");
        this.renderCalendar();
        this.syncResult();
    }

    private renderCalendar(): void {
        this.renderer.render(
            this.viewYear,
            this.viewMonth,
            this.firstDayOfWeek,
            this.rangeStart,
            this.rangeEnd,
            this.isRangeMode,
            this.showSidebar,
            this.minYear,
            this.maxYear
        );
    }

    private renderAndSync(): void {
        this.renderCalendar();
        this.syncResult();
    }

    private syncResult(): void {
        const result: CalendarDialogResult = {
            rangeStartISO: this.rangeStart ? this.rangeStart.toISOString() : null,
            rangeEndISO: this.rangeEnd ? this.rangeEnd.toISOString() : null,
            isRangeMode: this.isRangeMode,
            viewYear: this.viewYear,
            viewMonth: this.viewMonth,
        };
        this.host.setResult(result);
    }

    private handleDayClick(date: Date): void {
        const d = stripTime(date);

        if (!this.isRangeMode) {
            this.rangeStart = d;
            this.rangeEnd = d;
        } else {
            if (this.clickState === "first") {
                this.rangeStart = d;
                this.rangeEnd = null;
                this.clickState = "second";
                this.renderCalendar();
                return;
            } else {
                if (this.rangeStart && d < this.rangeStart) {
                    this.rangeEnd = this.rangeStart;
                    this.rangeStart = d;
                } else {
                    this.rangeEnd = d;
                }
                this.clickState = "first";
            }
        }

        this.renderAndSync();
    }

    private handlePreset(key: PresetKey): void {
        const range = getPresetRange(key, this.firstDayOfWeek, this.minDate || undefined);
        this.setRange(range);
    }

    private setRange(range: DateRange): void {
        this.rangeStart = range.start;
        this.rangeEnd = range.end;
        this.viewYear = range.start.getFullYear();
        this.viewMonth = range.start.getMonth();
        this.clickState = "first";
        this.renderAndSync();
    }

    private navigateMonth(delta: number): void {
        this.viewMonth += delta;
        if (this.viewMonth > 11) {
            this.viewMonth = 0;
            this.viewYear++;
        } else if (this.viewMonth < 0) {
            this.viewMonth = 11;
            this.viewYear--;
        }
        this.renderAndSync();
    }
}

// Self-register so the PBI plugin's createModalDialog can find it
if (!globalThis.dialogRegistry) {
    globalThis.dialogRegistry = {};
}
globalThis.dialogRegistry[CalendarDialog.id] = CalendarDialog;

export default CalendarDialog;
