"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class GaugeSettings extends FormattingSettingsCard {
    title = new formattingSettings.TextInput({
        name: "title",
        displayName: "Title",
        value: "",
        placeholder: "Auto (from measure name)"
    });

    showTitle = new formattingSettings.ToggleSwitch({
        name: "showTitle",
        displayName: "Show title",
        value: true
    });

    arcColor = new formattingSettings.ColorPicker({
        name: "arcColor",
        displayName: "Arc color",
        value: { value: "#00539A" }
    });

    trackColor = new formattingSettings.ColorPicker({
        name: "trackColor",
        displayName: "Track color",
        value: { value: "#E8EEF5" }
    });

    thickness = new formattingSettings.NumUpDown({
        name: "thickness",
        displayName: "Arc thickness",
        value: 20,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 60, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    startAngle = new formattingSettings.NumUpDown({
        name: "startAngle",
        displayName: "Start angle",
        value: 135,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 359, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    endAngle = new formattingSettings.NumUpDown({
        name: "endAngle",
        displayName: "End angle",
        value: 405,
        options: {
            minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 720, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Decimal places",
        value: 0,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 20, type: powerbi.visuals.ValidatorType.Max }
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
        value: { value: "1", displayName: "None" }
    });

    name: string = "gauge";
    displayName: string = "Gauge";
    slices: Array<FormattingSettingsSlice> = [
        this.title, this.showTitle, this.arcColor, this.trackColor,
        this.thickness, this.startAngle, this.endAngle,
        this.decimalPlaces, this.displayUnits
    ];
}

class ThresholdSettings extends FormattingSettingsCard {
    showThresholds = new formattingSettings.ToggleSwitch({
        name: "showThresholds",
        displayName: "Show threshold bands",
        value: false
    });

    warningPercent = new formattingSettings.NumUpDown({
        name: "warningPercent",
        displayName: "Warning at (%)",
        value: 60,
        options: {
            minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 99, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    warningColor = new formattingSettings.ColorPicker({
        name: "warningColor",
        displayName: "Warning color",
        value: { value: "#FDB945" }
    });

    dangerPercent = new formattingSettings.NumUpDown({
        name: "dangerPercent",
        displayName: "Danger below (%)",
        value: 30,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 98, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    dangerColor = new formattingSettings.ColorPicker({
        name: "dangerColor",
        displayName: "Danger color",
        value: { value: "#B42318" }
    });

    name: string = "thresholds";
    displayName: string = "Thresholds";
    slices: Array<FormattingSettingsSlice> = [
        this.showThresholds, this.warningPercent, this.warningColor,
        this.dangerPercent, this.dangerColor
    ];
}

class VarianceSettings extends FormattingSettingsCard {
    showVariance = new formattingSettings.ToggleSwitch({
        name: "showVariance",
        displayName: "Show variance",
        value: true
    });

    positiveColor = new formattingSettings.ColorPicker({
        name: "positiveColor",
        displayName: "Positive color",
        value: { value: "#0E7C3A" }
    });

    negativeColor = new formattingSettings.ColorPicker({
        name: "negativeColor",
        displayName: "Negative color",
        value: { value: "#B42318" }
    });

    name: string = "variance";
    displayName: string = "Variance";
    slices: Array<FormattingSettingsSlice> = [this.showVariance, this.positiveColor, this.negativeColor];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    gaugeSettings = new GaugeSettings();
    thresholdSettings = new ThresholdSettings();
    varianceSettings = new VarianceSettings();

    cards = [this.gaugeSettings, this.thresholdSettings, this.varianceSettings];
}
