"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;

import { VisualFormattingSettingsModel } from "./settings";

export class Visual implements IVisual {
    private target: HTMLElement;
    private container: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private animationFrame: number = 0;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.container = document.createElement("div");
        this.container.className = "kpi-card";
        this.target.appendChild(this.container);
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews?.[0]
        );

        const dataView: DataView | undefined = options.dataViews?.[0];
        if (!dataView?.categorical?.values) {
            this.renderMessage("No data");
            return;
        }

        const categorical = dataView.categorical;
        const values = categorical.values;
        let mainValue: number | null = null;
        let targetValue: number | null = null;
        let trendValues: number[] = [];
        let measureName = "";
        let valueFormat = "";
        let targetFormat = "";

        for (const col of values) {
            const role = col.source.roles;
            if (role["value"]) {
                measureName = col.source.displayName;
                valueFormat = col.source.format || "";
                // Keep KPI value independent from sparkline category granularity.
                mainValue = col.values[col.values.length - 1] as number;
                // Use value series for sparkline when no dedicated trend measure is provided.
                if (col.values.length > 1) {
                    trendValues = col.values.map(v => v as number);
                }
            }
            if (role["target"]) {
                targetFormat = col.source.format || "";
                targetValue = col.values[col.values.length - 1] as number;
            }
            if (role["trend"]) {
                trendValues = col.values.map(v => v as number);
            }
        }

        if (mainValue === null || mainValue === undefined) {
            this.renderMessage("Drop a measure");
            return;
        }

        const cardS = this.formattingSettings.cardSettings;
        const varS = this.formattingSettings.varianceSettings;
        const sparkS = this.formattingSettings.sparklineSettings;

        const titleText = cardS.title.value || measureName;
        const decimals = cardS.decimalPlaces.value;
        const displayUnits = Number(cardS.displayUnits.value?.value ?? 1);

        this.container.replaceChildren();

        if (cardS.showTitle.value) {
            const titleEl = document.createElement("div");
            titleEl.className = "kpi-title";
            titleEl.textContent = titleText;
            this.container.appendChild(titleEl);
        }

        const formattedValue = this.formatNumber(mainValue, decimals, displayUnits, valueFormat);
        const valueEl = document.createElement("div");
        valueEl.className = "kpi-value";
        valueEl.style.color = cardS.valueColor.value.value;
        valueEl.textContent = formattedValue;
        this.container.appendChild(valueEl);

        if (varS.showVariance.value && targetValue !== null && targetValue !== undefined) {
            const delta = mainValue - targetValue;
            const pct = targetValue !== 0 ? (delta / Math.abs(targetValue)) * 100 : 0;
            const isPositive = delta >= 0;
            const cls = isPositive ? "kpi-variance--positive" : "kpi-variance--negative";
            const color = isPositive ? varS.positiveColor.value.value : varS.negativeColor.value.value;
            const arrow = isPositive ? "\u25B2" : "\u25BC";
            const sign = isPositive ? "+" : "";

            const varianceEl = document.createElement("div");
            varianceEl.className = `kpi-variance ${cls}`;
            varianceEl.style.color = color;

            const arrowEl = document.createElement("span");
            arrowEl.className = "kpi-variance__arrow";
            arrowEl.textContent = arrow;

            const pctEl = document.createElement("span");
            pctEl.textContent = `${sign}${pct.toFixed(1)}%`;

            const targetEl = document.createElement("span");
            targetEl.className = "kpi-variance__target";
            targetEl.textContent = `vs ${this.formatNumber(targetValue, decimals, displayUnits, targetFormat || valueFormat)}`;

            varianceEl.append(arrowEl, pctEl, targetEl);
            this.container.appendChild(varianceEl);
        }

        const validTrend = trendValues.filter(v => v !== null && !isNaN(v));
        if (sparkS.showSparkline.value && validTrend.length > 1) {
            this.container.appendChild(this.renderSparkline(validTrend, sparkS.lineColor.value.value, sparkS.areaColor.value.value));
        }

        // Count-up animation
        this.animateCountUp(mainValue, decimals, displayUnits, cardS.valueColor.value.value, valueFormat);

        // Responsive font sizing
        const width = options.viewport.width;
        const height = options.viewport.height;
        const scale = Math.min(width / 200, height / 140, 2.5);
        valueEl.style.fontSize = Math.max(16, 32 * scale) + "px";
        const titleEl2 = this.container.querySelector(".kpi-title") as HTMLElement;
        if (titleEl2) {
            titleEl2.style.fontSize = Math.max(10, 13 * scale) + "px";
        }
    }

    private renderSparkline(data: number[], lineColor: string, areaColor: string): SVGSVGElement {
        const w = 200;
        const h = 40;
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        const pad = 2;

        const points = data.map((v, i) => {
            const x = pad + (i / (data.length - 1)) * (w - 2 * pad);
            const y = h - pad - ((v - min) / range) * (h - 2 * pad);
            return `${x.toFixed(1)},${y.toFixed(1)}`;
        });

        const polyline = points.join(" ");
        const areaPoints = `${pad},${h} ${polyline} ${w - pad},${h}`;

        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("class", "kpi-sparkline");
        svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
        svg.setAttribute("preserveAspectRatio", "none");

        const polygon = document.createElementNS(ns, "polygon");
        polygon.setAttribute("points", areaPoints);
        polygon.setAttribute("fill", areaColor);
        polygon.setAttribute("opacity", "0.1");

        const line = document.createElementNS(ns, "polyline");
        line.setAttribute("class", "kpi-sparkline__line");
        line.setAttribute("points", polyline);
        line.setAttribute("stroke", lineColor);

        svg.append(polygon, line);
        return svg;
    }

    private extractCurrencySymbol(format: string): string {
        if (!format) return "";
        const unescaped = format.replace(/\\(.)/g, "$1");
        // Handles tokens like "[$€-407]#,0.00"
        const tokenMatch = unescaped.match(/\[\$([^\]-]+)-[^\]]+\]/);
        if (tokenMatch?.[1]) {
            return tokenMatch[1];
        }
        const symbolMatch = unescaped.match(/[\$\u00A3\u20AC\u00A5\u20B9]/);
        return symbolMatch ? symbolMatch[0] : "";
    }

    private formatNumber(value: number, decimals: number, displayUnits: number, format?: string): string {
        const safeValue = Number.isFinite(value) ? value : 0;
        const safeDecimals = Number.isFinite(decimals) ? Math.min(20, Math.max(0, Math.trunc(decimals))) : 0;
        const safeDisplayUnits = this.normalizeDisplayUnits(displayUnits);
        const safeFormat = format || "";
        const isPercent = /%/.test(safeFormat);

        let unit = "";
        let divisor = 1;

        if (!isPercent && safeDisplayUnits === 0) {
            // Auto
            const abs = Math.abs(safeValue);
            if (abs >= 1e9) { divisor = 1e9; unit = "B"; }
            else if (abs >= 1e6) { divisor = 1e6; unit = "M"; }
            else if (abs >= 1e3) { divisor = 1e3; unit = "K"; }
        } else if (!isPercent && safeDisplayUnits === 1) {
            // None
        } else if (!isPercent && safeDisplayUnits >= 1000) {
            divisor = safeDisplayUnits;
            if (safeDisplayUnits === 1e3) unit = "K";
            else if (safeDisplayUnits === 1e6) unit = "M";
            else if (safeDisplayUnits === 1e9) unit = "B";
        }

        const prefix = this.extractCurrencySymbol(safeFormat);
        const scaled = isPercent ? safeValue * 100 : safeValue;
        const formatted = new Intl.NumberFormat(undefined, {
            minimumFractionDigits: safeDecimals,
            maximumFractionDigits: safeDecimals
        }).format(scaled / divisor);
        const suffix = isPercent ? "%" : "";
        return prefix + formatted + unit + suffix;
    }

    private normalizeDisplayUnits(displayUnits: number): number {
        const normalized = Number.isFinite(displayUnits) ? Math.trunc(displayUnits) : 0;
        switch (normalized) {
            case 0:
            case 1:
            case 1000:
            case 1000000:
            case 1000000000:
                return normalized;
            default:
                return 0;
        }
    }

    private animateCountUp(targetNum: number, decimals: number, displayUnits: number, color: string, format?: string): void {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);

        const valueEl = this.container.querySelector(".kpi-value") as HTMLElement;
        if (!valueEl) return;

        const finalText = this.formatNumber(targetNum, decimals, displayUnits, format);
        const duration = 800;
        const start = performance.now();

        const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

            const current = targetNum * eased;
            valueEl.textContent = this.formatNumber(current, decimals, displayUnits, format);

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(step);
            } else {
                valueEl.textContent = finalText;
                this.animationFrame = 0;
            }
        };

        valueEl.textContent = this.formatNumber(0, decimals, displayUnits, format);
        this.animationFrame = requestAnimationFrame(step);
    }

    private renderMessage(message: string): void {
        const messageEl = document.createElement("div");
        messageEl.className = "kpi-title";
        messageEl.textContent = message;
        this.container.replaceChildren(messageEl);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
