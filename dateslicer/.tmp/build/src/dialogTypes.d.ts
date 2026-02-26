/** Serializable state passed from the visual to the dialog on open */
export interface CalendarDialogInitialState {
    viewYear: number;
    viewMonth: number;
    rangeStartISO: string | null;
    rangeEndISO: string | null;
    isRangeMode: boolean;
    firstDayOfWeek: number;
    showSidebar: boolean;
    minYear: number;
    maxYear: number;
    minDateISO: string | null;
    accentColor: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
}
/** Serializable state returned from the dialog to the visual on OK */
export interface CalendarDialogResult {
    rangeStartISO: string | null;
    rangeEndISO: string | null;
    isRangeMode: boolean;
    viewYear: number;
    viewMonth: number;
}
