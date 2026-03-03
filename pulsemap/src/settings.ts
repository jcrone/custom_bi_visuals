"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class PulseSettings extends FormattingSettingsCard {
    lineWidth = new formattingSettings.NumUpDown({
        name: "lineWidth",
        displayName: "Line width",
        value: 2,
        options: {
            minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 5, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    spikeWidth = new formattingSettings.NumUpDown({
        name: "spikeWidth",
        displayName: "Spike width (%)",
        value: 30,
        options: {
            minValue: { value: 10, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 80, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name: string = "pulse";
    displayName: string = "Pulse";
    slices: Array<FormattingSettingsSlice> = [this.lineWidth, this.spikeWidth];
}

class LayoutSettings extends FormattingSettingsCard {
    showLabels = new formattingSettings.ToggleSwitch({
        name: "showLabels",
        displayName: "Show entity labels",
        value: true
    });

    showPeriods = new formattingSettings.ToggleSwitch({
        name: "showPeriods",
        displayName: "Show period labels",
        value: true
    });

    rowSpacing = new formattingSettings.NumUpDown({
        name: "rowSpacing",
        displayName: "Row spacing",
        value: 8,
        options: {
            minValue: { value: 0, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 30, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name: string = "layout";
    displayName: string = "Layout";
    slices: Array<FormattingSettingsSlice> = [this.showLabels, this.showPeriods, this.rowSpacing];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    pulseSettings = new PulseSettings();
    layoutSettings = new LayoutSettings();

    cards = [this.pulseSettings, this.layoutSettings];
}
