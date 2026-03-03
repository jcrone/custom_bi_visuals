"use strict";

import powerbi from "powerbi-visuals-api";
import { FormattingSettingsService } from "powerbi-visuals-utils-formattingmodel";
import * as d3 from "d3";
import "./../style/visual.less";

import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import DataView = powerbi.DataView;

import { VisualFormattingSettingsModel } from "./settings";

interface PulseRow {
    name: string;
    color: string;
    values: number[];
}

const PALETTE = [
    "#00539A", "#11284C", "#004896", "#FDB945",
    "#2F6FB3", "#1D3A66", "#0E7C3A", "#B42318",
    "#6B7F93", "#A8B7C6"
];

export class Visual implements IVisual {
    private target: HTMLElement;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;

        this.svg = d3.select(this.target)
            .append("svg")
            .classed("pulse-map", true);

        this.tooltip = d3.select(this.target)
            .append("div")
            .classed("pulse-tooltip", true);
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews?.[0]
        );

        const dataView: DataView | undefined = options.dataViews?.[0];
        if (!dataView?.categorical?.categories?.length || !dataView?.categorical?.values?.length) {
            this.renderMessage("Drop fields: Entity, Axis, and Values");
            return;
        }

        const categorical = dataView.categorical;
        const periods: string[] = categorical.categories![0].values.map(v => String(v));
        const valueColumns = categorical.values!;

        const rows: PulseRow[] = [];
        for (const col of valueColumns) {
            const name = col.source.groupName != null
                ? String(col.source.groupName)
                : col.source.displayName;
            const vals = col.values.map(v => Number(v) || 0);
            rows.push({
                name,
                color: PALETTE[rows.length % PALETTE.length],
                values: vals
            });
        }

        if (rows.length === 0) {
            this.renderMessage("No data");
            return;
        }

        this.render(rows, periods, options.viewport);
    }

    private render(rows: PulseRow[], periods: string[], viewport: powerbi.IViewport) {
        const width = viewport.width;
        const height = viewport.height;
        const pulseS = this.formattingSettings.pulseSettings;
        const layoutS = this.formattingSettings.layoutSettings;

        const labelWidth = layoutS.showLabels.value ? 80 : 0;
        const topMargin = layoutS.showPeriods.value ? 28 : 10;
        const margin = { top: topMargin, right: 16, bottom: 10, left: labelWidth + 10 };
        const plotW = Math.max(40, width - margin.left - margin.right);
        const plotH = Math.max(40, height - margin.top - margin.bottom);

        this.svg.attr("width", width).attr("height", height);
        this.svg.selectAll("*").remove();

        const g = this.svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const rowSpacing = layoutS.rowSpacing.value;
        const rowHeight = Math.max(20, (plotH - rowSpacing * (rows.length - 1)) / rows.length);
        const maxValue = Math.max(...rows.flatMap(r => r.values), 1);
        const spikeH = rowHeight * 0.42;
        const periodSpacing = periods.length > 1 ? plotW / (periods.length - 1) : plotW;
        const spikeWidthPct = pulseS.spikeWidth.value / 100;

        // Period labels
        if (layoutS.showPeriods.value) {
            const step = Math.max(1, Math.ceil(periods.length / (plotW / 50)));
            periods.forEach((p, i) => {
                if (i % step !== 0 && i !== periods.length - 1) return;
                const x = periods.length > 1 ? (i / (periods.length - 1)) * plotW : plotW / 2;
                g.append("text")
                    .attr("class", "pulse-period")
                    .attr("x", x)
                    .attr("y", -8)
                    .attr("text-anchor", "middle")
                    .text(p);
            });
        }

        const tooltipDiv = this.tooltip;
        const allGroups: d3.Selection<SVGGElement, unknown, null, undefined>[] = [];

        rows.forEach((row, ri) => {
            const rowY = ri * (rowHeight + rowSpacing);
            const baseY = rowY + rowHeight / 2;
            const rg = g.append("g").attr("class", "pulse-row");

            // Baseline
            rg.append("line")
                .attr("class", "pulse-baseline")
                .attr("x1", 0)
                .attr("x2", plotW)
                .attr("y1", baseY)
                .attr("y2", baseY);

            // Entity label
            if (layoutS.showLabels.value) {
                rg.append("text")
                    .attr("class", "pulse-label")
                    .attr("x", -8)
                    .attr("y", baseY)
                    .attr("text-anchor", "end")
                    .attr("dominant-baseline", "central")
                    .attr("fill", row.color)
                    .text(row.name);
            }

            // Build EKG pulse path
            const path = this.buildPulsePath(
                row.values, periods.length, plotW, baseY, maxValue, spikeH, periodSpacing, spikeWidthPct
            );

            const pathEl = rg.append("path")
                .attr("class", "pulse-line")
                .attr("d", path)
                .attr("stroke", row.color)
                .attr("stroke-width", pulseS.lineWidth.value)
                .attr("fill", "none")
                .attr("stroke-linecap", "round")
                .attr("stroke-linejoin", "round");

            // Draw-on animation
            const pathNode = pathEl.node() as SVGPathElement;
            const len = pathNode.getTotalLength();
            pathEl
                .attr("stroke-dasharray", `${len} ${len}`)
                .attr("stroke-dashoffset", len)
                .transition()
                .duration(1800)
                .delay(ri * 200)
                .ease(d3.easeLinear)
                .attr("stroke-dashoffset", 0);

            // Hover hit area
            rg.append("rect")
                .attr("x", 0).attr("y", rowY)
                .attr("width", plotW).attr("height", rowHeight)
                .attr("fill", "transparent")
                .style("cursor", "pointer")
                .on("mouseenter", () => {
                    allGroups.forEach((ag, idx) => {
                        ag.transition().duration(150)
                            .attr("opacity", idx === ri ? 1 : 0.15);
                    });
                })
                .on("mouseleave", () => {
                    allGroups.forEach(ag => {
                        ag.transition().duration(150).attr("opacity", 1);
                    });
                    tooltipDiv.style("opacity", "0");
                })
                .on("mousemove", (event: MouseEvent) => {
                    const [mx] = d3.pointer(event, g.node());
                    let nearestIdx = 0;
                    let nearestDist = Infinity;
                    for (let i = 0; i < periods.length; i++) {
                        const px = periods.length > 1 ? (i / (periods.length - 1)) * plotW : plotW / 2;
                        const dist = Math.abs(mx - px);
                        if (dist < nearestDist) { nearestDist = dist; nearestIdx = i; }
                    }
                    this.showTooltip(
                        tooltipDiv, row.name, periods[nearestIdx], row.values[nearestIdx],
                        event.offsetX + 14, event.offsetY - 30
                    );
                });

            allGroups.push(rg);
        });
    }

    private buildPulsePath(
        values: number[], count: number, plotW: number,
        baseY: number, maxVal: number, spikeH: number,
        spacing: number, widthPct: number
    ): string {
        const halfSpike = (spacing * widthPct) / 2;
        let d = `M 0 ${baseY}`;

        for (let i = 0; i < count; i++) {
            const x = count > 1 ? (i / (count - 1)) * plotW : plotW / 2;
            const norm = maxVal > 0 ? values[i] / maxVal : 0;
            const peak = norm * spikeH;

            // Flat approach
            d += ` L ${x - halfSpike * 1.8} ${baseY}`;
            // Q-wave dip
            d += ` L ${x - halfSpike * 1.1} ${baseY + 3}`;
            // R-wave peak (main spike up)
            d += ` L ${x} ${baseY - peak}`;
            // S-wave undershoot
            d += ` L ${x + halfSpike * 0.7} ${baseY + 4}`;
            // T-wave bump
            d += ` L ${x + halfSpike * 1.3} ${baseY - peak * 0.1}`;
            // Return to baseline
            d += ` L ${x + halfSpike * 1.8} ${baseY}`;
        }

        d += ` L ${plotW} ${baseY}`;
        return d;
    }

    private showTooltip(
        tip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
        name: string, period: string, value: number,
        x: number, y: number
    ): void {
        const el = tip.node()!;
        el.textContent = "";

        const nameEl = document.createElement("strong");
        nameEl.textContent = name;
        el.appendChild(nameEl);
        el.appendChild(document.createElement("br"));
        el.appendChild(document.createTextNode(period));
        el.appendChild(document.createElement("br"));

        const valEl = document.createElement("strong");
        valEl.textContent = this.formatValue(value);
        el.appendChild(document.createTextNode("Value: "));
        el.appendChild(valEl);

        tip.style("opacity", "1")
            .style("left", x + "px")
            .style("top", y + "px");
    }

    private formatValue(value: number): string {
        const abs = Math.abs(value);
        if (abs >= 1e9) return (value / 1e9).toFixed(1) + "B";
        if (abs >= 1e6) return (value / 1e6).toFixed(1) + "M";
        if (abs >= 1e3) return (value / 1e3).toFixed(1) + "K";
        return new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 0, maximumFractionDigits: 2
        }).format(value);
    }

    private renderMessage(message: string): void {
        this.svg.selectAll("*").remove();
        this.svg.attr("width", "100%").attr("height", "100%");
        this.svg.append("text")
            .attr("class", "pulse-message")
            .attr("x", "50%").attr("y", "50%")
            .attr("text-anchor", "middle").attr("dy", "0.35em")
            .text(message);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
