import powerbi from "powerbi-visuals-api";
import DialogConstructorOptions = powerbi.extensibility.visual.DialogConstructorOptions;
import "./../style/visual.less";
import { CalendarDialogInitialState } from "./dialogTypes";
declare class CalendarDialog {
    static id: string;
    private host;
    private renderer;
    private viewYear;
    private viewMonth;
    private rangeStart;
    private rangeEnd;
    private isRangeMode;
    private clickState;
    private firstDayOfWeek;
    private showSidebar;
    private minYear;
    private maxYear;
    private minDate;
    constructor(options: DialogConstructorOptions, initialState: CalendarDialogInitialState);
    private renderCalendar;
    private renderAndSync;
    private syncResult;
    private handleDayClick;
    private handlePreset;
    private setRange;
    private navigateMonth;
}
export default CalendarDialog;
