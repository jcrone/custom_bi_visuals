import { Visual } from "../../src/visual";
import powerbiVisualsApi from "powerbi-visuals-api";
import IVisualPlugin = powerbiVisualsApi.visuals.plugins.IVisualPlugin;
import VisualConstructorOptions = powerbiVisualsApi.extensibility.visual.VisualConstructorOptions;
import DialogConstructorOptions = powerbiVisualsApi.extensibility.visual.DialogConstructorOptions;
var powerbiKey: any = "powerbi";
var powerbi: any = window[powerbiKey];
var kpimulticard97B3B5AD5E9C45498A34E713F3176C10: IVisualPlugin = {
    name: 'kpimulticard97B3B5AD5E9C45498A34E713F3176C10',
    displayName: 'KPI Multi Card',
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
    powerbi.visuals.plugins["kpimulticard97B3B5AD5E9C45498A34E713F3176C10"] = kpimulticard97B3B5AD5E9C45498A34E713F3176C10;
}
export default kpimulticard97B3B5AD5E9C45498A34E713F3176C10;