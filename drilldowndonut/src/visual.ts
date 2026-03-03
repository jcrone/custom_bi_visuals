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

/* ── Hierarchy node ── */
interface HierNode {
    name: string;
    value: number;            // own or aggregated value
    children: HierNode[];
    parent: HierNode | null;
    color: string;
}

/* ── Stored arc state for transitions ── */
interface ArcDatum {
    startAngle: number;
    endAngle: number;
    innerRadius: number;
    outerRadius: number;
    node: HierNode;
}

const PALETTE = [
    "#00539A", "#11284C", "#004896", "#FDB945",
    "#2F6FB3", "#1D3A66", "#6B7F93", "#A8B7C6",
    "#D9E1EA", "#0E7C3A"
];

export class Visual implements IVisual {
    private target: HTMLElement;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    private formattingSettings: VisualFormattingSettingsModel;
    private formattingSettingsService: FormattingSettingsService;

    private root: HierNode | null = null;
    private currentNode: HierNode | null = null;
    private previousArcs: ArcDatum[] = [];
    private viewport: powerbi.IViewport = { width: 300, height: 300 };

    constructor(options: VisualConstructorOptions) {
        this.formattingSettingsService = new FormattingSettingsService();
        this.target = options.element;

        this.svg = d3.select(this.target)
            .append("svg")
            .classed("donut-chart", true);

        this.tooltip = d3.select(this.target)
            .append("div")
            .classed("donut-tooltip", true);
    }

    public update(options: VisualUpdateOptions) {
        this.formattingSettings = this.formattingSettingsService.populateFormattingSettingsModel(
            VisualFormattingSettingsModel,
            options.dataViews?.[0]
        );

        this.viewport = options.viewport;
        const dataView: DataView | undefined = options.dataViews?.[0];

        if (!dataView?.categorical?.categories?.length || !dataView?.categorical?.values?.length) {
            this.root = null;
            this.currentNode = null;
            this.previousArcs = [];
            this.renderMessage("Drop fields: Level 1, Level 2, and Values");
            return;
        }

        const categorical = dataView.categorical;
        const categories = categorical.categories!;
        const valueCol = categorical.values![0];
        const rowCount = valueCol.values.length;

        // Determine which levels are bound
        const lvl1Cat = categories.find(c => c.source.roles?.["level1"]);
        const lvl2Cat = categories.find(c => c.source.roles?.["level2"]);
        const lvl3Cat = categories.find(c => c.source.roles?.["level3"]);

        if (!lvl1Cat) {
            this.renderMessage("Drop a field into Level 1");
            return;
        }

        // Build hierarchy tree from flat rows
        const rootNode: HierNode = { name: "Total", value: 0, children: [], parent: null, color: "" };
        const lvl1Map = new Map<string, HierNode>();

        for (let i = 0; i < rowCount; i++) {
            const val = Math.max(0, Number(valueCol.values[i]) || 0);
            const l1Name = String(lvl1Cat.values[i] ?? "");

            // Level 1
            let l1Node = lvl1Map.get(l1Name);
            if (!l1Node) {
                l1Node = {
                    name: l1Name, value: 0, children: [], parent: rootNode,
                    color: PALETTE[lvl1Map.size % PALETTE.length]
                };
                lvl1Map.set(l1Name, l1Node);
                rootNode.children.push(l1Node);
            }

            if (lvl2Cat) {
                const l2Name = String(lvl2Cat.values[i] ?? "");

                // Find or create L2 under L1
                let l2Node = l1Node.children.find(c => c.name === l2Name);
                if (!l2Node) {
                    l2Node = {
                        name: l2Name, value: 0, children: [], parent: l1Node,
                        color: PALETTE[l1Node.children.length % PALETTE.length]
                    };
                    l1Node.children.push(l2Node);
                }

                if (lvl3Cat) {
                    const l3Name = String(lvl3Cat.values[i] ?? "");
                    let l3Node = l2Node.children.find(c => c.name === l3Name);
                    if (!l3Node) {
                        l3Node = {
                            name: l3Name, value: 0, children: [], parent: l2Node,
                            color: PALETTE[l2Node.children.length % PALETTE.length]
                        };
                        l2Node.children.push(l3Node);
                    }
                    l3Node.value += val;
                } else {
                    l2Node.value += val;
                }
            } else {
                l1Node.value += val;
            }
        }

        // Aggregate values up the tree
        this.aggregateValues(rootNode);

        this.root = rootNode;
        if (this.currentNode) {
            const path = this.getNodePath(this.currentNode);
            const found = this.findNodeByPath(rootNode, path);
            if (found) {
                this.currentNode = found;
            } else {
                this.currentNode = rootNode;
                this.previousArcs = [];
            }
        } else {
            this.currentNode = rootNode;
            this.previousArcs = [];
        }

        this.render();
    }

