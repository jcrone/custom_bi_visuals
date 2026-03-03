"use strict";

import powerbi from "powerbi-visuals-api";
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;

class LineSettings extends FormattingSettingsCard {
    lineWidth = new formattingSettings.NumUpDown({
        name: "lineWidth",
        displayName: "Line width",
        value: 3,
        options: {
            minValue: { value: 1, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 8, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    smoothCurve = new formattingSettings.ToggleSwitch({
        name: "smoothCurve",
        displayName: "Smooth curves",
        value: true
    });

    dimOpacity = new formattingSettings.NumUpDown({
        name: "dimOpacity",
        displayName: "Dim opacity (%)",
        value: 15,
        options: {
            minValue: { value: 5, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 100, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name: string = "lines";
    displayName: string = "Lines";
    slices: Array<FormattingSettingsSlice> = [this.lineWidth, this.smoothCurve, this.dimOpacity];
}

class LabelSettings extends FormattingSettingsCard {
    showStartLabels = new formattingSettings.ToggleSwitch({
        name: "showStartLabels",
        displayName: "Show start labels",
        value: true
    });

    showEndLabels = new formattingSettings.ToggleSwitch({
        name: "showEndLabels",
        displayName: "Show end labels",
        value: true
    });

    fontSize = new formattingSettings.NumUpDown({
        name: "fontSize",
        displayName: "Font size",
        value: 11,
        options: {
            minValue: { value: 8, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 20, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name: string = "labels";
    displayName: string = "Labels";
    slices: Array<FormattingSettingsSlice> = [this.showStartLabels, this.showEndLabels, this.fontSize];
}

class DataPointSettings extends FormattingSettingsCard {
    showDots = new formattingSettings.ToggleSwitch({
        name: "showDots",
        displayName: "Show data points",
        value: true
    });

    dotSize = new formattingSettings.NumUpDown({
        name: "dotSize",
        displayName: "Point size",
        value: 5,
        options: {
            minValue: { value: 2, type: powerbi.visuals.ValidatorType.Min },
            maxValue: { value: 12, type: powerbi.visuals.ValidatorType.Max }
        }
    });

    name: string = "dataPoints";
    displayName: string = "Data Points";
    slices: Array<FormattingSettingsSlice> = [this.showDots, this.dotSize];
}

class RankAxisSettings extends FormattingSettingsCard {
    showRankNumbers = new formattingSettings.ToggleSwitch({
        name: "showRankNumbers",
        displayName: "Show rank numbers",
        value: true
    });

    showGridLines = new formattingSettings.ToggleSwitch({
        name: "showGridLines",
        displayName: "Show grid lines",
        value: true
    });

    name: string = "rankAxis";
    displayName: string = "Rank Axis";
    slices: Array<FormattingSettingsSlice> = [this.showRankNumbers, this.showGridLines];
}

export class VisualFormattingSettingsModel extends FormattingSettingsModel {
    lineSettings = new LineSettings();
    labelSettings = new LabelSettings();
    dotSettings = new DataPointSettings();
    rankAxisSettings = new RankAxisSettings();

    cards = [this.lineSettings, this.labelSettings, this.dotSettings, this.rankAxisSettings];
}
