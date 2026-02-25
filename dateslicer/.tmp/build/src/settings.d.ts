import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
declare class CalendarCardSettings extends FormattingSettingsCard {
    firstDayOfWeek: formattingSettings.ItemDropdown;
    showSidebar: formattingSettings.ToggleSwitch;
    defaultPreset: formattingSettings.ItemDropdown;
    displayMode: formattingSettings.ItemDropdown;
    name: string;
    displayName: string;
    slices: Array<FormattingSettingsSlice>;
}
declare class AppearanceCardSettings extends FormattingSettingsCard {
    accentColor: formattingSettings.ColorPicker;
    backgroundColor: formattingSettings.ColorPicker;
    textColor: formattingSettings.ColorPicker;
    borderColor: formattingSettings.ColorPicker;
    name: string;
    displayName: string;
    slices: Array<FormattingSettingsSlice>;
}
export declare class VisualFormattingSettingsModel extends FormattingSettingsModel {
    calendarCard: CalendarCardSettings;
    appearanceCard: AppearanceCardSettings;
    cards: (CalendarCardSettings | AppearanceCardSettings)[];
}
export {};
