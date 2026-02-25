import {
    CalendarDay, DateRange, PresetKey,
    formatDate, generateMonthGrid,
    MONTH_NAMES, DAY_HEADERS_SUN, DAY_HEADERS_MON
} from "./dateUtils";

export interface CalendarCallbacks {
    onPreset: (key: PresetKey) => void;
    onDayClick: (date: Date) => void;
    onTodayClick: () => void;
    onPrevMonth: () => void;
    onNextMonth: () => void;
    onMonthSelect: (month: number) => void;
    onYearSelect: (year: number) => void;
    onDateRangeToggle: (enabled: boolean) => void;
    onDaysUpToToday: (n: number) => void;
    onDaysStartingToday: (n: number) => void;
    onStartDateInput: (val: string) => void;
    onEndDateInput: (val: string) => void;
}

export class CalendarRenderer {
    private root: HTMLElement;
    private callbacks: CalendarCallbacks;

    // Cached DOM elements
    private pill: HTMLElement;
    private pillText: HTMLElement;
    private pillChevron: HTMLElement;
    private popup: HTMLElement;
    private popupBackdrop: HTMLElement;
    private wrapper: HTMLElement;
    private sidebar: HTMLElement;
    private mainPanel: HTMLElement;
    private gridBody: HTMLElement;
    private dayHeaders: HTMLElement;
    private startInput: HTMLInputElement;
    private endInput: HTMLInputElement;
    private dateRangeToggle: HTMLInputElement;
    private daysUpInput: HTMLInputElement;
    private daysStartInput: HTMLInputElement;
    private monthDropdown: HTMLSelectElement;
    private yearDropdown: HTMLSelectElement;

    private currentMode: "expanded" | "compact" = "expanded";
    private isPopupOpen: boolean = false;
    private cachedMinYear: number = 0;
    private cachedMaxYear: number = 0;

    constructor(root: HTMLElement, callbacks: CalendarCallbacks) {
        this.root = root;
        this.callbacks = callbacks;
        this.buildDOM();
    }

