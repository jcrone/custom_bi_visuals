import powerbi from "powerbi-visuals-api";
import "./../style/visual.less";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
export declare class Visual implements IVisual {
    private target;
    private container;
    private formattingSettings;
    private formattingSettingsService;
    private animationFrame;
    constructor(options: VisualConstructorOptions);
    update(options: VisualUpdateOptions): void;
    private renderSparkline;
    private formatNumber;
    private animateCountUp;
    private escapeHtml;
    getFormattingModel(): powerbi.visuals.FormattingModel;
}
