import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";
import FormattingSettingsCard = formattingSettings.SimpleCard;
import FormattingSettingsSlice = formattingSettings.Slice;
import FormattingSettingsModel = formattingSettings.Model;
declare class CardSettings extends FormattingSettingsCard {
    valueColor: formattingSettings.ColorPicker;
    decimalPlaces: formattingSettings.NumUpDown;
    displayUnits: formattingSettings.NumUpDown;
    columns: formattingSettings.NumUpDown;
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
export declare class VisualFormattingSettingsModel extends FormattingSettingsModel {
    cardSettings: CardSettings;
    varianceSettings: VarianceSettings;
    cards: (CardSettings | VarianceSettings)[];
}
export {};
