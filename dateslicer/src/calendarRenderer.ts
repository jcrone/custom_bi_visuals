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
    private dropdown: HTMLElement;
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
    private isDropdownOpen: boolean = false;
    private cachedMinYear: number = 0;
    private cachedMaxYear: number = 0;
    private outsideClickHandler: (e: MouseEvent) => void;

    constructor(root: HTMLElement, callbacks: CalendarCallbacks) {
        this.root = root;
        this.callbacks = callbacks;
        this.outsideClickHandler = (e: MouseEvent) => this.handleOutsideClick(e);
        this.buildDOM();
    }

    private buildDOM(): void {
        while (this.root.firstChild) this.root.removeChild(this.root.firstChild);
        this.root.style.position = "relative";
        this.root.style.overflow = "visible";

        // === PILL (compact mode trigger) ===
        this.pill = this.el("div", "ds-pill");
        const pillIcon = this.buildPillIcon();
        this.pill.appendChild(pillIcon);
        this.pillText = this.el("span", "ds-pill__text");
        this.pillText.textContent = "Select date\u2026";
        this.pill.appendChild(this.pillText);
        this.pillChevron = this.el("span", "ds-pill__chevron");
        this.pillChevron.textContent = "\u25BE";
        this.pill.appendChild(this.pillChevron);
        this.pill.style.display = "none";

        this.pill.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.isDropdownOpen) {
                this.closeDropdown();
            } else {
                this.openDropdown();
            }
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

        // === DROPDOWN (inline, positioned below pill inside root) ===
        this.dropdown = this.el("div", "ds-dropdown");
        this.dropdown.style.display = "none";
        // Stop clicks inside dropdown from triggering outside-click close
        this.dropdown.addEventListener("click", (e) => e.stopPropagation());
        this.root.appendChild(this.dropdown);
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
            while (this.yearDropdown.firstChild) this.yearDropdown.removeChild(this.yearDropdown.firstChild);
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
        while (this.dayHeaders.firstChild) this.dayHeaders.removeChild(this.dayHeaders.firstChild);
        for (const h of headers) {
            const cell = this.el("div", "ds-day-header");
            cell.textContent = h;
            this.dayHeaders.appendChild(cell);
        }

        // Calendar grid
        const weeks = generateMonthGrid(viewYear, viewMonth, firstDay, rangeStart, rangeEnd);
        while (this.gridBody.firstChild) this.gridBody.removeChild(this.gridBody.firstChild);

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
            // Hide inline wrapper; content shows in dropdown when opened
            if (!this.isDropdownOpen) {
                this.wrapper.style.display = "none";
            }
            this.wrapper.classList.add("ds-wrapper--popup");
        } else {
            this.pill.style.display = "none";
            // Move wrapper back to root if it's in the dropdown
            if (this.wrapper.parentElement === this.dropdown) {
                this.root.appendChild(this.wrapper);
            }
            this.wrapper.style.display = "";
            this.wrapper.classList.remove("ds-wrapper--popup");
            this.dropdown.style.display = "none";
            if (this.isDropdownOpen) {
                this.closeDropdown();
            }
        }
    }

    private openDropdown(): void {
        if (this.isDropdownOpen) return;
        this.isDropdownOpen = true;

        // Move wrapper into the dropdown
        this.dropdown.appendChild(this.wrapper);
        this.wrapper.style.display = "";
        this.dropdown.style.display = "";

        this.pillChevron.classList.add("ds-pill__chevron--open");

        // Listen for clicks outside to close
        setTimeout(() => {
            document.addEventListener("click", this.outsideClickHandler);
        }, 0);
    }

    private closeDropdown(): void {
        if (!this.isDropdownOpen) return;
        this.isDropdownOpen = false;

        // Move wrapper back to root (hidden in compact mode)
        this.root.appendChild(this.wrapper);
        if (this.currentMode === "compact") {
            this.wrapper.style.display = "none";
        }

        this.dropdown.style.display = "none";
        this.pillChevron.classList.remove("ds-pill__chevron--open");
        document.removeEventListener("click", this.outsideClickHandler);
    }

    private handleOutsideClick(e: MouseEvent): void {
        const target = e.target as Node;
        if (!this.dropdown.contains(target) && !this.pill.contains(target)) {
            this.closeDropdown();
        }
    }

    public close(): void {
        if (this.currentMode === "compact" && this.isDropdownOpen) {
            this.closeDropdown();
        }
    }

    public destroy(): void {
        document.removeEventListener("click", this.outsideClickHandler);
    }

    public setCompact(compact: boolean): void {
        if (compact) {
            this.wrapper.classList.add("ds-wrapper--compact");
        } else {
            this.wrapper.classList.remove("ds-wrapper--compact");
        }
    }

    private buildPillIcon(): SVGElement {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("class", "ds-pill__icon");
        svg.setAttribute("width", "16");
        svg.setAttribute("height", "16");
        svg.setAttribute("viewBox", "0 0 16 16");
        svg.setAttribute("fill", "none");

        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("x", "1");
        rect.setAttribute("y", "2");
        rect.setAttribute("width", "14");
        rect.setAttribute("height", "13");
        rect.setAttribute("rx", "2");
        rect.setAttribute("stroke", "currentColor");
        rect.setAttribute("stroke-width", "1.5");
        rect.setAttribute("fill", "none");
        svg.appendChild(rect);

        const line1 = document.createElementNS(ns, "line");
        line1.setAttribute("x1", "1"); line1.setAttribute("y1", "6");
        line1.setAttribute("x2", "15"); line1.setAttribute("y2", "6");
        line1.setAttribute("stroke", "currentColor");
        line1.setAttribute("stroke-width", "1.5");
        svg.appendChild(line1);

        const line2 = document.createElementNS(ns, "line");
        line2.setAttribute("x1", "5"); line2.setAttribute("y1", "1");
        line2.setAttribute("x2", "5"); line2.setAttribute("y2", "3.5");
        line2.setAttribute("stroke", "currentColor");
        line2.setAttribute("stroke-width", "1.5");
        line2.setAttribute("stroke-linecap", "round");
        svg.appendChild(line2);

        const line3 = document.createElementNS(ns, "line");
        line3.setAttribute("x1", "11"); line3.setAttribute("y1", "1");
        line3.setAttribute("x2", "11"); line3.setAttribute("y2", "3.5");
        line3.setAttribute("stroke", "currentColor");
        line3.setAttribute("stroke-width", "1.5");
        line3.setAttribute("stroke-linecap", "round");
        svg.appendChild(line3);

        return svg;
    }

    private el(tag: string, cls: string): HTMLElement {
        const e = document.createElement(tag);
        e.className = cls;
        return e;
    }
}
