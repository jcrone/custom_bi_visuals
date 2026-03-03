"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class DonutSettings extends FormattingSettingsCard {
    innerRadius = new formattingSettings.NumUpDown({
        name: "innerRadius",
        displayName: "Inner radius (%)",
        value: 55,
        options: {
            minValue: { value: 40, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 75, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    arcGap = new formattingSettings.NumUpDown({
        name: "arcGap",
        displayName: "Arc gap",
        value: 2,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 4, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    fillOpacity = new formattingSettings.NumUpDown({
        name: "fillOpacity",
        displayName: "Fill opacity (%)",
        value: 90,
        options: {
            minValue: { value: 70, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 100, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    strokeWidth = new formattingSettings.NumUpDown({
        name: "strokeWidth",
        displayName: "Stroke width",
        value: 1,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 3, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name: string = "donut";
    displayName: string = "Donut";
    slices: Array<FormattingSettingsSlice> = [this.innerRadius, this.arcGap, this.fillOpacity, this.strokeWidth];
}

class LabelSettings extends FormattingSettingsCard {
    show = new formattingSettings.ToggleSwitch({
        name: "show",
        displayName: "Show labels",
        value: true
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Font size",
        value: 12,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 16, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    showPercentages = new formattingSettings.ToggleSwitch({
        name: "showPercentages",
        displayName: "Show percentages",
        value: true
    });

    name: string = "labels";
    displayName: string = "Labels";
    slices: Array<FormattingSettingsSlice> = [this.show, this.fontSize, this.showPercentages];
}

class LayoutSettings extends FormattingSettingsCard {
    darkMode = new formattingSettings.ToggleSwitch({
        name: "darkMode",
        displayName: "Dark mode",
        value: false
    });

    name: string = "layout";
    displayName: string = "Layout";
    slices: Array<FormattingSettingsSlice> = [this.darkMode];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    donutSettings = new DonutSettings();
    labelSettings = new LabelSettings();
    layoutSettings = new LayoutSettings();

    cards = [this.donutSettings, this.labelSettings, this.layoutSettings];
}