    /* ── Recursively sum values from children ── */
    private aggregateValues(node: HierNode): number {
        if (node.children.length === 0) return node.value;
        let sum = 0;
        for (const child of node.children) {
            sum += this.aggregateValues(child);
        }
        node.value = sum;
        return sum;
    }

    /* ── Get path from root to node ── */
    private getNodePath(node: HierNode): string[] {
        const parts: string[] = [];
        let current: HierNode | null = node;
        while (current) {
            parts.unshift(current.name);
            current = current.parent;
        }
        return parts;
    }

    /* ── Find node by full path from root ── */
    private findNodeByPath(root: HierNode, path: string[]): HierNode | null {
        if (path.length === 0) return null;
        if (path[0] !== root.name) return null;
        let current: HierNode = root;
        for (let i = 1; i < path.length; i++) {
            const child = current.children.find(c => c.name === path[i]);
            if (!child) return null;
            current = child;
        }
        return current;
    }

    /* ── Main render ── */
    private render() {
        const current = this.currentNode;
        if (!current) return;

        const width = this.viewport.width;
        const height = this.viewport.height;
        const donutS = this.formattingSettings.donutSettings;
        const labelS = this.formattingSettings.labelSettings;
        const layoutS = this.formattingSettings.layoutSettings;

        const dark = layoutS.darkMode.value;
        const bgColor = dark ? "#0B1220" : "#FFFFFF";
        const textColor = dark ? "#F2F5F8" : "#11284C";
        const mutedColor = dark ? "#94A6B8" : "#6B7F93";
        const centerBg = dark ? "#0F1A2E" : "#F6F8FB";
        const strokeColor = dark ? "#22324B" : "#FFFFFF";

        const size = Math.min(width, height);
        const outerR = size / 2 - 12;
        const innerR = outerR * (donutS.innerRadius.value / 100);
        const padAngle = donutS.arcGap.value * 0.01;
        const fillOpacity = donutS.fillOpacity.value / 100;
        const arcStrokeW = donutS.strokeWidth.value;

        this.svg.attr("width", width).attr("height", height);
        this.svg.selectAll("*").interrupt().remove();
        this.tooltip.style("opacity", "0");

        // Background
        this.svg.append("rect")
            .attr("width", width).attr("height", height)
            .attr("fill", bgColor);

        const g = this.svg.append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        const children = current.children;
        if (children.length === 0) {
            // Leaf node — show single filled donut and allow going back
            this.renderLeaf(g, current, innerR, outerR, fillOpacity, arcStrokeW, strokeColor, textColor, mutedColor, centerBg, dark);
            return;
        }

        // Pie layout
        const pie = d3.pie<HierNode>()
            .value(d => d.value)
            .sort(null)
            .padAngle(padAngle);

        const arcGen = d3.arc<d3.PieArcDatum<HierNode>>()
            .innerRadius(innerR)
            .outerRadius(outerR)
            .cornerRadius(3);

        const arcs = pie(children);

        // Store current arcs for future transitions
        const newArcs: ArcDatum[] = arcs.map(a => ({
            startAngle: a.startAngle,
            endAngle: a.endAngle,
            innerRadius: innerR,
            outerRadius: outerR,
            node: a.data
        }));

        const prevArcs = this.previousArcs;
        this.previousArcs = newArcs;

        const tooltipDiv = this.tooltip;
        const self = this;

        // Draw arcs
        const arcGroup = g.selectAll<SVGPathElement, d3.PieArcDatum<HierNode>>("path.donut-arc")
            .data(arcs)
            .enter()
            .append("path")
            .attr("class", "donut-arc")
            .attr("fill", d => d.data.color)
            .attr("fill-opacity", fillOpacity)
            .attr("stroke", strokeColor)
            .attr("stroke-width", arcStrokeW);

        // Entrance animation or transition
        if (prevArcs.length > 0) {
            // Transition from previous state
            arcGroup.each(function (d, i) {
                const path = d3.select(this);
                // Find matching previous arc or use parent expansion
                const prev = prevArcs.length === 1
                    ? prevArcs[0] // Drilling down — all expand from single parent
                    : (prevArcs[i] || prevArcs[prevArcs.length - 1]);

                const interpolateStart = d3.interpolateNumber(prev.startAngle, d.startAngle);
                const interpolateEnd = d3.interpolateNumber(prev.endAngle, d.endAngle);

                path.attr("d", arcGen({ ...d, startAngle: prev.startAngle, endAngle: prev.endAngle } as d3.PieArcDatum<HierNode>) || "");

                path.transition()
                    .duration(600)
                    .ease(d3.easeCubicInOut)
                    .attrTween("d", () => {
                        return (t: number) => {
                            const sa = interpolateStart(t);
                            const ea = interpolateEnd(t);
                            return arcGen({ ...d, startAngle: sa, endAngle: ea } as d3.PieArcDatum<HierNode>) || "";
                        };
                    });
            });
        } else {
            // Initial entrance — sweep in from 0
            arcGroup.each(function (d) {
                const path = d3.select(this);
                const finalStart = d.startAngle;
                const finalEnd = d.endAngle;

                path.attr("d", arcGen({ ...d, startAngle: 0, endAngle: 0 } as d3.PieArcDatum<HierNode>));

                path.transition()
                    .duration(800)
                    .ease(d3.easeCubicOut)
                    .attrTween("d", () => {
                        const interpS = d3.interpolateNumber(0, finalStart);
                        const interpE = d3.interpolateNumber(0, finalEnd);
                        return (t: number) => {
                            return arcGen({ ...d, startAngle: interpS(t), endAngle: interpE(t) } as d3.PieArcDatum<HierNode>) || "";
                        };
                    });
            });
        }

        // Hover interactions
        arcGroup
            .on("mouseover", function (event: MouseEvent, d) {
                d3.select(this)
                    .transition().duration(150)
                    .attr("transform", () => {
                        const [cx, cy] = arcGen.centroid(d);
                        const angle = Math.atan2(cy, cx);
                        return `translate(${Math.cos(angle) * 4},${Math.sin(angle) * 4})`;
                    });

                arcGroup.filter((_d, j) => j !== arcs.indexOf(d))
                    .transition().duration(150)
                    .attr("fill-opacity", fillOpacity * 0.5);

                const total = children.reduce((s, c) => s + c.value, 0);
                const pct = total > 0 ? ((d.data.value / total) * 100).toFixed(1) : "0";
                const rect = self.target.getBoundingClientRect();
                self.showTooltip(tooltipDiv, d.data.name, self.formatValue(d.data.value),
                    pct + "% of " + current.name,
                    event.clientX - rect.left + 14, event.clientY - rect.top - 30);
            })
            .on("mousemove", (event: MouseEvent) => {
                const rect = self.target.getBoundingClientRect();
                tooltipDiv.style("left", (event.clientX - rect.left + 14) + "px")
                    .style("top", (event.clientY - rect.top - 30) + "px");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .transition().duration(150)
                    .attr("transform", "translate(0,0)");

                arcGroup.transition().duration(150)
                    .attr("fill-opacity", fillOpacity);

                tooltipDiv.style("opacity", "0");
            })
            .on("click", (_event: MouseEvent, d) => {
                if (d.data.children.length > 0) {
                    // Drill down — store single arc as previous for expand animation
                    self.previousArcs = [{
                        startAngle: d.startAngle,
                        endAngle: d.endAngle,
                        innerRadius: innerR,
                        outerRadius: outerR,
                        node: d.data
                    }];
                    self.currentNode = d.data;
                    tooltipDiv.style("opacity", "0");
                    self.render();
                }
            });

        // Labels on arcs
        if (labelS.show.value) {
            const labelArcGen = d3.arc<d3.PieArcDatum<HierNode>>()
                .innerRadius((innerR + outerR) / 2)
                .outerRadius((innerR + outerR) / 2);

            arcs.forEach(d => {
                const angleDiff = d.endAngle - d.startAngle;
                if (angleDiff < 0.25) return; // Skip tiny segments

                const [lx, ly] = labelArcGen.centroid(d);
                const total = children.reduce((s, c) => s + c.value, 0);
                const pct = total > 0 ? ((d.data.value / total) * 100).toFixed(0) + "%" : "";

                let labelText = d.data.name;
                if (labelS.showPercentages.value && pct) {
                    labelText += " " + pct;
                }

                // Truncate long labels
                if (labelText.length > 14 && angleDiff < 0.6) {
                    labelText = labelText.substring(0, 11) + "...";
                }

                const label = g.append("text")
                    .attr("class", "donut-label")
                    .attr("x", lx)
                    .attr("y", ly)
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "central")
                    .attr("fill", textColor)
                    .attr("font-size", labelS.fontSize.value + "px")
                    .text(labelText)
                    .style("opacity", 0);

                label.transition().delay(prevArcs.length > 0 ? 400 : 600).duration(300)
                    .style("opacity", 1);
            });
        }

