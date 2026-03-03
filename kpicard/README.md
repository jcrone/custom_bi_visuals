# KPI Card

A Power BI custom visual that displays a single KPI value with optional target variance and sparkline trend chart.

## Features

- Large, prominent KPI value display
- Automatic currency detection ($, £, €, ¥, ₹) from measure format strings
- Configurable display units (Auto, None, K, M, B)
- Target variance indicator with color-coded up/down arrows
- SVG sparkline with area fill for trend visualization
- Count-up animation on load
- Responsive font sizing

## Data Fields

| Field      | Type     | Required | Description                                      |
|------------|----------|----------|--------------------------------------------------|
| **Value**  | Measure  | Yes      | The main KPI number displayed prominently        |
| **Target** | Measure  | No       | Target value — used to calculate % variance      |
| **Trend**  | Measure  | No       | Preferred sparkline series (e.g. revenue by month) |
| **Category** | Category | No     | Sparkline axis only (e.g. month/week); not intended to drive the headline KPI |

## Binding Behavior

- Headline KPI uses **Value** (and **Target**, if present).
- Recommended sparkline setup: **Trend + Category**.
- Fallback sparkline setup: if **Trend** is empty and **Value + Category** are provided, the sparkline uses Value by Category and the card headline shows the total across categories.

## Formatting Options

### Card Settings

| Option          | Description                              | Default   |
|-----------------|------------------------------------------|-----------|
| Title           | Custom title (defaults to measure name)  | —         |
| Show Title      | Toggle title visibility                  | On        |
| Value Color     | Color of the main KPI value              | #11284C   |
| Decimal Places  | Number of decimal places                 | 1         |
| Display Units   | Auto / None / K / M / B                  | Auto      |

### Variance Settings

| Option          | Description                              | Default   |
|-----------------|------------------------------------------|-----------|
| Show Variance   | Toggle variance indicator                | On        |
| Positive Color  | Color when actual exceeds target         | #0E7C3A   |
| Negative Color  | Color when actual is below target        | #B42318   |

### Sparkline Settings

| Option          | Description                              | Default   |
|-----------------|------------------------------------------|-----------|
| Show Sparkline  | Toggle sparkline visibility              | On        |
| Line Color      | Sparkline stroke color                   | #00539A   |
| Area Color      | Sparkline area fill color                | #00539A   |

## Usage

1. Add the visual to your Power BI report.
2. Drag a measure into **Value** (e.g. Total Revenue).
3. Optionally drag a measure into **Target** for variance.
4. For sparkline (recommended), drag a measure into **Trend** and a date/category field into **Category**.
5. If you do not provide **Trend**, you can still provide **Category** and the sparkline will use **Value by Category**.
6. Adjust formatting in the Format pane as needed.

## Example Setup

- **Value:** `SUM(Sales[Revenue])`
- **Target:** `SUM(Sales[Target])`
- **Trend:** `SUM(Sales[Revenue])` (sparkline series)
- **Category:** `Date[Month]` (sparkline axis)

## Development

```bash
cd kpicard
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
