"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import * as d3 from "d3";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

import { VisualFormattingSettingsModel } from "./settings";

interface BulletRow {
    category: string;
    value: number;
    target: number | null;
    maximum: number | null;
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private host: IVisualHost;
    private lastDataHash: string = "";

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.host = options.host;
        this.target = options.element;

        this.svg = d3.select(this.target)
            .append("svg")
            .classed("bullet-chart", true);

        this.tooltip = d3.select(this.target)
            .append("div")
            .classed("bullet-tooltip", true);
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews?.[0]
        );

        const dataView: DataView | undefined = options.dataViews?.[0];
        if (!dataView?.categorical?.categories?.length || !dataView?.categorical?.values?.length) {
            this.renderMessage("Drop fields: Category, Value, and optionally Target");
            return;
        }

        const rows = this.extractData(dataView);
        if (rows.length === 0) {
            this.renderMessage("No data to display");
            return;
        }

        // Skip animations on resize-only updates
        const dataHash = JSON.stringify(rows);
        const animate = dataHash !== this.lastDataHash;
        this.lastDataHash = dataHash;

        const isVertical = this.formattingSettings.bulletSettings.orientation.value?.value === "vertical";
        if (isVertical) {
            this.renderVertical(rows, options.viewport, animate);
        } else {
            this.renderHorizontal(rows, options.viewport, animate);
        }
    }

    private extractData(dataView: DataView): BulletRow[] {
        const categorical = dataView.categorical!;
        const categories = categorical.categories![0];
        const valueColumns = categorical.values!;

        let valueCol: powerbi.DataViewValueColumn | undefined;
        let targetCol: powerbi.DataViewValueColumn | undefined;
        let maximumCol: powerbi.DataViewValueColumn | undefined;

        for (const col of valueColumns) {
            const role = col.source.roles;
            if (role?.["value"]) valueCol = col;
            if (role?.["target"]) targetCol = col;
            if (role?.["maximum"]) maximumCol = col;
        }

        if (!valueCol) return [];

        const rows: BulletRow[] = [];
        for (let i = 0; i < categories.values.length; i++) {
            const rawVal = valueCol.values[i];
            const rawTarget = targetCol ? targetCol.values[i] : null;
            const rawMax = maximumCol ? maximumCol.values[i] : null;

            rows.push({
                category: categories.values[i] != null ? String(categories.values[i]) : `Row ${i + 1}`,
                value: rawVal != null ? Number(rawVal) : 0,
                target: rawTarget != null ? Number(rawTarget) : null,
                maximum: rawMax != null ? Number(rawMax) : null
            });
        }
        return rows;
    }

    private renderHorizontal(rows: BulletRow[], viewport: powerbi.IViewport, animate: boolean) {
        const width = viewport.width;
        const height = viewport.height;
        const bulletS = this.formattingSettings.bulletSettings;
        const rangeS = this.formattingSettings.rangeSettings;
        const labelS = this.formattingSettings.labelSettings;
        const layoutS = this.formattingSettings.layoutSettings;
        const isDark = layoutS.darkMode.value;
        const dur = animate ? 800 : 0;

        this.svg
            .attr("width", width)
            .attr("height", height)
            .classed("bullet-chart--dark", isDark);
        this.svg.selectAll("*").remove();

        const labelWidth = labelS.showLabels.value ? 100 : 0;
        const valueWidth = labelS.showValues.value ? 60 : 0;
        const axisHeight = labelS.showAxis.value ? 24 : 0;
        const margin = { top: 8, right: valueWidth + 12, bottom: axisHeight + 8, left: labelWidth + 8 };

        const plotWidth = Math.max(40, width - margin.left - margin.right);
        const plotHeight = Math.max(40, height - margin.top - margin.bottom);

        const spacing = bulletS.spacing.value;
        const barThickness = bulletS.barThickness.value;
        const nominalRangeHeight = barThickness * 2.5;
        const nominalRowHeight = nominalRangeHeight + spacing;

        // Auto-fit: shrink rows if they'd overflow viewport
        const maxRowHeight = plotHeight / rows.length;
        const rowHeight = Math.min(nominalRowHeight, maxRowHeight);
        const rangeHeight = Math.max(8, rowHeight - spacing);

        const g = this.svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const globalMax = this.getGlobalMax(rows);
        // When axis is shown, force all rows to the same scale for consistency
        const useGlobalScale = labelS.showAxis.value;

        const tooltipDiv = this.tooltip;

        // Ensure poor < satisfactory thresholds
        const poorPct = Math.min(rangeS.poorThreshold.value, rangeS.satisfactoryThreshold.value - 1) / 100;
        const satPct = rangeS.satisfactoryThreshold.value / 100;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const y = i * rowHeight;
            const rowMax = useGlobalScale ? globalMax : (row.maximum ?? globalMax);
            const rowScale = d3.scaleLinear().domain([0, rowMax]).range([0, plotWidth]);
            const effectiveBarThickness = Math.min(barThickness, rangeHeight * 0.6);
            const centerY = y + rangeHeight / 2;

            const rowG = g.append("g").attr("class", "bullet-row");

            // Qualitative range bands
            if (rangeS.showRanges.value) {
                const poorEnd = poorPct * rowMax;
                const satEnd = satPct * rowMax;

                // Good range (full background)
                rowG.append("rect")
                    .attr("class", "bullet-range")
                    .attr("x", 0).attr("y", y)
                    .attr("width", rowScale(rowMax))
                    .attr("height", rangeHeight)
                    .attr("fill", rangeS.goodColor.value.value)
                    .attr("rx", 2);

                // Satisfactory range
                rowG.append("rect")
                    .attr("class", "bullet-range")
                    .attr("x", 0).attr("y", y)
                    .attr("width", rowScale(satEnd))
                    .attr("height", rangeHeight)
                    .attr("fill", rangeS.satisfactoryColor.value.value)
                    .attr("rx", 2);

                // Poor range
                rowG.append("rect")
                    .attr("class", "bullet-range")
                    .attr("x", 0).attr("y", y)
                    .attr("width", rowScale(poorEnd))
                    .attr("height", rangeHeight)
                    .attr("fill", rangeS.poorColor.value.value)
                    .attr("rx", 2);
            } else {
                rowG.append("rect")
                    .attr("class", "bullet-range")
                    .attr("x", 0).attr("y", y)
                    .attr("width", rowScale(rowMax))
                    .attr("height", rangeHeight)
                    .attr("fill", isDark ? "#1A2942" : "#E8EEF5")
                    .attr("rx", 2);
            }

            // Actual value bar (animated) — clamp negatives to zero
            const barY = centerY - effectiveBarThickness / 2;
            const barWidth = rowScale(Math.max(0, Math.min(row.value, rowMax)));

            const barRect = rowG.append("rect")
                .attr("class", "bullet-bar")
                .attr("x", 0).attr("y", barY)
                .attr("height", effectiveBarThickness)
                .attr("fill", bulletS.barColor.value.value)
                .attr("rx", 2);

            if (animate) {
                barRect
                    .attr("width", 0)
                    .transition()
                    .duration(dur)
                    .ease(d3.easeCubicOut)
                    .attr("width", barWidth);
            } else {
                barRect.attr("width", barWidth);
            }

            // Target marker (appears after bar animation)
            if (row.target !== null) {
                const tx = rowScale(Math.max(0, Math.min(row.target, rowMax)));
                const markerHeight = rangeHeight * 0.8;

                const targetLine = rowG.append("line")
                    .attr("class", "bullet-target")
                    .attr("x1", tx).attr("x2", tx)
                    .attr("y1", centerY - markerHeight / 2)
                    .attr("y2", centerY + markerHeight / 2)
                    .attr("stroke", bulletS.targetColor.value.value)
                    .attr("stroke-width", bulletS.targetWidth.value);

                if (animate) {
                    targetLine
                        .attr("opacity", 0)
                        .transition()
                        .delay(dur)
                        .duration(300)
                        .attr("opacity", 1);
                }
            }

            // Category label (truncate long names)
            if (labelS.showLabels.value) {
                const maxChars = Math.floor(labelWidth / (labelS.fontSize.value * 0.55));
                const displayName = row.category.length > maxChars
                    ? row.category.slice(0, maxChars - 1) + "\u2026"
                    : row.category;

                const labelEl = rowG.append("text")
                    .attr("class", "bullet-category")
                    .attr("x", -8)
                    .attr("y", centerY)
                    .attr("text-anchor", "end")
                    .attr("dy", "0.35em")
                    .style("font-size", labelS.fontSize.value + "px")
                    .text(displayName);

                // Full name on hover via title
                if (row.category.length > maxChars) {
                    labelEl.append("title").text(row.category);
                }
            }

            // Value label
            if (labelS.showValues.value) {
                const formattedVal = this.formatValue(row.value, labelS.decimalPlaces.value, labelS.displayUnits.value?.value);
                const valEl = rowG.append("text")
                    .attr("class", "bullet-value")
                    .attr("x", plotWidth + 8)
                    .attr("y", centerY)
                    .attr("text-anchor", "start")
                    .attr("dy", "0.35em")
                    .style("font-size", labelS.fontSize.value + "px")
                    .text(formattedVal);

                if (animate) {
                    valEl
                        .attr("opacity", 0)
                        .transition()
                        .delay(dur)
                        .duration(300)
                        .attr("opacity", 1);
                }
            }

            // Hover interaction
            rowG.append("rect")
                .attr("x", 0).attr("y", y)
                .attr("width", plotWidth)
                .attr("height", rangeHeight)
                .attr("fill", "transparent")
                .style("cursor", "pointer")
                .on("mouseenter", (event: MouseEvent) => {
                    const formattedVal = this.formatValue(row.value, labelS.decimalPlaces.value, labelS.displayUnits.value?.value);
                    const formattedTarget = row.target !== null
                        ? this.formatValue(row.target, labelS.decimalPlaces.value, labelS.displayUnits.value?.value)
                        : null;
                    this.showTooltip(tooltipDiv, row.category, formattedVal, formattedTarget, event.offsetX + 14, event.offsetY - 30);
                })
                .on("mousemove", (event: MouseEvent) => {
                    tooltipDiv
                        .style("left", (event.offsetX + 14) + "px")
                        .style("top", (event.offsetY - 30) + "px");
                })
                .on("mouseleave", () => {
                    tooltipDiv.style("opacity", "0");
                });
        }

        // Value axis
        if (labelS.showAxis.value) {
            const axisScale = d3.scaleLinear().domain([0, globalMax]).range([0, plotWidth]);
            const axis = d3.axisBottom(axisScale).ticks(5).tickFormat(d => this.formatValue(d as number, 0, labelS.displayUnits.value?.value));
            const axisY = rows.length * rowHeight;

            g.append("g")
                .attr("class", "bullet-axis")
                .attr("transform", `translate(0,${axisY})`)
                .call(axis);
        }
    }

    private renderVertical(rows: BulletRow[], viewport: powerbi.IViewport, animate: boolean) {
        const width = viewport.width;
        const height = viewport.height;
        const bulletS = this.formattingSettings.bulletSettings;
        const rangeS = this.formattingSettings.rangeSettings;
        const labelS = this.formattingSettings.labelSettings;
        const layoutS = this.formattingSettings.layoutSettings;
        const isDark = layoutS.darkMode.value;
        const dur = animate ? 800 : 0;

        this.svg
            .attr("width", width)
            .attr("height", height)
            .classed("bullet-chart--dark", isDark);
        this.svg.selectAll("*").remove();

        const labelHeight = labelS.showLabels.value ? 24 : 0;
        const valueHeight = labelS.showValues.value ? 18 : 0;
        const axisWidth = labelS.showAxis.value ? 40 : 0;
        const margin = { top: valueHeight + 4, right: 8, bottom: labelHeight + 8, left: axisWidth + 8 };

        const plotWidth = Math.max(40, width - margin.left - margin.right);
        const plotHeight = Math.max(40, height - margin.top - margin.bottom);

        const spacing = bulletS.spacing.value;
        const barThickness = bulletS.barThickness.value;
        const nominalRangeWidth = barThickness * 2.5;
        const nominalColWidth = nominalRangeWidth + spacing;

        // Auto-fit: shrink columns if they'd overflow
        const maxColWidth = plotWidth / rows.length;
        const colWidth = Math.min(nominalColWidth, maxColWidth);
        const rangeWidth = Math.max(8, colWidth - spacing);

        const g = this.svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const globalMax = this.getGlobalMax(rows);
        const useGlobalScale = labelS.showAxis.value;
        const tooltipDiv = this.tooltip;

        const poorPct = Math.min(rangeS.poorThreshold.value, rangeS.satisfactoryThreshold.value - 1) / 100;
        const satPct = rangeS.satisfactoryThreshold.value / 100;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const x = i * colWidth;
            const rowMax = useGlobalScale ? globalMax : (row.maximum ?? globalMax);
            const yScale = d3.scaleLinear().domain([0, rowMax]).range([plotHeight, 0]);
            const effectiveBarThickness = Math.min(barThickness, rangeWidth * 0.6);
            const centerX = x + rangeWidth / 2;

            const colG = g.append("g").attr("class", "bullet-row");

            // Qualitative range bands (vertical: bottom to top)
            if (rangeS.showRanges.value) {
                const poorEnd = poorPct * rowMax;
                const satEnd = satPct * rowMax;

                // Good range (full background)
                colG.append("rect")
                    .attr("class", "bullet-range")
                    .attr("x", x).attr("y", 0)
                    .attr("width", rangeWidth)
                    .attr("height", plotHeight)
                    .attr("fill", rangeS.goodColor.value.value)
                    .attr("rx", 2);

                // Satisfactory range
                colG.append("rect")
                    .attr("class", "bullet-range")
                    .attr("x", x).attr("y", yScale(satEnd))
                    .attr("width", rangeWidth)
                    .attr("height", plotHeight - yScale(satEnd))
                    .attr("fill", rangeS.satisfactoryColor.value.value)
                    .attr("rx", 2);

                // Poor range
                colG.append("rect")
                    .attr("class", "bullet-range")
                    .attr("x", x).attr("y", yScale(poorEnd))
                    .attr("width", rangeWidth)
                    .attr("height", plotHeight - yScale(poorEnd))
                    .attr("fill", rangeS.poorColor.value.value)
                    .attr("rx", 2);
            } else {
                colG.append("rect")
                    .attr("class", "bullet-range")
                    .attr("x", x).attr("y", 0)
                    .attr("width", rangeWidth)
                    .attr("height", plotHeight)
                    .attr("fill", isDark ? "#1A2942" : "#E8EEF5")
                    .attr("rx", 2);
            }

            // Actual value bar (vertical, animated) — clamp negatives to zero
            const barX = centerX - effectiveBarThickness / 2;
            const clampedVal = Math.max(0, Math.min(row.value, rowMax));
            const barHeight = plotHeight - yScale(clampedVal);

            const barRect = colG.append("rect")
                .attr("class", "bullet-bar")
                .attr("x", barX)
                .attr("width", effectiveBarThickness)
                .attr("fill", bulletS.barColor.value.value)
                .attr("rx", 2);

            if (animate) {
                barRect
                    .attr("y", plotHeight)
                    .attr("height", 0)
                    .transition()
                    .duration(dur)
                    .ease(d3.easeCubicOut)
                    .attr("y", plotHeight - barHeight)
                    .attr("height", barHeight);
            } else {
                barRect
                    .attr("y", plotHeight - barHeight)
                    .attr("height", barHeight);
            }

            // Target marker (horizontal line in vertical mode)
            if (row.target !== null) {
                const ty = yScale(Math.max(0, Math.min(row.target, rowMax)));
                const markerWidth = rangeWidth * 0.8;

                const targetLine = colG.append("line")
                    .attr("class", "bullet-target")
                    .attr("x1", centerX - markerWidth / 2)
                    .attr("x2", centerX + markerWidth / 2)
                    .attr("y1", ty).attr("y2", ty)
                    .attr("stroke", bulletS.targetColor.value.value)
                    .attr("stroke-width", bulletS.targetWidth.value);

                if (animate) {
                    targetLine
                        .attr("opacity", 0)
                        .transition()
                        .delay(dur)
                        .duration(300)
                        .attr("opacity", 1);
                }
            }

            // Category label (below)
            if (labelS.showLabels.value) {
                colG.append("text")
                    .attr("class", "bullet-category")
                    .attr("x", centerX)
                    .attr("y", plotHeight + 16)
                    .attr("text-anchor", "middle")
                    .style("font-size", Math.min(labelS.fontSize.value, 11) + "px")
                    .text(row.category);
            }

            // Value label (above column)
            if (labelS.showValues.value) {
                const formattedVal = this.formatValue(row.value, labelS.decimalPlaces.value, labelS.displayUnits.value?.value);
                const valEl = colG.append("text")
                    .attr("class", "bullet-value")
                    .attr("x", centerX)
                    .attr("y", -4)
                    .attr("text-anchor", "middle")
                    .style("font-size", Math.min(labelS.fontSize.value, 11) + "px")
                    .text(formattedVal);

                if (animate) {
                    valEl
                        .attr("opacity", 0)
                        .transition()
                        .delay(dur)
                        .duration(300)
                        .attr("opacity", 1);
                }
            }

            // Hover interaction
            colG.append("rect")
                .attr("x", x).attr("y", 0)
                .attr("width", rangeWidth)
                .attr("height", plotHeight)
                .attr("fill", "transparent")
                .style("cursor", "pointer")
                .on("mouseenter", (event: MouseEvent) => {
                    const formattedVal = this.formatValue(row.value, labelS.decimalPlaces.value, labelS.displayUnits.value?.value);
                    const formattedTarget = row.target !== null
                        ? this.formatValue(row.target, labelS.decimalPlaces.value, labelS.displayUnits.value?.value)
                        : null;
                    this.showTooltip(tooltipDiv, row.category, formattedVal, formattedTarget, event.offsetX + 14, event.offsetY - 30);
                })
                .on("mousemove", (event: MouseEvent) => {
                    tooltipDiv
                        .style("left", (event.offsetX + 14) + "px")
                        .style("top", (event.offsetY - 30) + "px");
                })
                .on("mouseleave", () => {
                    tooltipDiv.style("opacity", "0");
                });
        }

        // Value axis (left side in vertical mode)
        if (labelS.showAxis.value) {
            const axisScale = d3.scaleLinear().domain([0, globalMax]).range([plotHeight, 0]);
            const axis = d3.axisLeft(axisScale).ticks(5).tickFormat(d => this.formatValue(d as number, 0, labelS.displayUnits.value?.value));

            g.append("g")
                .attr("class", "bullet-axis")
                .call(axis);
        }
    }

    private getGlobalMax(rows: BulletRow[]): number {
        let max = 0;
        for (const row of rows) {
            if (row.maximum !== null) {
                max = Math.max(max, row.maximum);
            } else {
                max = Math.max(max, row.value);
                if (row.target !== null) max = Math.max(max, row.target);
            }
        }
        const hasExplicitMax = rows.some(r => r.maximum !== null);
        // Add 10% headroom when auto-calculating; guard against zero
        return hasExplicitMax ? Math.max(max, 1) : Math.max(max * 1.1, 1);
    }

    private formatValue(value: number, decimals: number, displayUnit?: string | number): string {
        const unit = Number(displayUnit ?? "0");
        let scaled = value;
        let suffix = "";

        if (unit === 0) {
            // Auto
            const abs = Math.abs(value);
            if (abs >= 1e9) { scaled = value / 1e9; suffix = "B"; }
            else if (abs >= 1e6) { scaled = value / 1e6; suffix = "M"; }
            else if (abs >= 1e3) { scaled = value / 1e3; suffix = "K"; }
        } else if (unit > 1) {
            scaled = value / unit;
            if (unit === 1000) suffix = "K";
            else if (unit === 1000000) suffix = "M";
        }

        return new Intl.NumberFormat(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(scaled) + suffix;
    }

    private showTooltip(
        tip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
        category: string, formattedVal: string, formattedTarget: string | null,
        x: number, y: number
    ): void {
        const el = tip.node()!;
        el.textContent = "";

        const nameEl = document.createElement("strong");
        nameEl.textContent = category;
        el.appendChild(nameEl);
        el.appendChild(document.createElement("br"));

        el.appendChild(document.createTextNode("Value: "));
        const valEl = document.createElement("strong");
        valEl.textContent = formattedVal;
        el.appendChild(valEl);

        if (formattedTarget !== null) {
            el.appendChild(document.createElement("br"));
            el.appendChild(document.createTextNode("Target: "));
            const tgtEl = document.createElement("strong");
            tgtEl.textContent = formattedTarget;
            el.appendChild(tgtEl);
        }

        tip
            .style("opacity", "1")
            .style("left", x + "px")
            .style("top", y + "px");
    }

    private renderMessage(message: string): void {
        this.svg.selectAll("*").remove();
        this.svg
            .attr("width", "100%")
            .attr("height", "100%");
        this.svg.append("text")
            .attr("class", "bullet-message")
            .attr("x", "50%")
            .attr("y", "50%")
            .attr("text-anchor", "middle")
            .attr("dy", "0.35em")
            .text(message);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
