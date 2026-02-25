"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;

import { VisualFormattingSettingsModel } from "./settings";

interface KpiDataPoint {
    name: string;
    value: number;
    target: number | null;
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private container: HTMLElement;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private animationFrames: number[] = [];

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;
        this.container = document.createElement("div");
        this.container.className = "kpi-multi-container";
        this.target.appendChild(this.container);
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews?.[0]
        );

        const dataView: DataView | undefined = options.dataViews?.[0];
        if (!dataView?.categorical?.categories?.[0]) {
            this.container.innerHTML = '<div class="kpi-mini-card__title">Add a KPI Name field</div>';
            return;
        }

        const categorical = dataView.categorical;
        const categories = categorical.categories[0].values;
        const values = categorical.values || [];

        // Build data points
        const dataPoints: KpiDataPoint[] = [];
        for (let i = 0; i < categories.length; i++) {
            const dp: KpiDataPoint = {
                name: String(categories[i]),
                value: 0,
                target: null
            };

            for (const col of values) {
                const role = col.source.roles;
                if (role["value"]) {
                    dp.value = col.values[i] as number;
                }
                if (role["target"]) {
                    dp.target = col.values[i] as number;
                }
            }

            dataPoints.push(dp);
        }

        const cardS = this.formattingSettings.cardSettings;
        const varS = this.formattingSettings.varianceSettings;
        const decimals = cardS.decimalPlaces.value;
        const displayUnits = cardS.displayUnits.value;
        const maxCols = cardS.columns.value;

        // Build HTML
        let html = "";
        for (const dp of dataPoints) {
            const formattedValue = this.formatNumber(dp.value, decimals, displayUnits);

            let cardStyle = "";
            if (maxCols > 0) {
                const basisPct = (100 / maxCols) - 2;
                cardStyle = `style="flex-basis:${basisPct}%; max-width:${basisPct}%"`;
            }

            html += `<div class="kpi-mini-card" ${cardStyle}>`;
            html += `<div class="kpi-mini-card__title">${this.escapeHtml(dp.name)}</div>`;
            html += `<div class="kpi-mini-card__value" style="color:${cardS.valueColor.value.value}">${formattedValue}</div>`;

            if (varS.showVariance.value && dp.target !== null && dp.target !== undefined) {
                const delta = dp.value - dp.target;
                const pct = dp.target !== 0 ? (delta / Math.abs(dp.target)) * 100 : 0;
                const isPositive = delta >= 0;
                const cls = isPositive ? "kpi-mini-card__variance--positive" : "kpi-mini-card__variance--negative";
                const color = isPositive ? varS.positiveColor.value.value : varS.negativeColor.value.value;
                const arrow = isPositive ? "&#9650;" : "&#9660;";
                const sign = isPositive ? "+" : "";

                html += `<div class="kpi-mini-card__variance ${cls}" style="color:${color}">`;
                html += `<span class="kpi-mini-card__arrow">${arrow}</span>`;
                html += `<span>${sign}${pct.toFixed(1)}%</span>`;
                html += `</div>`;
            }

            html += `</div>`;
        }

        this.container.innerHTML = html;

        // Count-up animation for each card
        this.animateCountUps(dataPoints, decimals, displayUnits);
    }

    private animateCountUps(dataPoints: KpiDataPoint[], decimals: number, displayUnits: number): void {
        this.animationFrames.forEach(id => cancelAnimationFrame(id));
        this.animationFrames = [];

        const valueEls = this.container.querySelectorAll(".kpi-mini-card__value");
        valueEls.forEach((el: HTMLElement, idx: number) => {
            const dp = dataPoints[idx];
            if (!dp) return;

            const targetNum = dp.value;
            const finalText = this.formatNumber(targetNum, decimals, displayUnits);
            const duration = 700;
            const delay = idx * 80;
            const start = performance.now() + delay;

            el.textContent = this.formatNumber(0, decimals, displayUnits);

            const step = (now: number) => {
                if (now < start) { this.animationFrames[idx] = requestAnimationFrame(step); return; }
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = targetNum * eased;

                el.textContent = this.formatNumber(current, decimals, displayUnits);

                if (progress < 1) {
                    this.animationFrames[idx] = requestAnimationFrame(step);
                } else {
                    el.textContent = finalText;
                }
            };

            this.animationFrames[idx] = requestAnimationFrame(step);
        });
    }

    private formatNumber(value: number, decimals: number, displayUnits: number): string {
        let unit = "";
        let divisor = 1;

        if (displayUnits === 0) {
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

    private escapeHtml(str: string): string {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
