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
            this.container.innerHTML = '<div class="kpi-title">No data</div>';
            return;
        }

        const categorical = dataView.categorical;
        const values = categorical.values;

        // Find roles
        let mainValue: number | null = null;
        let targetValue: number | null = null;
        let trendValues: number[] = [];
        let measureName = "";

        for (const col of values) {
            const role = col.source.roles;
            if (role["value"]) {
                mainValue = col.values[col.values.length - 1] as number;
                measureName = col.source.displayName;
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
            this.container.innerHTML = '<div class="kpi-title">Drop a measure</div>';
            return;
        }

        const cardS = this.formattingSettings.cardSettings;
        const varS = this.formattingSettings.varianceSettings;
        const sparkS = this.formattingSettings.sparklineSettings;

        const titleText = cardS.title.value || measureName;
        const decimals = cardS.decimalPlaces.value;
        const displayUnits = cardS.displayUnits.value;

        let html = "";

        // Title
        if (cardS.showTitle.value) {
            html += `<div class="kpi-title">${this.escapeHtml(titleText)}</div>`;
        }

        // Value
        const formattedValue = this.formatNumber(mainValue, decimals, displayUnits);
        html += `<div class="kpi-value" style="color:${cardS.valueColor.value.value}">${formattedValue}</div>`;

        // Variance
        if (varS.showVariance.value && targetValue !== null && targetValue !== undefined) {
            const delta = mainValue - targetValue;
            const pct = targetValue !== 0 ? (delta / Math.abs(targetValue)) * 100 : 0;
            const isPositive = delta >= 0;
            const cls = isPositive ? "kpi-variance--positive" : "kpi-variance--negative";
            const color = isPositive ? varS.positiveColor.value.value : varS.negativeColor.value.value;
            const arrow = isPositive ? "&#9650;" : "&#9660;";
            const sign = isPositive ? "+" : "";

            html += `<div class="kpi-variance ${cls}" style="color:${color}">`;
            html += `<span class="kpi-variance__arrow">${arrow}</span>`;
            html += `<span>${sign}${pct.toFixed(1)}%</span>`;
            html += `<span class="kpi-variance__target">vs ${this.formatNumber(targetValue, decimals, displayUnits)}</span>`;
            html += `</div>`;
        }

        // Sparkline
        const validTrend = trendValues.filter(v => v !== null && !isNaN(v));
        if (sparkS.showSparkline.value && validTrend.length > 1) {
            html += this.renderSparkline(validTrend, sparkS.lineColor.value.value, sparkS.areaColor.value.value);
        }

        this.container.innerHTML = html;

        // Count-up animation
        this.animateCountUp(mainValue, decimals, displayUnits, cardS.valueColor.value.value);

        // Responsive font sizing
        const width = options.viewport.width;
        const height = options.viewport.height;
        const scale = Math.min(width / 200, height / 140, 2.5);
        const valueEl = this.container.querySelector(".kpi-value") as HTMLElement;
        if (valueEl) {
            valueEl.style.fontSize = Math.max(16, 32 * scale) + "px";
        }
        const titleEl = this.container.querySelector(".kpi-title") as HTMLElement;
        if (titleEl) {
            titleEl.style.fontSize = Math.max(10, 13 * scale) + "px";
        }
    }

    private renderSparkline(data: number[], lineColor: string, areaColor: string): string {
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

        return `<svg class="kpi-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
            <polygon points="${areaPoints}" fill="${areaColor}" opacity="0.1"/>
            <polyline class="kpi-sparkline__line" points="${polyline}" style="stroke:${lineColor}"/>
        </svg>`;
    }

    private formatNumber(value: number, decimals: number, displayUnits: number): string {
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

        const formatted = (value / divisor).toFixed(decimals);
        return formatted + unit;
    }

    private animateCountUp(targetNum: number, decimals: number, displayUnits: number, color: string): void {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);

        const valueEl = this.container.querySelector(".kpi-value") as HTMLElement;
        if (!valueEl) return;

        const finalText = this.formatNumber(targetNum, decimals, displayUnits);
        const duration = 800;
        const start = performance.now();

        const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

            const current = targetNum * eased;
            valueEl.textContent = this.formatNumber(current, decimals, displayUnits);

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(step);
            } else {
                valueEl.textContent = finalText;
                this.animationFrame = 0;
            }
        };

        valueEl.textContent = this.formatNumber(0, decimals, displayUnits);
        this.animationFrame = requestAnimationFrame(step);
    }

    private escapeHtml(str: string): string {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
