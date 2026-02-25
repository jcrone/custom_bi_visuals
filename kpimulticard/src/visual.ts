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
    format: string;
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
            this.renderMessage("Add a KPI Name field");
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
                target: null,
                format: ""
            };

            for (const col of values) {
                const role = col.source.roles;
                if (role["value"]) {
                    dp.value = col.values[i] as number;
                    dp.format = col.source.format || "";
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

        const fragment = document.createDocumentFragment();
        for (const dp of dataPoints) {
            const formattedValue = this.formatNumber(dp.value, decimals, displayUnits, dp.format);
            const cardEl = document.createElement("div");
            cardEl.className = "kpi-mini-card";
            if (maxCols > 0) {
                const basisPct = (100 / maxCols) - 2;
                const pct = `${basisPct}%`;
                cardEl.style.flexBasis = pct;
                cardEl.style.maxWidth = pct;
            }

            const titleEl = document.createElement("div");
            titleEl.className = "kpi-mini-card__title";
            titleEl.textContent = dp.name;

            const valueEl = document.createElement("div");
            valueEl.className = "kpi-mini-card__value";
            valueEl.style.color = cardS.valueColor.value.value;
            valueEl.textContent = formattedValue;

            cardEl.append(titleEl, valueEl);
            if (varS.showVariance.value && dp.target !== null && dp.target !== undefined) {
                const delta = dp.value - dp.target;
                const pct = dp.target !== 0 ? (delta / Math.abs(dp.target)) * 100 : 0;
                const isPositive = delta >= 0;
                const cls = isPositive ? "kpi-mini-card__variance--positive" : "kpi-mini-card__variance--negative";
                const color = isPositive ? varS.positiveColor.value.value : varS.negativeColor.value.value;
                const arrow = isPositive ? "\u25B2" : "\u25BC";
                const sign = isPositive ? "+" : "";

                const varianceEl = document.createElement("div");
                varianceEl.className = `kpi-mini-card__variance ${cls}`;
                varianceEl.style.color = color;

                const arrowEl = document.createElement("span");
                arrowEl.className = "kpi-mini-card__arrow";
                arrowEl.textContent = arrow;

                const pctEl = document.createElement("span");
                pctEl.textContent = `${sign}${pct.toFixed(1)}%`;

                varianceEl.append(arrowEl, pctEl);
                cardEl.appendChild(varianceEl);
            }

            fragment.appendChild(cardEl);
        }

        this.container.replaceChildren(fragment);

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
            const finalText = this.formatNumber(targetNum, decimals, displayUnits, dp.format);
            const duration = 700;
            const delay = idx * 80;
            const start = performance.now() + delay;

            el.textContent = this.formatNumber(0, decimals, displayUnits, dp.format);

            const step = (now: number) => {
                if (now < start) { this.animationFrames[idx] = requestAnimationFrame(step); return; }
                const elapsed = now - start;
                const progress = Math.min(elapsed / duration, 1);
                const eased = 1 - Math.pow(1 - progress, 3);
                const current = targetNum * eased;

                el.textContent = this.formatNumber(current, decimals, displayUnits, dp.format);

                if (progress < 1) {
                    this.animationFrames[idx] = requestAnimationFrame(step);
                } else {
                    el.textContent = finalText;
                }
            };

            this.animationFrames[idx] = requestAnimationFrame(step);
        });
    }

    private extractCurrencySymbol(format: string): string {
        if (!format) return "";
        const unescaped = format.replace(/\\(.)/g, "$1");
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
        const safeDisplayUnits = Number.isFinite(displayUnits) ? Math.trunc(displayUnits) : 0;

        let unit = "";
        let divisor = 1;

        if (safeDisplayUnits === 0) {
            const abs = Math.abs(safeValue);
            if (abs >= 1e9) { divisor = 1e9; unit = "B"; }
            else if (abs >= 1e6) { divisor = 1e6; unit = "M"; }
            else if (abs >= 1e3) { divisor = 1e3; unit = "K"; }
        } else if (safeDisplayUnits === 1) {
            // None
        } else if (safeDisplayUnits >= 1000) {
            divisor = safeDisplayUnits;
            if (safeDisplayUnits === 1e3) unit = "K";
            else if (safeDisplayUnits === 1e6) unit = "M";
            else if (safeDisplayUnits === 1e9) unit = "B";
        }

        const prefix = this.extractCurrencySymbol(format || "");
        const formatted = (safeValue / divisor).toFixed(safeDecimals);
        return prefix + formatted + unit;
    }

    private renderMessage(message: string): void {
        const messageEl = document.createElement("div");
        messageEl.className = "kpi-mini-card__title";
        messageEl.textContent = message;
        this.container.replaceChildren(messageEl);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