    private buildDOM(): void {
        this.root.innerHTML = "";

        // === PILL (compact mode trigger) ===
        this.pill = this.el("div", "ds-pill");
        this.pill.innerHTML = `<svg class="ds-pill__icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" stroke-width="1.5"/>
            <line x1="5" y1="1" x2="5" y2="3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="11" y1="1" x2="11" y2="3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`;
        this.pillText = this.el("span", "ds-pill__text");
        this.pillText.textContent = "Select date\u2026";
        this.pill.appendChild(this.pillText);
        this.pillChevron = this.el("span", "ds-pill__chevron");
        this.pillChevron.textContent = "\u25BE";
        this.pill.appendChild(this.pillChevron);
        this.pill.style.display = "none";

        this.pill.addEventListener("click", (e) => {
            e.stopPropagation();
            this.openPopup();
        });

        this.root.appendChild(this.pill);

        // === INLINE CONTAINER (used in expanded mode) ===
        // The wrapper lives here normally; in compact mode it moves into the popup
        this.wrapper = this.el("div", "ds-wrapper");

        // === SIDEBAR ===
        this.sidebar = this.el("div", "ds-sidebar");

        // Date Range toggle
        const toggleRow = this.el("div", "ds-toggle-row");
        this.dateRangeToggle = document.createElement("input");
        this.dateRangeToggle.type = "checkbox";
        this.dateRangeToggle.className = "ds-toggle";
        this.dateRangeToggle.checked = true;
        this.dateRangeToggle.addEventListener("change", () => {
            this.callbacks.onDateRangeToggle(this.dateRangeToggle.checked);
        });
        const toggleLabel = this.el("span", "ds-toggle-label");
        toggleLabel.textContent = "Date Range";
        toggleRow.appendChild(this.dateRangeToggle);
        toggleRow.appendChild(toggleLabel);
        this.sidebar.appendChild(toggleRow);

        // Preset buttons
        const presets: { key: PresetKey; label: string }[] = [
            { key: "yesterday", label: "Yesterday" },
            { key: "today", label: "Today" },
            { key: "minDate", label: "Min Date" },
            { key: "thisWeek", label: "This Week" },
            { key: "lastWeek", label: "Last Week" },
            { key: "thisMonth", label: "This Month" },
        ];

        for (const p of presets) {
            const btn = this.el("button", "ds-preset-btn");
            btn.textContent = p.label;
            btn.addEventListener("click", () => this.callbacks.onPreset(p.key));
            this.sidebar.appendChild(btn);
        }

        // Days up to today
        const daysUpRow = this.el("div", "ds-days-row");
        this.daysUpInput = document.createElement("input");
        this.daysUpInput.type = "number";
        this.daysUpInput.className = "ds-days-input";
        this.daysUpInput.min = "1";
        this.daysUpInput.value = "7";
        this.daysUpInput.addEventListener("change", () => {
            const n = parseInt(this.daysUpInput.value, 10);
            if (n > 0) this.callbacks.onDaysUpToToday(n);
        });
        const daysUpLabel = this.el("span", "ds-days-label");
        daysUpLabel.textContent = "days up to today";
        daysUpRow.appendChild(this.daysUpInput);
        daysUpRow.appendChild(daysUpLabel);
        this.sidebar.appendChild(daysUpRow);

        // Days starting today
        const daysStartRow = this.el("div", "ds-days-row");
        this.daysStartInput = document.createElement("input");
        this.daysStartInput.type = "number";
        this.daysStartInput.className = "ds-days-input";
        this.daysStartInput.min = "1";
        this.daysStartInput.value = "7";
        this.daysStartInput.addEventListener("change", () => {
            const n = parseInt(this.daysStartInput.value, 10);
            if (n > 0) this.callbacks.onDaysStartingToday(n);
        });
        const daysStartLabel = this.el("span", "ds-days-label");
        daysStartLabel.textContent = "days starting today";
        daysStartRow.appendChild(this.daysStartInput);
        daysStartRow.appendChild(daysStartLabel);
        this.sidebar.appendChild(daysStartRow);

        this.wrapper.appendChild(this.sidebar);

        // === MAIN PANEL ===
        this.mainPanel = this.el("div", "ds-main");

        // Top row: Today button + close button (compact popup)
        const topRow = this.el("div", "ds-top-row");

        const todayBtn = this.el("button", "ds-today-btn");
        todayBtn.textContent = "Today";
        todayBtn.addEventListener("click", () => this.callbacks.onTodayClick());
        topRow.appendChild(todayBtn);

        const closeBtn = this.el("button", "ds-close-btn");
        closeBtn.textContent = "\u2715";
        closeBtn.title = "Close";
        closeBtn.addEventListener("click", () => this.close());
        topRow.appendChild(closeBtn);

        this.mainPanel.appendChild(topRow);

        // Date inputs row
        const inputRow = this.el("div", "ds-input-row");

        this.startInput = document.createElement("input");
        this.startInput.type = "text";
        this.startInput.className = "ds-date-input";
        this.startInput.placeholder = "MM/DD/YYYY";
        this.startInput.addEventListener("change", () => {
            this.callbacks.onStartDateInput(this.startInput.value);
        });

        this.endInput = document.createElement("input");
        this.endInput.type = "text";
        this.endInput.className = "ds-date-input";
        this.endInput.placeholder = "MM/DD/YYYY";
        this.endInput.addEventListener("change", () => {
            this.callbacks.onEndDateInput(this.endInput.value);
        });

        inputRow.appendChild(this.startInput);
        inputRow.appendChild(this.endInput);
        this.mainPanel.appendChild(inputRow);

        // Month/year navigation
        const navRow = this.el("div", "ds-nav-row");

        const prevBtn = this.el("button", "ds-nav-btn");
        prevBtn.textContent = "\u276E";
        prevBtn.addEventListener("click", () => this.callbacks.onPrevMonth());

        this.monthDropdown = document.createElement("select");
        this.monthDropdown.className = "ds-month-select";
        for (let i = 0; i < 12; i++) {
            const opt = document.createElement("option");
            opt.value = String(i);
            opt.textContent = MONTH_NAMES[i];
            this.monthDropdown.appendChild(opt);
        }
        this.monthDropdown.addEventListener("change", () => {
            this.callbacks.onMonthSelect(parseInt(this.monthDropdown.value, 10));
        });

        this.yearDropdown = document.createElement("select");
        this.yearDropdown.className = "ds-year-select";
        this.yearDropdown.addEventListener("change", () => {
            this.callbacks.onYearSelect(parseInt(this.yearDropdown.value, 10));
        });

        const nextBtn = this.el("button", "ds-nav-btn");
        nextBtn.textContent = "\u276F";
        nextBtn.addEventListener("click", () => this.callbacks.onNextMonth());

        navRow.appendChild(prevBtn);
        navRow.appendChild(this.monthDropdown);
        navRow.appendChild(this.yearDropdown);
        navRow.appendChild(nextBtn);
        this.mainPanel.appendChild(navRow);

        // Day headers
        this.dayHeaders = this.el("div", "ds-day-headers");
        this.mainPanel.appendChild(this.dayHeaders);

        // Grid
        this.gridBody = this.el("div", "ds-grid");
        this.mainPanel.appendChild(this.gridBody);

        this.wrapper.appendChild(this.mainPanel);
        this.root.appendChild(this.wrapper);

        // === POPUP (created once, appended to document.body) ===
        this.popupBackdrop = this.el("div", "ds-popup-backdrop");
        this.popupBackdrop.addEventListener("click", () => this.close());

        this.popup = this.el("div", "ds-popup");
        // Stop clicks inside popup from closing via backdrop
        this.popup.addEventListener("click", (e) => e.stopPropagation());

        this.popupBackdrop.appendChild(this.popup);
    }

