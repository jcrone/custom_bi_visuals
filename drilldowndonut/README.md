# Drilldown Donut


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
