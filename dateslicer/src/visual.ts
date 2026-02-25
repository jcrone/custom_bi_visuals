"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import IVisualEventService = powerbi.extensibility.IVisualEventService;
import FilterAction = powerbi.FilterAction;

import { VisualFormattingSettingsModel } from "./settings";
import { CalendarRenderer, CalendarCallbacks } from "./calendarRenderer";
import {
    today, stripTime, formatDate, parseDate, isSameDay,
    getPresetRange, getDaysUpToToday, getDaysStartingToday,
    PresetKey, DateRange
} from "./dateUtils";

interface ColumnTarget {
    table: string;
    column: string;
}

export class Visual implements IVisual {
    private host: IVisualHost;
    private events: IVisualEventService;
    private target: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private renderer: CalendarRenderer;

    // State
    private viewYear: number;
    private viewMonth: number;
    private rangeStart: Date | null = null;
    private rangeEnd: Date | null = null;
    private isRangeMode: boolean = true;
    private clickState: "first" | "second" = "first";
    private columnTarget: ColumnTarget | null = null;
    private minDate: Date | null = null;
    private maxDate: Date | null = null;
    private initialized: boolean = false;
    private filterRestored: boolean = false;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.events = options.host.eventService;
        this.target = options.element;
        this.formattingSettingsService = new FormattingSettingsService();

        const t = today();
        this.viewYear = t.getFullYear();
        this.viewMonth = t.getMonth();

        const callbacks: CalendarCallbacks = {
            onPreset: (key: PresetKey) => this.handlePreset(key),
            onDayClick: (date: Date) => this.handleDayClick(date),
            onTodayClick: () => this.handlePreset("today"),
            onPrevMonth: () => this.navigateMonth(-1),
            onNextMonth: () => this.navigateMonth(1),
            onMonthSelect: (m: number) => { this.viewMonth = m; this.renderCalendar(); },
            onYearSelect: (y: number) => { this.viewYear = y; this.renderCalendar(); },
            onDateRangeToggle: (enabled: boolean) => {
                this.isRangeMode = enabled;
                if (!enabled && this.rangeStart) {
                    this.rangeEnd = this.rangeStart;
                }
                this.renderCalendar();
                this.applyFilter();
            },
            onDaysUpToToday: (n: number) => {
                const range = getDaysUpToToday(n);
                this.setRange(range);
            },
            onDaysStartingToday: (n: number) => {
                const range = getDaysStartingToday(n);
                this.setRange(range);
            },
            onStartDateInput: (val: string) => {
                const d = parseDate(val);
                if (d) {
                    this.rangeStart = d;
                    if (!this.rangeEnd || d > this.rangeEnd) this.rangeEnd = d;
                    this.viewYear = d.getFullYear();
                    this.viewMonth = d.getMonth();
                    this.renderCalendar();
                    this.applyFilter();
                }
            },
            onEndDateInput: (val: string) => {
                const d = parseDate(val);
                if (d) {
                    this.rangeEnd = d;
                    if (!this.rangeStart || d < this.rangeStart) this.rangeStart = d;
                    this.renderCalendar();
                    this.applyFilter();
                }
            },
        };