        // Center circle
        this.renderCenter(g, current, innerR, textColor, mutedColor, centerBg, dark);
    }

    /* ── Center back button + label ── */
    private renderCenter(
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        node: HierNode,
        innerR: number,
        textColor: string,
        mutedColor: string,
        centerBg: string,
        dark: boolean
    ) {
        const self = this;
        const centerR = innerR - 4;
        const isRoot = node.parent === null;

        const center = g.append("g")
            .attr("class", "donut-center")
            .style("cursor", isRoot ? "default" : "pointer");

        center.append("circle")
            .attr("class", "donut-center-bg")
            .attr("cx", 0).attr("cy", 0)
            .attr("r", centerR)
            .attr("fill", centerBg);

        // Category name
        center.append("text")
            .attr("class", "donut-center-label")
            .attr("x", 0).attr("y", -10)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("fill", mutedColor)
            .attr("font-size", "12px")
            .text(node.name);

        // Value
        center.append("text")
            .attr("class", "donut-center-value")
            .attr("x", 0).attr("y", 12)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "central")
            .attr("fill", textColor)
            .attr("font-size", "18px")
            .text(this.formatValue(node.value));

        // Breadcrumb trail
        if (!isRoot) {
            const trail = this.getBreadcrumb(node);
            center.append("text")
                .attr("class", "donut-breadcrumb")
                .attr("x", 0).attr("y", 32)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "central")
                .attr("fill", mutedColor)
                .text(trail);

            // Back arrow hint
            center.append("text")
                .attr("x", 0).attr("y", -28)
                .attr("text-anchor", "middle")
                .attr("dominant-baseline", "central")
                .attr("fill", dark ? "#FDB945" : "#00539A")
                .attr("font-size", "10px")
                .attr("font-weight", "600")
                .text("\u25C0 Back");

            // Hover effect on center
            center
                .on("mouseover", function () {
                    d3.select(this).select(".donut-center-bg")
                        .transition().duration(150)
                        .attr("fill", dark ? "rgba(253,185,69,0.10)" : "rgba(0,83,154,0.10)");
                })
                .on("mouseout", function () {
                    d3.select(this).select(".donut-center-bg")
                        .transition().duration(150)
                        .attr("fill", centerBg);
                })
                .on("click", () => {
                    if (node.parent) {
                        // Drill up — store current children arcs to collapse back
                        const pie = d3.pie<HierNode>()
                            .value(d => d.value)
                            .sort(null)
                            .padAngle(0);
                        const currentArcs = pie(node.children);

                        // Find what angle range this node occupies in parent
                        const parentPie = d3.pie<HierNode>()
                            .value(d => d.value)
                            .sort(null)
                            .padAngle(0);
                        const parentArcs = parentPie(node.parent.children);
                        const myArc = parentArcs.find(a => a.data.name === node.name);

                        if (myArc) {
                            // Map current children arcs to collapse into parent arc range
                            const totalAngle = myArc.endAngle - myArc.startAngle;
                            self.previousArcs = currentArcs.map(a => {
                                return {
                                    startAngle: myArc.startAngle + (a.startAngle / (2 * Math.PI)) * totalAngle,
                                    endAngle: myArc.startAngle + (a.endAngle / (2 * Math.PI)) * totalAngle,
                                    innerRadius: 0,
                                    outerRadius: 0,
                                    node: a.data
                                };
                            });
                        } else {
                            self.previousArcs = [];
                        }

                        self.currentNode = node.parent;
                        self.tooltip.style("opacity", "0");
                        self.render();
                    }
                });
        }
    }

    /* ── Render leaf node (no children) ── */
    private renderLeaf(
        g: d3.Selection<SVGGElement, unknown, null, undefined>,
        node: HierNode,
        innerR: number,
        outerR: number,
        fillOpacity: number,
        strokeW: number,
        strokeColor: string,
        textColor: string,
        mutedColor: string,
        centerBg: string,
        dark: boolean
    ) {
        const arcGen = d3.arc<{ startAngle: number; endAngle: number }>()
            .innerRadius(innerR)
            .outerRadius(outerR)
            .cornerRadius(3);

        g.append("path")
            .attr("class", "donut-arc")
            .attr("d", arcGen({ startAngle: 0, endAngle: 2 * Math.PI }) || "")
            .attr("fill", node.color || PALETTE[0])
            .attr("fill-opacity", fillOpacity)
            .attr("stroke", strokeColor)
            .attr("stroke-width", strokeW);

        this.renderCenter(g, node, innerR, textColor, mutedColor, centerBg, dark);
    }

    /* ── Build breadcrumb trail string ── */
    private getBreadcrumb(node: HierNode): string {
        const parts: string[] = [];
        let current: HierNode | null = node;
        while (current) {
            parts.unshift(current.name);
            current = current.parent;
        }
        return parts.join(" > ");
    }

    /* ── Tooltip ── */
    private showTooltip(
        tip: d3.Selection<HTMLDivElement, unknown, null, undefined>,
        name: string, value: string, detail: string,
        x: number, y: number
    ): void {
        const el = tip.node()!;
        el.textContent = "";

        const nameEl = document.createElement("strong");
        nameEl.textContent = name;
        el.appendChild(nameEl);
        el.appendChild(document.createElement("br"));

        el.appendChild(document.createTextNode("Value: "));
        const valEl = document.createElement("strong");
        valEl.textContent = value;
        el.appendChild(valEl);
        el.appendChild(document.createElement("br"));

        el.appendChild(document.createTextNode(detail));

        tip.style("opacity", "1")
            .style("left", x + "px").style("top", y + "px");
    }

    /* ── Format number ── */
    private formatValue(value: number): string {
        const abs = Math.abs(value);
        if (abs >= 1e9) return (value / 1e9).toFixed(1) + "B";
        if (abs >= 1e6) return (value / 1e6).toFixed(1) + "M";
        if (abs >= 1e3) return (value / 1e3).toFixed(1) + "K";
        return new Intl.NumberFormat(undefined, {
            minimumFractionDigits: 0, maximumFractionDigits: 2
        }).format(value);
    }

    /* ── No-data message ── */
    private renderMessage(message: string): void {
        this.svg.selectAll("*").interrupt().remove();
        this.svg.attr("width", "100%").attr("height", "100%");
        this.svg.append("text")
            .attr("class", "donut-message")
            .attr("x", "50%").attr("y", "50%")
            .attr("text-anchor", "middle").attr("dy", "0.35em")
            .text(message);
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
