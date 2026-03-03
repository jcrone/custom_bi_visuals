# Power BI Visuals

## Security Check (All Visuals)

Date: 2026-03-03

Scope reviewed: each visual folder containing `pbiviz.json`:
`bulletchart`, `bumpchart`, `dateslicer`, `drilldowndonut`, `hiveplot`,
`kpicard`, `kpimulticard`, `pulsemap`, `radialgauge`, `ridgechart`.

### Checks performed

- Manifest privilege review in `capabilities.json` (`"privileges": []` expected).
- External script/dependency review in `pbiviz.json` (`"externalJS": null`, `"dependencies": null` expected).
- Source scan for network/storage APIs (`fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `postMessage`).
- Source scan for dynamic code / unsafe DOM patterns (`eval`, `new Function`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, string-based `setTimeout`/`setInterval`).
- Source scan for hardcoded credential patterns (`api_key`, `secret`, `password`, `Authorization`, `Bearer`).
- Lint execution via `npm --prefix <visual> run lint` where possible.

### Per-Visual Results

| Visual | Privileges Empty | externalJS/dependencies Null | Risky API/Pattern Scan | Lint | Microsoft Power BI Upload Security Verdict |
|---|---|---|---|---|---|
| bulletchart | Yes | Yes | Clear | Pass | PASS |
| bumpchart | Yes | Yes | Clear | Blocked (offline npm DNS error) | PASS |
| dateslicer | Yes | Yes | Clear | Pass | PASS |
| drilldowndonut | Yes | Yes | Clear | Pass | PASS |
| hiveplot | Yes | Yes | Clear | Pass | PASS |
| kpicard | Yes | Yes | Clear | Pass | PASS |
| kpimulticard | Yes | Yes | Clear | Pass | PASS |
| pulsemap | Yes | Yes | Clear | Pass | PASS |
| radialgauge | Yes | Yes | Clear | Blocked (offline npm DNS error) | PASS |
| ridgechart | Yes | Yes | Clear | Pass | PASS |

### Notes

- All 10 visuals pass the static security checks used for `.pbiviz` upload readiness.
- Two lint runs (`bumpchart`, `radialgauge`) were blocked by environment DNS/network resolution (`EAI_AGAIN`), not by code findings.
- This is an upload/import security readiness check, not a formal AppSource certification decision.