    public render(
        viewYear: number,
        viewMonth: number,
        firstDay: number,
        rangeStart: Date | null,
        rangeEnd: Date | null,
        isRangeMode: boolean,
        showSidebar: boolean,
        minYear: number,
        maxYear: number
    ): void {
        // Sidebar visibility
        this.sidebar.style.display = showSidebar ? "" : "none";
        this.endInput.style.display = isRangeMode ? "" : "none";

        // Update date inputs
        this.startInput.value = rangeStart ? formatDate(rangeStart) : "";
        this.endInput.value = rangeEnd ? formatDate(rangeEnd) : "";

        // Update nav dropdowns
        this.monthDropdown.value = String(viewMonth);

        // Rebuild year dropdown only when range changes
        if (minYear !== this.cachedMinYear || maxYear !== this.cachedMaxYear) {
            this.cachedMinYear = minYear;
            this.cachedMaxYear = maxYear;
            this.yearDropdown.innerHTML = "";
            for (let y = minYear; y <= maxYear; y++) {
                const opt = document.createElement("option");
                opt.value = String(y);
                opt.textContent = String(y);
                this.yearDropdown.appendChild(opt);
            }
        }
        this.yearDropdown.value = String(viewYear);

        // Day headers
        const headers = firstDay === 1 ? DAY_HEADERS_MON : DAY_HEADERS_SUN;
        this.dayHeaders.innerHTML = "";
        for (const h of headers) {
            const cell = this.el("div", "ds-day-header");
            cell.textContent = h;
            this.dayHeaders.appendChild(cell);
        }

        // Calendar grid
        const weeks = generateMonthGrid(viewYear, viewMonth, firstDay, rangeStart, rangeEnd);
        this.gridBody.innerHTML = "";

        for (const week of weeks) {
            for (const day of week) {
                const cell = this.el("div", "ds-day-cell");
                cell.textContent = String(day.day);

                if (!day.isCurrentMonth) cell.classList.add("ds-day--other");
                if (day.isToday) cell.classList.add("ds-day--today");
                if (day.isInRange) cell.classList.add("ds-day--in-range");
                if (day.isRangeStart) cell.classList.add("ds-day--range-start");
                if (day.isRangeEnd) cell.classList.add("ds-day--range-end");
                if (day.isRangeStart && day.isRangeEnd) cell.classList.add("ds-day--single");

                cell.addEventListener("click", () => {
                    this.callbacks.onDayClick(day.date);
                });

                this.gridBody.appendChild(cell);
            }
        }

        // Toggle state
        this.dateRangeToggle.checked = isRangeMode;

        // Update pill text
        if (rangeStart && rangeEnd) {
            this.pillText.textContent = `${formatDate(rangeStart)} \u2014 ${formatDate(rangeEnd)}`;
        } else if (rangeStart) {
            this.pillText.textContent = formatDate(rangeStart);
        } else {
            this.pillText.textContent = "Select date\u2026";
        }
    }

    public setDisplayMode(mode: "expanded" | "compact"): void {
        this.currentMode = mode;
        if (mode === "compact") {
            this.pill.style.display = "";
            this.wrapper.style.display = "none";
            // Close button only visible in popup
            this.wrapper.classList.add("ds-wrapper--popup");
        } else {
            this.pill.style.display = "none";
            // Move wrapper back into root if it's in the popup
            if (this.wrapper.parentElement !== this.root) {
                this.root.appendChild(this.wrapper);
            }
            this.wrapper.style.display = "";
            this.wrapper.classList.remove("ds-wrapper--popup");
            if (this.isPopupOpen) {
                this.closePopup();
            }
        }
    }

    private openPopup(): void {
        if (this.isPopupOpen) return;
        this.isPopupOpen = true;

        // Move wrapper into the popup
        this.popup.appendChild(this.wrapper);
        this.wrapper.style.display = "";

        // Copy CSS custom properties from root to popup so theming works
        const styles = getComputedStyle(this.root);
        const vars = ["--ds-accent", "--ds-bg", "--ds-text", "--ds-border"];
        for (const v of vars) {
            this.popup.style.setProperty(v, styles.getPropertyValue(v));
        }

        document.body.appendChild(this.popupBackdrop);
        this.pillChevron.classList.add("ds-pill__chevron--open");
    }

    private closePopup(): void {
        if (!this.isPopupOpen) return;
        this.isPopupOpen = false;

        // Move wrapper back to root (hidden in compact mode)
        this.root.appendChild(this.wrapper);
        if (this.currentMode === "compact") {
            this.wrapper.style.display = "none";
        }

        if (this.popupBackdrop.parentElement) {
            this.popupBackdrop.parentElement.removeChild(this.popupBackdrop);
        }
        this.pillChevron.classList.remove("ds-pill__chevron--open");
    }

    public close(): void {
        if (this.currentMode === "compact" && this.isPopupOpen) {
            this.closePopup();
        }
    }

    public destroy(): void {
        // Clean up popup from document.body if open
        if (this.popupBackdrop.parentElement) {
            this.popupBackdrop.parentElement.removeChild(this.popupBackdrop);
        }
    }

    public setCompact(compact: boolean): void {
        if (compact) {
            this.wrapper.classList.add("ds-wrapper--compact");
        } else {
            this.wrapper.classList.remove("ds-wrapper--compact");
        }
    }

    private el(tag: string, cls: string): HTMLElement {
        const e = document.createElement(tag);
        e.className = cls;
        return e;
    }
}
