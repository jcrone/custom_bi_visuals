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

interface HiveNode {
    name: string;
    axis: "source" | "dest";
    index: number;
    total: number;
    x: number;
    y: number;
}

interface HiveLink {
    source: HiveNode;
    dest: HiveNode;
    weight: number;
    color: string;
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
            .classed("hive-plot", true);

        this.tooltip = d3.select(this.target)
            .append("div")
            .classed("hive-tooltip", true);
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews?.[0]
        );

        const dataView: DataView | undefined = options.dataViews?.[0];
        if (!dataView?.categorical?.categories?.length || !dataView?.categorical?.values?.length) {
            this.renderMessage("Drop fields: Source, Destination, and Weight");
            return;
        }

        const categorical = dataView.categorical;
        const sources: string[] = categorical.categories![0].values.map(v => String(v));
        const valueColumns = categorical.values!;

        // Build unique source and destination lists
        const sourceSet = [...new Set(sources)];
        const destSet: string[] = [];
        const linkMap = new Map<string, Map<string, number>>();

        for (const col of valueColumns) {
            const destName = col.source.groupName != null
                ? String(col.source.groupName) : col.source.displayName;
            if (!destSet.includes(destName)) destSet.push(destName);

            for (let i = 0; i < col.values.length; i++) {
                const srcName = sources[i];
                const weight = Number(col.values[i]) || 0;
                if (weight <= 0) continue;

                if (!linkMap.has(srcName)) linkMap.set(srcName, new Map());
                const existing = linkMap.get(srcName)!.get(destName) || 0;
                linkMap.get(srcName)!.set(destName, existing + weight);
            }
        }

        if (sourceSet.length === 0 || destSet.length === 0) {
            this.renderMessage("No connections to display");
            return;
        }

        this.renderPlot(sourceSet, destSet, linkMap, options.viewport);
    }

    private renderPlot(
        sourceNames: string[], destNames: string[],
        linkMap: Map<string, Map<string, number>>,
        viewport: powerbi.IViewport
    ) {
        const width = viewport.width;
        const height = viewport.height;
        const arcS = this.formattingSettings.arcSettings;
        const axisS = this.formattingSettings.axisSettings;
        const labelS = this.formattingSettings.labelSettings;

        this.svg.attr("width", width).attr("height", height);
        this.svg.selectAll("*").interrupt().remove();
        this.tooltip.style("opacity", "0");

        const cx = width / 2;
        const cy = height / 2;
        const radius = Math.min(width, height) * 0.38;
        const angle = axisS.axisAngle.value * Math.PI / 180;
        const nodeRadius = 4;

        const g = this.svg.append("g");

        // Compute node positions along axes
        const toPoint = (axisAngle: number, t: number): [number, number] => {
            const r = radius * 0.15 + t * radius * 0.85;
            return [cx + r * Math.sin(axisAngle), cy - r * Math.cos(axisAngle)];
        };

        // Source totals for ordering
        const sourceTotals = sourceNames.map(s => {
            let t = 0;
            linkMap.get(s)?.forEach(v => { t += v; });
            return { name: s, total: t };
        }).sort((a, b) => b.total - a.total);

        const destTotals = destNames.map(d => {
            let t = 0;
            linkMap.forEach(dests => { t += dests.get(d) || 0; });
            return { name: d, total: t };
        }).sort((a, b) => b.total - a.total);

        const sourceNodes: HiveNode[] = sourceTotals.map((s, i) => {
            const t = sourceTotals.length > 1 ? i / (sourceTotals.length - 1) : 0.5;
            const [x, y] = toPoint(-angle, t);
            return { name: s.name, axis: "source", index: i, total: s.total, x, y };
        });

        const destNodes: HiveNode[] = destTotals.map((d, i) => {
            const t = destTotals.length > 1 ? i / (destTotals.length - 1) : 0.5;
            const [x, y] = toPoint(angle, t);
            return { name: d.name, axis: "dest", index: i, total: d.total, x, y };
        });

        // Build links
        const links: HiveLink[] = [];
        let maxWeight = 0;
        const srcMap = new Map(sourceNodes.map(n => [n.name, n]));
        const dstMap = new Map(destNodes.map(n => [n.name, n]));

        linkMap.forEach((dests, srcName) => {
            dests.forEach((weight, destName) => {
                const src = srcMap.get(srcName);
                const dst = dstMap.get(destName);
                if (src && dst && weight > 0) {
                    links.push({
                        source: src, dest: dst, weight,
                        color: PALETTE[src.index % PALETTE.length]
                    });
                    maxWeight = Math.max(maxWeight, weight);
                }
            });
        });

        // Draw axis lines
        if (axisS.showAxes.value) {
            const drawAxis = (a: number) => {
                const [x1, y1] = toPoint(a, 0);
                const [x2, y2] = toPoint(a, 1);
                g.append("line")
                    .attr("class", "hive-axis")
                    .attr("x1", x1).attr("y1", y1)
                    .attr("x2", x2).attr("y2", y2);
            };
            drawAxis(-angle);
            drawAxis(angle);
        }

        // Center dot
        g.append("circle")
            .attr("class", "hive-center")
            .attr("cx", cx).attr("cy", cy)
            .attr("r", 3);

        const opacity = arcS.opacity.value / 100;
        const maxThick = arcS.maxThickness.value;
        const tooltipDiv = this.tooltip;

        // Draw arcs
        const arcEls = links.map(link => {
            const thickness = maxWeight > 0 ? Math.max(1.5, (link.weight / maxWeight) * maxThick) : 2;
            const path = g.append("path")
                .attr("class", "hive-arc")
                .attr("d", `M ${link.source.x} ${link.source.y} Q ${cx} ${cy} ${link.dest.x} ${link.dest.y}`)
                .attr("stroke", link.color)
                .attr("stroke-width", thickness)
                .attr("fill", "none")
                .attr("opacity", opacity)
                .attr("stroke-linecap", "round");

            // Draw-on animation
            const pathNode = path.node() as SVGPathElement;
            const len = pathNode.getTotalLength();
            path
                .attr("stroke-dasharray", `${len} ${len}`)
                .attr("stroke-dashoffset", len)
                .transition()
                .duration(1000)
                .delay(link.source.index * 60)
                .ease(d3.easeCubicOut)
                .attr("stroke-dashoffset", 0);

            return { el: path, link };
        });

        // Draw nodes and labels
        const drawNodes = (nodes: HiveNode[], labelSide: number) => {
            nodes.forEach(node => {
                const circle = g.append("circle")
                    .attr("class", "hive-node")
                    .attr("cx", node.x).attr("cy", node.y)
                    .attr("r", nodeRadius)
                    .attr("fill", node.axis === "source"
                        ? PALETTE[node.index % PALETTE.length] : "#FFFFFF")
                    .attr("stroke", node.axis === "source"
                        ? PALETTE[node.index % PALETTE.length] : "#6B7F93")
                    .attr("stroke-width", 2)
                    .attr("opacity", 0);

                circle.transition("entrance").delay(800 + node.index * 60).duration(300).attr("opacity", 1);

                if (labelS.showLabels.value) {
                    g.append("text")
                        .attr("class", "hive-label")
                        .attr("x", node.x + labelSide * 10)
                        .attr("y", node.y)
                        .attr("text-anchor", labelSide < 0 ? "end" : "start")
                        .attr("dominant-baseline", "central")
                        .style("font-size", labelS.fontSize.value + "px")
                        .text(node.name);
                }

                // Node hover — hit target with tooltip on enter + move
                g.append("circle")
                    .attr("cx", node.x).attr("cy", node.y)
                    .attr("r", 14).attr("fill", "transparent")
                    .style("cursor", "pointer")
                    .on("mouseenter", (event: MouseEvent) => {
                        arcEls.forEach(a => {
                            const connected = a.link.source.name === node.name
                                || a.link.dest.name === node.name;
                            a.el.transition("hover").duration(150)
                                .attr("opacity", connected ? Math.min(opacity + 0.3, 1) : 0.05);
                        });
                        circle.transition("hover").duration(150).attr("r", nodeRadius + 2);
                        const rect = this.target.getBoundingClientRect();
                        this.showTooltip(tooltipDiv, node.name, node.total,
                            event.clientX - rect.left + 14, event.clientY - rect.top - 30);
                    })
                    .on("mouseleave", () => {
                        arcEls.forEach(a => {
                            a.el.transition("hover").duration(150).attr("opacity", opacity);
                        });
                        circle.transition("hover").duration(150).attr("r", nodeRadius);
                        tooltipDiv.style("opacity", "0");
                    })
                    .on("mousemove", (event: MouseEvent) => {
                        const rect = this.target.getBoundingClientRect();
                        this.showTooltip(tooltipDiv, node.name, node.total,
                            event.clientX - rect.left + 14, event.clientY - rect.top - 30);
                    });
            });
        };

        drawNodes(sourceNodes, -1);
        drawNodes(destNodes, 1);
    }

    private showTooltip(
        tip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
        name: string, total: number, x: number, y: number
    ): void {
        const el = tip.node()!;
        el.textContent = "";

        const nameEl = document.createElement("strong");
        nameEl.textContent = name;
        el.appendChild(nameEl);
        el.appendChild(document.createElement("br"));

        el.appendChild(document.createTextNode("Total: "));
        const valEl = document.createElement("strong");
        valEl.textContent = this.formatValue(total);
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
            .attr("class", "hive-message")
            .attr("x", "50%").attr("y", "50%")
            .attr("text-anchor", "middle").attr("dy", "0.35em")
            .text(message);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
