import { Visual } from "../../src/visual";
import powerbiVisualsApi from "powerbi-visuals-api";
import IVisualPlugin = powerbiVisualsApi.visuals.plugins.IVisualPlugin;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import DialogConstructorOptions = powerbiVisualsApi.extensibility.visual.DialogConstructorOptions;
var powerbiKey: any = "powerbi";
var powerbi: any = window[powerbiKey];
var kpicardCC33C6CDC44C47478B36A84304E1F7B1: IVisualPlugin = {
    name: 'kpicardCC33C6CDC44C47478B36A84304E1F7B1',
    displayName: 'KPI Card',
    class: 'Visual',
    apiVersion: '5.3.0',
    create: (options?: VisualConstructorOptions) => {
        if (Visual) {
            return new Visual(options);
        }
        throw 'Visual instance not found';
    },
    createModalDialog: (dialogId: string, options: DialogConstructorOptions, initialState: object) => {
        const dialogRegistry = (<any>globalThis).dialogRegistry;
        if (dialogId in dialogRegistry) {
            new dialogRegistry[dialogId](options, initialState);
        }
    },
    custom: true
};
if (typeof powerbi !== "undefined") {
    powerbi.visuals = powerbi.visuals || {};
    powerbi.visuals.plugins = powerbi.visuals.plugins || {};
    powerbi.visuals.plugins["kpicardCC33C6CDC44C47478B36A84304E1F7B1"] = kpicardCC33C6CDC44C47478B36A84304E1F7B1;
}
export default kpicardCC33C6CDC44C47478B36A84304E1F7B1;