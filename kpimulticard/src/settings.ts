"use strict";

import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class CardSettings extends FormattingSettingsCard {
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
        displayName: "Display units (0=auto, 1=none, 1000=K, 1000000=M)",
        value: 0
    });

    columns = new formattingSettings.NumUpDown({
        name: "columns",
        displayName: "Max columns (0=auto)",
        value: 0
    });

    name: string = "card";
    displayName: string = "Card";
    slices: Array<FormattingSettingsSlice> = [this.valueColor, this.decimalPlaces, this.displayUnits, this.columns];
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
    cardSettings = new CardSettings();
    varianceSettings = new VarianceSettings();

    cards = [this.cardSettings, this.varianceSettings];
}