        this.renderer = new CalendarRenderer(this.target, callbacks);
    }

    public update(options: VisualUpdateOptions): void {
        this.events.renderingStarted(options);
        if (!options.dataViews || !options.dataViews[0]) {
            this.events.renderingFinished(options);
            return;
        }

        const dv = options.dataViews[0];
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel, dv
        );

        // Extract column target
        if (dv.categorical && dv.categorical.categories && dv.categorical.categories.length > 0) {
            const cat = dv.categorical.categories[0];
            const qn = cat.source.queryName;
            if (qn) {
                const parts = qn.split(".");
                this.columnTarget = {
                    table: parts[0],
                    column: parts.length > 1 ? parts[1] : parts[0]
                };
            }

            // Determine min/max dates from data
            const values = cat.values as any[];
            if (values && values.length > 0) {
                let min: Date | null = null;
                let max: Date | null = null;
                for (const v of values) {
                    if (v == null) continue;
                    const d = new Date(v);
                    if (isNaN(d.getTime())) continue;
                    const ds = stripTime(d);
                    if (!min || ds < min) min = ds;
                    if (!max || ds > max) max = ds;
                }
                this.minDate = min;
                this.maxDate = max;
            }
        }

        // Restore filter from jsonFilters on first load
        if (!this.filterRestored) {
            this.filterRestored = true;
            const filters = options.jsonFilters as any[];
            if (filters && filters.length > 0) {
                const f = filters[0];
                if (f && f.conditions && f.conditions.length >= 1) {
                    for (const cond of f.conditions) {
                        if (cond.operator === "GreaterThanOrEqual" && cond.value != null) {
                            this.rangeStart = stripTime(new Date(cond.value));
                        }
                        if (cond.operator === "LessThanOrEqual" && cond.value != null) {
                            this.rangeEnd = stripTime(new Date(cond.value));
                        }
                    }
                    if (this.rangeStart) {
                        this.viewYear = this.rangeStart.getFullYear();
                        this.viewMonth = this.rangeStart.getMonth();
                    }
                }
            } else if (!this.initialized) {
                // Apply default preset if configured
                const preset = String(this.formattingSettings.calendarCard.defaultPreset.value.value);
                if (preset && preset !== "none") {
                    const firstDay = parseInt(String(this.formattingSettings.calendarCard.firstDayOfWeek.value.value), 10);
                    const range = getPresetRange(preset as PresetKey, firstDay, this.minDate || undefined);
                    this.rangeStart = range.start;
                    this.rangeEnd = range.end;
                    this.viewYear = range.start.getFullYear();
                    this.viewMonth = range.start.getMonth();
                    this.applyFilter();
                }
            }
            this.initialized = true;
        }

        // Apply custom CSS properties from appearance settings
        const accent = this.formattingSettings.appearanceCard.accentColor.value.value;
        const bg = this.formattingSettings.appearanceCard.backgroundColor.value.value;
        const text = this.formattingSettings.appearanceCard.textColor.value.value;
        const border = this.formattingSettings.appearanceCard.borderColor.value.value;

        this.target.style.setProperty("--ds-accent", accent);
        this.target.style.setProperty("--ds-bg", bg);
        this.target.style.setProperty("--ds-text", text);
        this.target.style.setProperty("--ds-border", border);

        // Display mode
        const displayMode = String(this.formattingSettings.calendarCard.displayMode.value.value) as "expanded" | "compact";
        this.renderer.setDisplayMode(displayMode);

        // Responsive
        const vp = options.viewport;
        this.renderer.setCompact(vp.width < 350 || vp.height < 300);

        this.renderCalendar();
        this.events.renderingFinished(options);
    }

    private renderCalendar(): void {
        const firstDay = this.formattingSettings
            ? parseInt(String(this.formattingSettings.calendarCard.firstDayOfWeek.value.value), 10)
            : 0;
        const showSidebar = this.formattingSettings
            ? this.formattingSettings.calendarCard.showSidebar.value
            : true;

        const minYear = this.minDate ? this.minDate.getFullYear() : this.viewYear - 10;
        const maxYear = this.maxDate ? this.maxDate.getFullYear() : this.viewYear + 10;

        this.renderer.render(
            this.viewYear,
            this.viewMonth,
            firstDay,
            this.rangeStart,
            this.rangeEnd,
            this.isRangeMode,
            showSidebar,
            minYear,
            maxYear
        );
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
                return; // Don't apply filter yet - wait for second click
            } else {
                if (d < this.rangeStart!) {
                    this.rangeEnd = this.rangeStart;
                    this.rangeStart = d;
                } else {
                    this.rangeEnd = d;
                }
                this.clickState = "first";
            }
        }

        this.renderCalendar();
        this.applyFilter();
    }

    private handlePreset(key: PresetKey): void {
        const firstDay = this.formattingSettings
            ? parseInt(String(this.formattingSettings.calendarCard.firstDayOfWeek.value.value), 10)
            : 0;
        const range = getPresetRange(key, firstDay, this.minDate || undefined);
        this.setRange(range);
    }

    private setRange(range: DateRange): void {
        this.rangeStart = range.start;
        this.rangeEnd = range.end;
        this.viewYear = range.start.getFullYear();
        this.viewMonth = range.start.getMonth();
        this.clickState = "first";
        this.renderCalendar();
        this.applyFilter();
    }

    private applyFilter(): void {
        if (!this.columnTarget || !this.rangeStart) return;

        const end = this.rangeEnd || this.rangeStart;

        // Set end to 23:59:59.999 so the filter includes all timestamps on the end date
        const endOfDay = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);

        const filter: any = {
            $schema: "https://powerbi.com/product/schema#advanced",
            filterType: 0, // AdvancedFilter
            target: {
                table: this.columnTarget.table,
                column: this.columnTarget.column
            },
            logicalOperator: "And",
            conditions: [
                { operator: "GreaterThanOrEqual", value: this.rangeStart.toISOString() },
                { operator: "LessThanOrEqual", value: endOfDay.toISOString() }
            ]
        };

        this.host.applyJsonFilter(filter, "general", "filter", FilterAction.merge);
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
        this.renderCalendar();
    }

    public destroy(): void {
        this.renderer.destroy();
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
