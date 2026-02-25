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

        // Find roles
        let mainValue: number | null = null;
        let targetValue: number | null = null;
        let trendValues: number[] = [];
        let measureName = "";
        let valueFormat = "";

        for (const col of values) {
            const role = col.source.roles;
            if (role["value"]) {
                mainValue = col.values[col.values.length - 1] as number;
                measureName = col.source.displayName;
                valueFormat = col.source.format || "";
                // If categories exist, collect all values as trend
                if (col.values.length > 1) {
                    trendValues = col.values.map(v => v as number);
                }
            }
            if (role["target"]) {
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
        const displayUnits = cardS.displayUnits.value;

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
            targetEl.textContent = `vs ${this.formatNumber(targetValue, decimals, displayUnits, valueFormat)}`;

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
        // Match common currency symbols at the start of the format string
        const match = format.match(/^([^#0.,;]+)/);
        if (match) {
            const candidate = match[1].replace(/\\/g, "").trim();
            // Only return if it looks like a currency symbol (not just whitespace/parens)
            if (candidate && /[\$\u00A3\u20AC\u00A5\u20B9]/.test(candidate)) {
                return candidate;
            }
        }
        return "";
    }

    private formatNumber(value: number, decimals: number, displayUnits: number, format?: string): string {
        let unit = "";
        let divisor = 1;

        if (displayUnits === 0) {
            // Auto
            const abs = Math.abs(value);
            if (abs >= 1e9) { divisor = 1e9; unit = "B"; }
            else if (abs >= 1e6) { divisor = 1e6; unit = "M"; }
            else if (abs >= 1e3) { divisor = 1e3; unit = "K"; }
        } else if (displayUnits === 1) {
            // None
        } else if (displayUnits >= 1000) {
            divisor = displayUnits;
            if (displayUnits === 1e3) unit = "K";
            else if (displayUnits === 1e6) unit = "M";
            else if (displayUnits === 1e9) unit = "B";
        }

        const prefix = this.extractCurrencySymbol(format || "");
        const formatted = (value / divisor).toFixed(decimals);
        return prefix + formatted + unit;
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
