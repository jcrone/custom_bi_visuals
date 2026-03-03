"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class RidgeSettings extends FormattingSettingsCard {
    overlap = new formattingSettings.NumUpDown({
        name: "overlap",
        displayName: "Overlap (%)",
        value: 50,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 90, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    fillOpacity = new formattingSettings.NumUpDown({
        name: "fillOpacity",
        displayName: "Fill opacity (%)",
        value: 85,
        options: {
            minValue: { value: 10, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 100, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    strokeWidth = new formattingSettings.NumUpDown({
        name: "strokeWidth",
        displayName: "Line width",
        value: 2,
        options: {
            minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 5, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name: string = "ridges";
    displayName: string = "Ridges";
    slices: Array<FormattingSettingsSlice> = [this.overlap, this.fillOpacity, this.strokeWidth];
}

class LayoutSettings extends FormattingSettingsCard {
    showLabels = new formattingSettings.ToggleSwitch({
        name: "showLabels",
        displayName: "Show labels",
        value: true
    });

    showAxis = new formattingSettings.ToggleSwitch({
        name: "showAxis",
        displayName: "Show x-axis",
        value: true
    });

    darkMode = new formattingSettings.ToggleSwitch({
        name: "darkMode",
        displayName: "Dark mode",
        value: false
    });

    name: string = "layout";
    displayName: string = "Layout";
    slices: Array<FormattingSettingsSlice> = [this.showLabels, this.showAxis, this.darkMode];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    ridgeSettings = new RidgeSettings();
    layoutSettings = new LayoutSettings();

    cards = [this.ridgeSettings, this.layoutSettings];
}
