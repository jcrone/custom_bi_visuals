"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class CalendarCardSettings extends FormattingSettingsCard {
    firstDayOfWeek = new formattingSettings.ItemDropdown({
        name: "firstDayOfWeek",
        displayName: "First day of week",
        items: [
            { value: "0", displayName: "Sunday" },
            { value: "1", displayName: "Monday" },
        ],
        value: { value: "0", displayName: "Sunday" }
    });

    showSidebar = new formattingSettings.ToggleSwitch({
        name: "showSidebar",
        displayName: "Show sidebar",
        value: true
    });

    defaultPreset = new formattingSettings.ItemDropdown({
        name: "defaultPreset",
        displayName: "Default preset",
        items: [
            { value: "none", displayName: "None" },
            { value: "today", displayName: "Today" },
            { value: "thisWeek", displayName: "This Week" },
            { value: "thisMonth", displayName: "This Month" },
            { value: "lastWeek", displayName: "Last Week" },
        ],
        value: { value: "none", displayName: "None" }
    });

    displayMode = new formattingSettings.ItemDropdown({
        name: "displayMode",
        displayName: "Display mode",
        items: [
            { value: "expanded", displayName: "Expanded" },
            { value: "compact", displayName: "Compact" },
        ],
        value: { value: "expanded", displayName: "Expanded" }
    });

    name: string = "calendar";
    displayName: string = "Calendar";
    slices: Array<FormattingSettingsSlice> = [this.firstDayOfWeek, this.showSidebar, this.defaultPreset, this.displayMode];
}

class AppearanceCardSettings extends FormattingSettingsCard {
    accentColor = new formattingSettings.ColorPicker({
        name: "accentColor",
        displayName: "Accent color",
        value: { value: "#00539A" }
    });

    backgroundColor = new formattingSettings.ColorPicker({
        name: "backgroundColor",
        displayName: "Background color",
        value: { value: "#FFFFFF" }
    });

    textColor = new formattingSettings.ColorPicker({
        name: "textColor",
        displayName: "Text color",
        value: { value: "#11284C" }
    });

    borderColor = new formattingSettings.ColorPicker({
        name: "borderColor",
        displayName: "Border color",
        value: { value: "#D9E1EA" }
    });

    name: string = "appearance";
    displayName: string = "Appearance";
    slices: Array<FormattingSettingsSlice> = [this.accentColor, this.backgroundColor, this.textColor, this.borderColor];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    calendarCard = new CalendarCardSettings();
    appearanceCard = new AppearanceCardSettings();

    cards = [this.calendarCard, this.appearanceCard];
}
