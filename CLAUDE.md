# CLAUDE.md - Project Instructions

For branding and colors look at @STYLE.md

Ask user after completing any changes that effects the code if you they want you to run the pbiviz package to generate updated versions of the .pbiviz files. 

After visual change ask user if they would like the preview file updated. 

## Project
Power BI Visuals

## Tech Stack
Node.js (Power BI visual dev uses Node + npm)
Power BI Visual Tools (pbiviz) CLI (installed via npm)
TypeScript + HTML/SVG/Canvas (typical)
Optional chart libs: D3 (common), or other JS viz libs (just keep bundle size/perf in mind)

## Structure
A custom visual is packaged as a .pbiviz file, which you can import into reports

## Conventions
- (to be defined)

## Development
Build + test workflow

Scaffold: pbiviz new <name>

Run locally: pbiviz start

Package for use: pbiviz package → outputs a .pbiviz you import into Power BI


