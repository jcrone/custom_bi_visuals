# KPI Multi Card

A Power BI custom visual that displays multiple KPI values in a responsive grid of cards, each with optional target variance.

## Features

- Responsive grid layout with configurable column count
- Automatic currency detection ($, £, €, ¥, ₹) from measure format strings
- Configurable display units (Auto, None, K, M, B)
- Target variance indicator with color-coded up/down arrows per card
- Staggered count-up animations on load
- Hover elevation effect on cards
- Supports up to 100 KPI rows

## Data Fields

| Field       | Type     | Required | Description                                    |
|-------------|----------|----------|------------------------------------------------|
| **KPI Name** | Category | Yes     | Label displayed on each card (e.g. region)     |
| **Value**   | Measure  | Yes      | The KPI number for each row                    |
| **Target**  | Measure  | No       | Target value per KPI for variance calculation  |

## Formatting Options

### Card Settings

| Option          | Description                              | Default   |
|-----------------|------------------------------------------|-----------|
| Value Color     | Color of KPI values                      | #11284C   |
| Decimal Places  | Number of decimal places                 | 1         |
| Display Units   | Auto / None / K / M / B                  | Auto      |
| Columns         | Max grid columns (0 = auto responsive)   | 0 (auto)  |

### Variance Settings

| Option          | Description                              | Default   |
|-----------------|------------------------------------------|-----------|
| Show Variance   | Toggle variance indicator                | On        |
| Positive Color  | Color when actual exceeds target         | #0E7C3A   |
| Negative Color  | Color when actual is below target        | #B42318   |

## Usage

1. Add the visual to your Power BI report.
2. Drag a category field into **KPI Name** (e.g. Region, Department, Product).
3. Drag a measure into the **Value** field (e.g. Total Revenue).
4. Optionally drag a target measure into the **Target** field to show variance per card.
5. Set **Columns** to control the grid layout, or leave at 0 for automatic responsive sizing.

## Example Setup

- **KPI Name:** `Region[Name]`
- **Value:** `SUM(Sales[Revenue])`
- **Target:** `SUM(Sales[Target])`

This produces one card per region, each showing its revenue and % variance from target.

## Development

```bash
cd kpimulticard
npm install
npm start       # starts local dev server
npm run package # builds .pbiviz file for import
```
## Created
- **Author:** `Jamie Crone`

## Security Check

Date: 2026-03-03

Checks performed:
- Verified manifest privileges are disabled (`"privileges": []` in `capabilities.json`).
- Verified external script/dependency injection is disabled (`"externalJS": null` and `"dependencies": null` in `pbiviz.json`).
- Scanned source/manifests for risky APIs and patterns: `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `postMessage`, `eval`, `new Function`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, and string-based timers.
- Scanned for hardcoded credential patterns (`api_key`, `secret`, `password`, `Authorization`, `Bearer`).
- Lint status: Pass.

Microsoft Power BI upload security verdict:
- **PASS** for `.pbiviz` upload/import security readiness based on static checks.
- Note: this is not a formal AppSource certification decision.
