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

interface BumpPoint {
    period: string;
    periodIndex: number;
    rank: number;
    value: number;
}

interface BumpSeries {
    name: string;
    color: string;
    points: BumpPoint[];
}

const BRAND_PALETTE = [
    "#00539A", "#11284C", "#004896", "#FDB945",
    "#2F6FB3", "#1D3A66", "#6B7F93", "#A8B7C6",
    "#0E7C3A", "#B42318"
];

export class Visual implements IVisual {
    private target: HTMLElement;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;
    private host: IVisualHost;

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.host = options.host;
        this.target = options.element;

        this.svg = d3.select(this.target)
            .append("svg")
            .classed("bump-chart", true);

        this.tooltip = d3.select(this.target)
            .append("div")
            .classed("bump-tooltip", true);
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews?.[0]
        );

        const dataView: DataView | undefined = options.dataViews?.[0];
        if (!dataView?.categorical?.categories?.length || !dataView?.categorical?.values?.length) {
            this.renderMessage("Drop fields: Axis, Legend, and Values");
            return;
        }

        const series = this.extractData(dataView);
        if (series.length === 0) {
            this.renderMessage("No data to display");
            return;
        }

        const periods = series[0].points.map(p => p.period);
        this.render(series, periods, options.viewport);
    }

    private extractData(dataView: DataView): BumpSeries[] {
        const categorical = dataView.categorical!;
        const categories = categorical.categories![0];
        const periods: string[] = categories.values.map(v => String(v));
        const valueColumns = categorical.values!;

        // Collect each series' values per period
        const seriesMap = new Map<string, Map<number, number>>();

        for (const col of valueColumns) {
            const seriesName = col.source.groupName != null
                ? String(col.source.groupName)
                : col.source.displayName;

            if (!seriesMap.has(seriesName)) {
                seriesMap.set(seriesName, new Map());
            }
            const periodValues = seriesMap.get(seriesName)!;
            for (let i = 0; i < col.values.length; i++) {
                const val = Number(col.values[i]) || 0;
                periodValues.set(i, (periodValues.get(i) || 0) + val);
            }
        }

        const seriesNames = Array.from(seriesMap.keys());

        // Compute ranks per period (higher value = better rank = #1)
        const rankData = new Map<string, BumpPoint[]>();
        for (const name of seriesNames) {
            rankData.set(name, []);
        }

        for (let pi = 0; pi < periods.length; pi++) {
            const periodEntries = seriesNames.map(name => ({
                name,
                value: seriesMap.get(name)?.get(pi) ?? 0
            }));

            // Sort descending: highest value gets rank 1
            periodEntries.sort((a, b) => b.value - a.value);

            for (let rank = 0; rank < periodEntries.length; rank++) {
                const entry = periodEntries[rank];
                rankData.get(entry.name)!.push({
                    period: periods[pi],
                    periodIndex: pi,
                    rank: rank + 1,
                    value: entry.value
                });
            }
        }

        return seriesNames.map((name, i) => ({
            name,
            color: BRAND_PALETTE[i % BRAND_PALETTE.length],
            points: rankData.get(name)!
        }));
    }

    private render(series: BumpSeries[], periods: string[], viewport: powerbi.IViewport) {
        const width = viewport.width;
        const height = viewport.height;
        const lineS = this.formattingSettings.lineSettings;
        const labelS = this.formattingSettings.labelSettings;
        const dotS = this.formattingSettings.dotSettings;
        const rankS = this.formattingSettings.rankAxisSettings;

        // Compute label widths
        const startLabelWidth = labelS.showStartLabels.value ? 90 : 0;
        const endLabelWidth = labelS.showEndLabels.value ? 90 : 0;
        const rankNumWidth = rankS.showRankNumbers.value ? 30 : 0;

        const margin = {
            top: 32,
            right: Math.max(16, endLabelWidth + 8),
            bottom: 28,
            left: Math.max(16, startLabelWidth + rankNumWidth + 8)
        };

        const plotWidth = Math.max(40, width - margin.left - margin.right);
        const plotHeight = Math.max(40, height - margin.top - margin.bottom);

        this.svg
            .attr("width", width)
            .attr("height", height);
        this.svg.selectAll("*").remove();

        const maxRank = series.length;

        // Scales
        const xScale = d3.scalePoint<string>()
            .domain(periods)
            .range([0, plotWidth]);

        const yScale = d3.scaleLinear()
            .domain([1, maxRank])
            .range([0, plotHeight]);

        const g = this.svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        // Grid lines
        if (rankS.showGridLines.value) {
            g.selectAll(".bump-grid")
                .data(d3.range(1, maxRank + 1))
                .enter()
                .append("line")
                .attr("class", "bump-grid")
                .attr("x1", 0)
                .attr("x2", plotWidth)
                .attr("y1", d => yScale(d))
                .attr("y2", d => yScale(d));
        }

        // Period labels (x-axis)
        const periodLabelSel = g.selectAll(".bump-period")
            .data(periods)
            .enter()
            .append("text")
            .attr("class", "bump-period")
            .attr("x", d => xScale(d)!)
            .attr("y", -14)
            .attr("text-anchor", "middle")
            .text(d => d);

        // Auto-rotate period labels when they'd overlap
        if (periods.length > 1) {
            const spacing = plotWidth / (periods.length - 1);
            if (spacing < 60) {
                periodLabelSel
                    .attr("text-anchor", "end")
                    .attr("transform", d => `rotate(-35, ${xScale(d)!}, -14)`);
            }
        }

        // Rank numbers on left
        if (rankS.showRankNumbers.value) {
            g.selectAll(".bump-rank-num")
                .data(d3.range(1, maxRank + 1))
                .enter()
                .append("text")
                .attr("class", "bump-rank-num")
                .attr("x", -startLabelWidth - 8)
                .attr("y", d => yScale(d))
                .attr("text-anchor", "end")
                .attr("dy", "0.35em")
                .text(d => `#${d}`);
        }

        // Line generator
        const lineGen = d3.line<BumpPoint>()
            .x(d => xScale(d.period)!)
            .y(d => yScale(d.rank))
            .curve(lineS.smoothCurve.value ? d3.curveBumpX : d3.curveLinear);

        const dimOpacity = lineS.dimOpacity.value / 100;
        const tooltipDiv = this.tooltip;

        // Draw series paths
        const paths = g.selectAll<SVGPathElement, BumpSeries>(".bump-line")
            .data(series)
            .enter()
            .append("path")
            .attr("class", "bump-line")
            .attr("d", d => lineGen(d.points))
            .attr("stroke", d => d.color)
            .attr("stroke-width", lineS.lineWidth.value)
            .attr("fill", "none")
            .attr("stroke-linecap", "round")
            .attr("stroke-linejoin", "round");

        // Entrance animation: draw-on effect
        paths.each(function () {
            const pathEl = this as SVGPathElement;
            const length = pathEl.getTotalLength();
            d3.select(this)
                .attr("stroke-dasharray", `${length} ${length}`)
                .attr("stroke-dashoffset", length)
                .transition()
                .duration(1200)
                .ease(d3.easeCubicOut)
                .attr("stroke-dashoffset", 0);
        });

        // Draw data point dots
        if (dotS.showDots.value) {
            for (const s of series) {
                g.selectAll<SVGCircleElement, BumpPoint>(null)
                    .data(s.points)
                    .enter()
                    .append("circle")
                    .attr("class", "bump-dot")
                    .attr("cx", d => xScale(d.period)!)
                    .attr("cy", d => yScale(d.rank))
                    .attr("r", dotS.dotSize.value)
                    .attr("fill", "#FFFFFF")
                    .attr("stroke", s.color)
                    .attr("stroke-width", 2)
                    .attr("data-series", s.name)
                    .attr("opacity", 0)
                    .transition()
                    .delay((_d, i) => 600 + i * 80)
                    .duration(300)
                    .attr("opacity", 1);
            }
        }

        // Start labels
        if (labelS.showStartLabels.value) {
            for (const s of series) {
                const first = s.points[0];
                if (!first) continue;
                g.append("text")
                    .attr("class", "bump-label bump-label--start")
                    .attr("x", xScale(first.period)! - 12)
                    .attr("y", yScale(first.rank))
                    .attr("text-anchor", "end")
                    .attr("dy", "0.35em")
                    .attr("fill", s.color)
                    .attr("data-series", s.name)
                    .style("font-size", labelS.fontSize.value + "px")
                    .text(s.name);
            }
        }

        // End labels
        if (labelS.showEndLabels.value) {
            for (const s of series) {
                const last = s.points[s.points.length - 1];
                if (!last) continue;
                g.append("text")
                    .attr("class", "bump-label bump-label--end")
                    .attr("x", xScale(last.period)! + 12)
                    .attr("y", yScale(last.rank))
                    .attr("text-anchor", "start")
                    .attr("dy", "0.35em")
                    .attr("fill", s.color)
                    .attr("data-series", s.name)
                    .style("font-size", labelS.fontSize.value + "px")
                    .text(s.name);
            }
        }

        // Hover interaction: invisible wider hit areas
        const allPaths = g.selectAll<SVGPathElement, BumpSeries>(".bump-line");
        const allDots = g.selectAll<SVGCircleElement, BumpPoint>(".bump-dot");
        const allLabels = g.selectAll<SVGTextElement, unknown>(".bump-label");

        g.selectAll<SVGPathElement, BumpSeries>(".bump-hit")
            .data(series)
            .enter()
            .append("path")
            .attr("class", "bump-hit")
            .attr("d", d => lineGen(d.points))
            .attr("stroke", "transparent")
            .attr("stroke-width", 20)
            .attr("fill", "none")
            .style("cursor", "pointer")
            .on("mouseenter", (_event: MouseEvent, d: BumpSeries) => {
                allPaths.transition().duration(200)
                    .attr("opacity", (s: BumpSeries) => s.name === d.name ? 1 : dimOpacity)
                    .attr("stroke-width", (s: BumpSeries) =>
                        s.name === d.name ? lineS.lineWidth.value + 1.5 : lineS.lineWidth.value
                    );
                allDots.transition().duration(200)
                    .attr("opacity", function () {
                        return d3.select(this).attr("data-series") === d.name ? 1 : dimOpacity;
                    });
                allLabels.transition().duration(200)
                    .attr("opacity", function () {
                        return d3.select(this).attr("data-series") === d.name ? 1 : dimOpacity;
                    });
            })
            .on("mouseleave", () => {
                allPaths.transition().duration(200)
                    .attr("opacity", 1)
                    .attr("stroke-width", lineS.lineWidth.value);
                allDots.transition().duration(200).attr("opacity", 1);
                allLabels.transition().duration(200).attr("opacity", 1);
                tooltipDiv.style("opacity", "0");
            })
            .on("mousemove", (event: MouseEvent, d: BumpSeries) => {
                // Find nearest period to cursor
                const [mx] = d3.pointer(event, g.node());
                let nearestIdx = 0;
                let nearestDist = Infinity;
                for (let i = 0; i < periods.length; i++) {
                    const px = xScale(periods[i])!;
                    const dist = Math.abs(mx - px);
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        nearestIdx = i;
                    }
                }
                const pt = d.points[nearestIdx];
                if (pt) {
                    const formattedVal = this.formatValue(pt.value);
                    this.updateTooltip(
                        tooltipDiv,
                        d.name,
                        pt.period,
                        pt.rank,
                        formattedVal,
                        event.offsetX + 14,
                        event.offsetY - 30
                    );
                }
            });
    }

    private formatValue(value: number): string {
        const abs = Math.abs(value);
        if (abs >= 1e9) return (value / 1e9).toFixed(1) + "B";
        if (abs >= 1e6) return (value / 1e6).toFixed(1) + "M";
        if (abs >= 1e3) return (value / 1e3).toFixed(1) + "K";
        return new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }).format(value);
    }

    private updateTooltip(
        tip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
        name: string, period: string, rank: number, formattedVal: string,
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

        el.appendChild(document.createTextNode("Rank: "));
        const rankEl = document.createElement("strong");
        rankEl.textContent = `#${rank}`;
        el.appendChild(rankEl);
        el.appendChild(document.createElement("br"));

        el.appendChild(document.createTextNode(`Value: ${formattedVal}`));

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
            .attr("class", "bump-message")
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
