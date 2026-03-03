"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class BulletSettings extends FormattingSettingsCard {
    orientation = new formattingSettings.ItemDropdown({
        name: "orientation",
        displayName: "Orientation",
        items: [
            { value: "horizontal", displayName: "Horizontal" },
            { value: "vertical", displayName: "Vertical" }
        ],
        value: { value: "horizontal", displayName: "Horizontal" }
    });

    barThickness = new formattingSettings.NumUpDown({
        name: "barThickness",
        displayName: "Bar thickness",
        value: 16,
        options: {
            minValue: { value: 6, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 40, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    barColor = new formattingSettings.ColorPicker({
        name: "barColor",
        displayName: "Bar color",
        value: { value: "#00539A" }
    });

    targetColor = new formattingSettings.ColorPicker({
        name: "targetColor",
        displayName: "Target color",
        value: { value: "#11284C" }
    });

    targetWidth = new formattingSettings.NumUpDown({
        name: "targetWidth",
        displayName: "Target marker width",
        value: 3,
        options: {
            minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 8, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    spacing = new formattingSettings.NumUpDown({
        name: "spacing",
        displayName: "Row spacing",
        value: 12,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 40, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name: string = "bullet";
    displayName: string = "Bullet";
    slices: Array<FormattingSettingsSlice> = [
        this.orientation, this.barThickness, this.barColor,
        this.targetColor, this.targetWidth, this.spacing
    ];
}

class RangeSettings extends FormattingSettingsCard {
    showRanges = new formattingSettings.ToggleSwitch({
        name: "showRanges",
        displayName: "Show qualitative ranges",
        value: true
    });

    poorThreshold = new formattingSettings.NumUpDown({
        name: "poorThreshold",
        displayName: "Poor threshold (%)",
        value: 33,
        options: {
            minValue: { value: 5, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 90, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    satisfactoryThreshold = new formattingSettings.NumUpDown({
        name: "satisfactoryThreshold",
        displayName: "Satisfactory threshold (%)",
        value: 67,
        options: {
            minValue: { value: 10, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 95, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    poorColor = new formattingSettings.ColorPicker({
        name: "poorColor",
        displayName: "Poor range color",
        value: { value: "#D9E1EA" }
    });

    satisfactoryColor = new formattingSettings.ColorPicker({
        name: "satisfactoryColor",
        displayName: "Satisfactory range color",
        value: { value: "#A8B7C6" }
    });

    goodColor = new formattingSettings.ColorPicker({
        name: "goodColor",
        displayName: "Good range color",
        value: { value: "#6B7F93" }
    });

    name: string = "ranges";
    displayName: string = "Qualitative Ranges";
    slices: Array<FormattingSettingsSlice> = [
        this.showRanges, this.poorThreshold, this.satisfactoryThreshold,
        this.poorColor, this.satisfactoryColor, this.goodColor
    ];
}

class LabelSettings extends FormattingSettingsCard {
    showLabels = new formattingSettings.ToggleSwitch({
        name: "showLabels",
        displayName: "Show category labels",
        value: true
    });

    showValues = new formattingSettings.ToggleSwitch({
        name: "showValues",
        displayName: "Show value labels",
        value: true
    });

    showAxis = new formattingSettings.ToggleSwitch({
        name: "showAxis",
        displayName: "Show value axis",
        value: true
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Font size",
        value: 12,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 24, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Decimal places",
        value: 0,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 6, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    displayUnits = new formattingSettings.ItemDropdown({
        name: "displayUnits",
        displayName: "Display units",
        items: [
            { value: "1", displayName: "None" },
            { value: "1000", displayName: "Thousands" },
            { value: "1000000", displayName: "Millions" },
            { value: "0", displayName: "Auto" }
        ],
        value: { value: "0", displayName: "Auto" }
    });

    name: string = "labels";
    displayName: string = "Labels";
    slices: Array<FormattingSettingsSlice> = [
        this.showLabels, this.showValues, this.showAxis,
        this.fontSize, this.decimalPlaces, this.displayUnits
    ];
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
    bulletSettings = new BulletSettings();
    rangeSettings = new RangeSettings();
    labelSettings = new LabelSettings();
    layoutSettings = new LayoutSettings();

    cards = [this.bulletSettings, this.rangeSettings, this.labelSettings, this.layoutSettings];
}
