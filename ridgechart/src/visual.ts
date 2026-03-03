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

interface RidgeRow {
    name: string;
    values: number[];
    color: string;
}

const PALETTE = [
    "#00539A", "#004896", "#2F6FB3", "#11284C",
    "#1D3A66", "#6B7F93", "#FDB945", "#0E7C3A",
    "#A8B7C6", "#B42318"
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
            .classed("ridge-chart", true);

        this.tooltip = d3.select(this.target)
            .append("div")
            .classed("ridge-tooltip", true);
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews?.[0]
        );

        const dataView: DataView | undefined = options.dataViews?.[0];
        if (!dataView?.categorical?.categories?.length || !dataView?.categorical?.values?.length) {
            this.renderMessage("Drop fields: Series, Axis, and Values");
            return;
        }

        const categorical = dataView.categorical;
        const axisLabels: string[] = categorical.categories![0].values.map(v => String(v));
        const valueColumns = categorical.values!;

        const rows: RidgeRow[] = [];
        for (const col of valueColumns) {
            const name = col.source.groupName != null
                ? String(col.source.groupName) : col.source.displayName;
            rows.push({
                name,
                values: col.values.map(v => Number(v) || 0),
                color: PALETTE[rows.length % PALETTE.length]
            });
        }

        if (rows.length === 0) {
            this.renderMessage("No data");
            return;
        }

        this.render(rows, axisLabels, options.viewport);
    }

    private render(rows: RidgeRow[], axisLabels: string[], viewport: powerbi.IViewport) {
        const width = viewport.width;
        const height = viewport.height;
        const ridgeS = this.formattingSettings.ridgeSettings;
        const layoutS = this.formattingSettings.layoutSettings;

        const dark = layoutS.darkMode.value;
        const bgColor = dark ? "#0B1220" : "#FFFFFF";
        const textColor = dark ? "#F2F5F8" : "#11284C";
        const strokeColor = dark ? "#F2F5F8" : undefined; // undefined = use series color

        const labelW = layoutS.showLabels.value ? 70 : 0;
        const axisH = layoutS.showAxis.value ? 24 : 0;
        const margin = { top: 16, right: 16, bottom: axisH + 6, left: labelW + 10 };
        const plotW = Math.max(40, width - margin.left - margin.right);
        const plotH = Math.max(40, height - margin.top - margin.bottom);

        this.svg.attr("width", width).attr("height", height);
        this.svg.selectAll("*").interrupt().remove();
        this.tooltip.style("opacity", "0");

        // Background
        this.svg.append("rect")
            .attr("width", width).attr("height", height)
            .attr("fill", bgColor);

        const g = this.svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const overlapPct = ridgeS.overlap.value / 100;
        let maxVal = 1;
        for (const r of rows) {
            for (const v of r.values) { if (v > maxVal) maxVal = v; }
        }
        const nRows = rows.length;
        const baseRowH = plotH / nRows;
        const effectiveRowH = baseRowH * (1 + overlapPct);
        const ridgeHeight = effectiveRowH * 0.7;

        const xScale = d3.scaleLinear()
            .domain([0, Math.max(1, axisLabels.length - 1)])
            .range([0, plotW]);

        // Draw x-axis labels
        if (layoutS.showAxis.value) {
            const step = Math.max(1, Math.ceil(axisLabels.length / (plotW / 50)));
            axisLabels.forEach((label, i) => {
                if (i % step !== 0 && i !== axisLabels.length - 1) return;
                g.append("text")
                    .attr("class", "ridge-axis-label")
                    .attr("x", xScale(i))
                    .attr("y", plotH + 16)
                    .attr("text-anchor", "middle")
                    .attr("fill", dark ? "#94A6B8" : "#6B7F93")
                    .text(label);
            });
        }

        const fillOpacity = ridgeS.fillOpacity.value / 100;
        const strokeW = ridgeS.strokeWidth.value;
        const tooltipDiv = this.tooltip;

        // Draw ridges back-to-front (last row at back, first row at front)
        for (let ri = nRows - 1; ri >= 0; ri--) {
            const row = rows[ri];
            const relBaseY = (ri + 1) * baseRowH;

            // Build area path (line on top, flat baseline on bottom)
            const areaGen = d3.area<number>()
                .x((_d, i) => xScale(i))
                .y0(relBaseY)
                .y1((d) => relBaseY - (d / maxVal) * ridgeHeight)
                .curve(d3.curveBasis);

            const lineGen = d3.line<number>()
                .x((_d, i) => xScale(i))
                .y((d) => relBaseY - (d / maxVal) * ridgeHeight)
                .curve(d3.curveBasis);

            // Fill (opaque to mask ridges behind)
            g.append("path")
                .attr("d", areaGen(row.values))
                .attr("fill", dark ? bgColor : bgColor)
                .attr("opacity", 1);

            // Colored fill overlay
            g.append("path")
                .attr("d", areaGen(row.values))
                .attr("fill", row.color)
                .attr("opacity", fillOpacity)
                .attr("class", "ridge-area");

            // Stroke line
            const linePath = g.append("path")
                .attr("d", lineGen(row.values))
                .attr("stroke", strokeColor || row.color)
                .attr("stroke-width", strokeW)
                .attr("fill", "none")
                .attr("stroke-linecap", "round")
                .attr("stroke-linejoin", "round")
                .attr("class", "ridge-line");

            // Draw-on animation
            const pathNode = linePath.node() as SVGPathElement;
            const len = pathNode.getTotalLength();
            linePath
                .attr("stroke-dasharray", `${len} ${len}`)
                .attr("stroke-dashoffset", len)
                .transition()
                .duration(1400)
                .delay((nRows - 1 - ri) * 150)
                .ease(d3.easeCubicOut)
                .attr("stroke-dashoffset", 0);

            // Label
            if (layoutS.showLabels.value) {
                g.append("text")
                    .attr("class", "ridge-label")
                    .attr("x", -8)
                    .attr("y", relBaseY - ridgeHeight * 0.3)
                    .attr("text-anchor", "end")
                    .attr("dominant-baseline", "central")
                    .attr("fill", dark ? "#C9D3DD" : row.color)
                    .text(row.name);
            }

            // Hover hit area
            g.append("rect")
                .attr("x", 0).attr("y", relBaseY - ridgeHeight)
                .attr("width", plotW).attr("height", ridgeHeight + baseRowH * overlapPct)
                .attr("fill", "transparent")
                .style("cursor", "pointer")
                .on("mousemove", (event: MouseEvent) => {
                    const [mx] = d3.pointer(event, g.node());
                    const idx = Math.round(xScale.invert(mx));
                    const clampedIdx = Math.max(0, Math.min(axisLabels.length - 1, idx));
                    const rect = this.target.getBoundingClientRect();
                    this.showTooltip(tooltipDiv, row.name,
                        axisLabels[clampedIdx], row.values[clampedIdx] ?? 0,
                        event.clientX - rect.left + 14, event.clientY - rect.top - 30);
                })
                .on("mouseleave", () => {
                    tooltipDiv.style("opacity", "0");
                });
        }
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

        el.appendChild(document.createTextNode("Value: "));
        const valEl = document.createElement("strong");
        valEl.textContent = this.formatValue(value);
        el.appendChild(valEl);

        tip.style("opacity", "1")
            .style("left", x + "px").style("top", y + "px");
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
        this.svg.selectAll("*").interrupt().remove();
        this.svg.attr("width", "100%").attr("height", "100%");
        this.svg.append("text")
            .attr("class", "ridge-message")
            .attr("x", "50%").attr("y", "50%")
            .attr("text-anchor", "middle").attr("dy", "0.35em")
            .text(message);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
