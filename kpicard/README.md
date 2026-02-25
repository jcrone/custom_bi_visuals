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
| **Trend**  | Measure  | No       | Values plotted in the sparkline (e.g. monthly)   |
| **Category** | Category | No     | Category axis for the sparkline (e.g. months)    |

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
2. Drag a measure into the **Value** field (e.g. Total Revenue).
3. Optionally drag a target measure into the **Target** field to show variance.
4. To show a sparkline, drag a measure into **Trend** and a date/category field into **Category**.
5. Adjust formatting in the Format pane as needed.

## Example Setup

- **Value:** `SUM(Sales[Revenue])`
- **Target:** `SUM(Sales[Target])`
- **Trend:** `SUM(Sales[Revenue])` (same measure, broken out by month)
- **Category:** `Date[Month]`

## Development

```bash
cd kpicard
npm install
npm start       # starts local dev server
npm run package # builds .pbiviz file for import
```

## Created
- **PromptGuy:** `Jamie Crone`
- **CodeWriter:** `Claude Code`
- **Security Risk Check:** `Chatgpt Codex`