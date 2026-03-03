"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;

import { VisualFormattingSettingsModel } from "./settings";

const SVG_NS = "http://www.w3.org/2000/svg";

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
        this.container.className = "radial-gauge";
        this.target.appendChild(this.container);
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews?.[0]
        );

        const dataView: DataView | undefined = options.dataViews?.[0];
        if (!dataView?.categorical?.values) {
            this.renderMessage("Drop a measure");
            return;
        }

        const categorical = dataView.categorical;
        const values = categorical.values;
        let mainValue: number | null = null;
        let targetValue: number | null = null;
        let maxVal: number | null = null;
        let minVal: number | null = null;
        let measureName = "";
        let valueFormat = "";

        for (const col of values) {
            const role = col.source.roles;
            if (role["value"]) {
                measureName = col.source.displayName;
                valueFormat = col.source.format || "";
                mainValue = (col.values as number[]).reduce((sum, v) => sum + (Number(v) || 0), 0);
            }
            if (role["target"]) {
                targetValue = (col.values as number[]).reduce((sum, v) => sum + (Number(v) || 0), 0);
            }
            if (role["maxValue"]) {
                maxVal = (col.values as number[]).reduce((sum, v) => sum + (Number(v) || 0), 0);
            }
            if (role["minValue"]) {
                minVal = (col.values as number[]).reduce((sum, v) => sum + (Number(v) || 0), 0);
            }
        }

        if (mainValue === null || mainValue === undefined) {
            this.renderMessage("Drop a measure");
            return;
        }

        const gaugeS = this.formattingSettings.gaugeSettings;
        const threshS = this.formattingSettings.thresholdSettings;
        const varS = this.formattingSettings.varianceSettings;

        const gaugeMin = minVal ?? 0;
        const gaugeMax = maxVal ?? 100;
        const range = gaugeMax - gaugeMin || 1;
        const pct = Math.max(0, Math.min(1, (mainValue - gaugeMin) / range));

        const titleText = gaugeS.title.value || measureName;
        const decimals = gaugeS.decimalPlaces.value;
        const displayUnits = Number(gaugeS.displayUnits.value?.value ?? 1);
        const thickness = gaugeS.thickness.value;
        const startAngleDeg = gaugeS.startAngle.value;
        const endAngleDeg = gaugeS.endAngle.value;
        const arcColor = gaugeS.arcColor.value.value;
        const trackColor = gaugeS.trackColor.value.value;

        // Viewport
        const vpW = options.viewport.width;
        const vpH = options.viewport.height;

        this.container.replaceChildren();

        // Title
        if (gaugeS.showTitle.value) {
            const titleEl = document.createElement("div");
            titleEl.className = "radial-gauge__title";
            titleEl.textContent = titleText;
            this.container.appendChild(titleEl);
        }

        // SVG gauge
        const svgSize = Math.min(vpW - 16, vpH - 80, 400);
        const cx = svgSize / 2;
        const cy = svgSize / 2;
        const radius = (svgSize - thickness - 4) / 2;

        const svg = document.createElementNS(SVG_NS, "svg");
        svg.setAttribute("class", "radial-gauge__svg");
        svg.setAttribute("width", String(svgSize));
        svg.setAttribute("height", String(svgSize));
        svg.setAttribute("viewBox", `0 0 ${svgSize} ${svgSize}`);

        const startRad = (startAngleDeg * Math.PI) / 180;
        const endRad = (endAngleDeg * Math.PI) / 180;
        const totalArcAngle = endRad - startRad;

        // Threshold bands (rendered behind the fill arc)
        if (threshS.showThresholds.value) {
            const dangerPct = threshS.dangerPercent.value / 100;
            const warningPct = threshS.warningPercent.value / 100;

            // Danger band: 0% → dangerPct
            this.appendArc(svg, cx, cy, radius, startRad, startRad + totalArcAngle * dangerPct,
                thickness, threshS.dangerColor.value.value, 0.18);

            // Warning band: dangerPct → warningPct
            if (warningPct > dangerPct) {
                this.appendArc(svg, cx, cy, radius,
                    startRad + totalArcAngle * dangerPct,
                    startRad + totalArcAngle * warningPct,
                    thickness, threshS.warningColor.value.value, 0.18);
            }

            // Good band: warningPct → 100%
            this.appendArc(svg, cx, cy, radius,
                startRad + totalArcAngle * warningPct,
                endRad,
                thickness, arcColor, 0.08);
        } else {
            // Background track
            this.appendArc(svg, cx, cy, radius, startRad, endRad, thickness, trackColor, 1);
        }

        // Fill arc — determine color based on thresholds
        let fillColor = arcColor;
        if (threshS.showThresholds.value) {
            const pct100 = pct * 100;
            if (pct100 < threshS.dangerPercent.value) {
                fillColor = threshS.dangerColor.value.value;
            } else if (pct100 < threshS.warningPercent.value) {
                fillColor = threshS.warningColor.value.value;
            }
        }

        const fillEndRad = startRad + totalArcAngle * pct;
        const fillArc = this.appendArc(svg, cx, cy, radius, startRad, fillEndRad, thickness, fillColor, 1);
        fillArc.classList.add("radial-gauge__fill");

        // Target needle
        if (targetValue !== null && targetValue !== undefined) {
            const targetPct = Math.max(0, Math.min(1, (targetValue - gaugeMin) / range));
            const targetAngle = startRad + totalArcAngle * targetPct;
            const needleInner = radius - thickness / 2 - 4;
            const needleOuter = radius + thickness / 2 + 4;

            const nx1 = cx + needleInner * Math.cos(targetAngle);
            const ny1 = cy + needleInner * Math.sin(targetAngle);
            const nx2 = cx + needleOuter * Math.cos(targetAngle);
            const ny2 = cy + needleOuter * Math.sin(targetAngle);

            const needle = document.createElementNS(SVG_NS, "line");
            needle.setAttribute("x1", nx1.toFixed(2));
            needle.setAttribute("y1", ny1.toFixed(2));
            needle.setAttribute("x2", nx2.toFixed(2));
            needle.setAttribute("y2", ny2.toFixed(2));
            needle.setAttribute("stroke", "#11284C");
            needle.setAttribute("stroke-width", "3");
            needle.setAttribute("stroke-linecap", "round");
            needle.classList.add("radial-gauge__needle");
            svg.appendChild(needle);
        }

        // Center value text
        const valueText = document.createElementNS(SVG_NS, "text");
        valueText.setAttribute("x", String(cx));
        valueText.setAttribute("y", String(cy - 2));
        valueText.setAttribute("class", "radial-gauge__value-text");
        valueText.textContent = this.formatNumber(mainValue, decimals, displayUnits, valueFormat);
        svg.appendChild(valueText);

        // Percentage text below value
        const pctText = document.createElementNS(SVG_NS, "text");
        pctText.setAttribute("x", String(cx));
        pctText.setAttribute("y", String(cy + 18));
        pctText.setAttribute("class", "radial-gauge__pct-text");
        pctText.textContent = `${(pct * 100).toFixed(1)}%`;
        svg.appendChild(pctText);

        // Min / Max labels at arc ends
        const labelOffset = radius + thickness / 2 + 16;

        const minX = cx + labelOffset * Math.cos(startRad);
        const minY = cy + labelOffset * Math.sin(startRad);
        const minLabel = document.createElementNS(SVG_NS, "text");
        minLabel.setAttribute("x", minX.toFixed(2));
        minLabel.setAttribute("y", minY.toFixed(2));
        minLabel.setAttribute("class", "radial-gauge__label");
        minLabel.textContent = this.formatNumber(gaugeMin, 0, displayUnits, valueFormat);
        svg.appendChild(minLabel);

        const maxX = cx + labelOffset * Math.cos(endRad);
        const maxY = cy + labelOffset * Math.sin(endRad);
        const maxLabel = document.createElementNS(SVG_NS, "text");
        maxLabel.setAttribute("x", maxX.toFixed(2));
        maxLabel.setAttribute("y", maxY.toFixed(2));
        maxLabel.setAttribute("class", "radial-gauge__label");
        maxLabel.textContent = this.formatNumber(gaugeMax, 0, displayUnits, valueFormat);
        svg.appendChild(maxLabel);

        this.container.appendChild(svg);

        // Variance (below gauge)
        if (varS.showVariance.value && targetValue !== null && targetValue !== undefined) {
            const delta = mainValue - targetValue;
            const variancePct = targetValue !== 0 ? (delta / Math.abs(targetValue)) * 100 : 0;
            const isPositive = delta >= 0;
            const color = isPositive ? varS.positiveColor.value.value : varS.negativeColor.value.value;
            const arrow = isPositive ? "\u25B2" : "\u25BC";
            const sign = isPositive ? "+" : "";

            const varianceEl = document.createElement("div");
            varianceEl.className = `radial-gauge__variance ${isPositive ? "radial-gauge__variance--positive" : "radial-gauge__variance--negative"}`;
            varianceEl.style.color = color;

            const arrowEl = document.createElement("span");
            arrowEl.className = "radial-gauge__variance-arrow";
            arrowEl.textContent = arrow;

            const pctEl = document.createElement("span");
            pctEl.textContent = `${sign}${variancePct.toFixed(1)}%`;

            const vsEl = document.createElement("span");
            vsEl.className = "radial-gauge__variance-target";
            vsEl.textContent = `vs ${this.formatNumber(targetValue, decimals, displayUnits, valueFormat)}`;

            varianceEl.append(arrowEl, pctEl, vsEl);
            this.container.appendChild(varianceEl);
        }

        // Animate fill arc
        this.animateArc(fillArc, startRad, fillEndRad, cx, cy, radius, thickness);

        // Animate count-up for center value
        this.animateCountUp(mainValue, decimals, displayUnits, valueFormat, pct);
    }

    private appendArc(
        svg: SVGSVGElement,
        cx: number, cy: number, r: number,
        startRad: number, endRad: number,
        strokeWidth: number, color: string, opacity: number
    ): SVGPathElement {
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", this.describeArc(cx, cy, r, startRad, endRad));
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", String(strokeWidth));
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("opacity", String(opacity));
        svg.appendChild(path);
        return path;
    }

    private describeArc(cx: number, cy: number, r: number, startRad: number, endRad: number): string {
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const largeArc = (endRad - startRad) > Math.PI ? 1 : 0;
        return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
    }

    private animateArc(
        path: SVGPathElement, startRad: number, endRad: number,
        cx: number, cy: number, r: number, thickness: number
    ): void {
        const duration = 900;
        const startTime = performance.now();

        const step = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic

            const currentEnd = startRad + (endRad - startRad) * eased;
            path.setAttribute("d", this.describeArc(cx, cy, r, startRad, currentEnd));

            if (progress < 1) {
                requestAnimationFrame(step);
            }
        };

        requestAnimationFrame(step);
    }

    private animateCountUp(
        targetNum: number, decimals: number, displayUnits: number,
        format: string, targetPct: number
    ): void {
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);

        const valueEl = this.container.querySelector(".radial-gauge__value-text") as SVGTextElement;
        const pctEl = this.container.querySelector(".radial-gauge__pct-text") as SVGTextElement;
        if (!valueEl) return;

        const duration = 900;
        const start = performance.now();

        const step = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);

            const current = targetNum * eased;
            valueEl.textContent = this.formatNumber(current, decimals, displayUnits, format);
            if (pctEl) {
                pctEl.textContent = `${(targetPct * 100 * eased).toFixed(1)}%`;
            }

            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(step);
            } else {
                valueEl.textContent = this.formatNumber(targetNum, decimals, displayUnits, format);
                if (pctEl) {
                    pctEl.textContent = `${(targetPct * 100).toFixed(1)}%`;
                }
                this.animationFrame = 0;
            }
        };

        valueEl.textContent = this.formatNumber(0, decimals, displayUnits, format);
        if (pctEl) pctEl.textContent = "0.0%";
        this.animationFrame = requestAnimationFrame(step);
    }

    private extractCurrencySymbol(format: string): string {
        if (!format) return "";
        const unescaped = format.replace(/\\(.)/g, "$1");
        const tokenMatch = unescaped.match(/\[\$([^\]-]+)-[^\]]+\]/);
        if (tokenMatch?.[1]) return tokenMatch[1];
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
            const abs = Math.abs(safeValue);
            if (abs >= 1e9) { divisor = 1e9; unit = "B"; }
            else if (abs >= 1e6) { divisor = 1e6; unit = "M"; }
            else if (abs >= 1e3) { divisor = 1e3; unit = "K"; }
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
            case 0: case 1: case 1000: case 1000000: case 1000000000: return normalized;
            default: return 0;
        }
    }

    private renderMessage(message: string): void {
        const messageEl = document.createElement("div");
        messageEl.className = "radial-gauge__title";
        messageEl.textContent = message;
        this.container.replaceChildren(messageEl);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
