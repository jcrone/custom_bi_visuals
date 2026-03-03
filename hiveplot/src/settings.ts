"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class ArcSettings extends FormattingSettingsCard {
    maxThickness = new formattingSettings.NumUpDown({
        name: "maxThickness",
        displayName: "Max arc thickness",
        value: 12,
        options: {
            minValue: { value: 2, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 30, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    opacity = new formattingSettings.NumUpDown({
        name: "opacity",
        displayName: "Arc opacity (%)",
        value: 55,
        options: {
            minValue: { value: 10, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 100, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name: string = "arcs";
    displayName: string = "Arcs";
    slices: Array<FormattingSettingsSlice> = [this.maxThickness, this.opacity];
}

class AxisSettings extends FormattingSettingsCard {
    showAxes = new formattingSettings.ToggleSwitch({
        name: "showAxes",
        displayName: "Show axis lines",
        value: true
    });

    axisAngle = new formattingSettings.NumUpDown({
        name: "axisAngle",
        displayName: "Axis spread angle",
        value: 50,
        options: {
            minValue: { value: 20, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 80, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name: string = "axes";
    displayName: string = "Axes";
    slices: Array<FormattingSettingsSlice> = [this.showAxes, this.axisAngle];
}

class LabelSettings extends FormattingSettingsCard {
    showLabels = new formattingSettings.ToggleSwitch({
        name: "showLabels",
        displayName: "Show labels",
        value: true
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Font size",
        value: 11,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 18, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name: string = "labels";
    displayName: string = "Labels";
    slices: Array<FormattingSettingsSlice> = [this.showLabels, this.fontSize];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    arcSettings = new ArcSettings();
    axisSettings = new AxisSettings();
    labelSettings = new LabelSettings();

    cards = [this.arcSettings, this.axisSettings, this.labelSettings];
}
