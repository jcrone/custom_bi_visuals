import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
declare class CardSettings extends FormattingSettingsCard {
    title: formattingSettings.TextInput;
    showTitle: formattingSettings.ToggleSwitch;
    valueColor: formattingSettings.ColorPicker;
    decimalPlaces: formattingSettings.NumUpDown;
    displayUnits: formattingSettings.NumUpDown;
    name: string;
    displayName: string;
    slices: Array<FormattingSettingsSlice>;
}
declare class VarianceSettings extends FormattingSettingsCard {
    showVariance: formattingSettings.ToggleSwitch;
    positiveColor: formattingSettings.ColorPicker;
    negativeColor: formattingSettings.ColorPicker;
    name: string;
    displayName: string;
    slices: Array<FormattingSettingsSlice>;
}
declare class SparklineSettings extends FormattingSettingsCard {
    showSparkline: formattingSettings.ToggleSwitch;
    lineColor: formattingSettings.ColorPicker;
    areaColor: formattingSettings.ColorPicker;
    name: string;
    displayName: string;
    slices: Array<FormattingSettingsSlice>;
}
export declare class VisualFormattingSettingsModel extends FormattingSettingsModel {
    cardSettings: CardSettings;
    varianceSettings: VarianceSettings;
    sparklineSettings: SparklineSettings;
    cards: (CardSettings | VarianceSettings | SparklineSettings)[];
}
export {};
