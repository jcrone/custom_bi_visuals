"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class CardSettings extends FormattingSettingsCard {
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

    valueColor = new formattingSettings.ColorPicker({
        name: "valueColor",
        displayName: "Value color",
        value: { value: "#11284C" }
    });

    decimalPlaces = new formattingSettings.NumUpDown({
        name: "decimalPlaces",
        displayName: "Decimal places",
        value: 1
    });

    displayUnits = new formattingSettings.NumUpDown({
        name: "displayUnits",
        displayName: "Display units (0=auto, 1=none, 1000=K, 1000000=M, 1000000000=B)",
        value: 0
    });

    name: string = "card";
    displayName: string = "Card";
    slices: Array<FormattingSettingsSlice> = [this.title, this.showTitle, this.valueColor, this.decimalPlaces, this.displayUnits];
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

class SparklineSettings extends FormattingSettingsCard {
    showSparkline = new formattingSettings.ToggleSwitch({
        name: "showSparkline",
        displayName: "Show sparkline",
        value: true
    });

    lineColor = new formattingSettings.ColorPicker({
        name: "lineColor",
        displayName: "Line color",
        value: { value: "#00539A" }
    });

    areaColor = new formattingSettings.ColorPicker({
        name: "areaColor",
        displayName: "Area fill color",
        value: { value: "#00539A" }
    });

    name: string = "sparkline";
    displayName: string = "Sparkline";
    slices: Array<FormattingSettingsSlice> = [this.showSparkline, this.lineColor, this.areaColor];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    cardSettings = new CardSettings();
    varianceSettings = new VarianceSettings();
    sparklineSettings = new SparklineSettings();

    cards = [this.cardSettings, this.varianceSettings, this.sparklineSettings];
}
