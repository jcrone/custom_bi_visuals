Blue #00539A, Gold #FDB945, Deep Navy #11284C, Alt Blue #004896). Use this as your single source of truth for styling.

1) Design tokens (Light theme)
{
  "brand": {
    "blue": "#00539A",
    "blue2": "#004896",
    "gold": "#FDB945",
    "navy": "#11284C"
  },
  "surface": {
    "bg": "#FFFFFF",
    "panel": "#F6F8FB",
    "card": "#FFFFFF",
    "border": "#D9E1EA",
    "grid": "#E8EEF5"
  },
  "text": {
    "primary": "#11284C",
    "secondary": "#3E556E",
    "muted": "#6B7F93",
    "inverse": "#FFFFFF",
    "link": "#00539A"
  },
  "data": {
    "primarySeries": ["#00539A", "#11284C", "#004896", "#FDB945"],
    "categorical10": ["#00539A", "#11284C", "#004896", "#FDB945", "#2F6FB3", "#1D3A66", "#6B7F93", "#A8B7C6", "#D9E1EA", "#F6F8FB"]
  },
  "states": {
    "hoverFill": "rgba(0,83,154,0.10)",
    "selectedFill": "rgba(253,185,69,0.22)",
    "focusRing": "#FDB945",
    "focusRingWidth": 2,
    "disabledOpacity": 0.45
  },
  "chart": {
    "axis": "#6B7F93",
    "axisStrong": "#3E556E",
    "tick": "#6B7F93",
    "label": "#11284C",
    "zeroLine": "#D9E1EA",
    "tooltipBg": "#11284C",
    "tooltipText": "#FFFFFF",
    "legendText": "#11284C"
  },
  "kpi": {
    "positive": "#0E7C3A",
    "negative": "#B42318",
    "warning": "#FDB945"
  },
  "shape": {
    "radiusSm": 4,
    "radiusMd": 8,
    "radiusLg": 12
  },
  "type": {
    "fontFamily": "Segoe UI, system-ui, -apple-system, Arial, sans-serif",
    "titleSize": 14,
    "labelSize": 12,
    "valueSize": 20,
    "weightRegular": 400,
    "weightSemibold": 600,
    "weightBold": 700
  },
  "stroke": {
    "thin": 1,
    "med": 2,
    "thick": 3
  }
}
2) Design tokens (Dark theme)
{
  "surface": {
    "bg": "#0B1220",
    "panel": "#0F1A2E",
    "card": "#0F1A2E",
    "border": "#22324B",
    "grid": "#1A2942"
  },
  "text": {
    "primary": "#F2F5F8",
    "secondary": "#C9D3DD",
    "muted": "#94A6B8",
    "inverse": "#0B1220",
    "link": "#2F6FB3"
  },
  "states": {
    "hoverFill": "rgba(253,185,69,0.10)",
    "selectedFill": "rgba(253,185,69,0.20)",
    "focusRing": "#FDB945",
    "focusRingWidth": 2,
    "disabledOpacity": 0.50
  },
  "chart": {
    "axis": "#94A6B8",
    "axisStrong": "#C9D3DD",
    "tick": "#94A6B8",
    "label": "#F2F5F8",
    "zeroLine": "#22324B",
    "tooltipBg": "#11284C",
    "tooltipText": "#FFFFFF",
    "legendText": "#F2F5F8"
  }
}
3) Quick “bold look” defaults (recommended)

Primary series color: #00539A

Highlight/selection color: #FDB945 (use fill alpha ~0.18–0.25)

Outline / emphasis strokes: #11284C at 2–3px

Cards: radius 12, border #D9E1EA, subtle shadow (if you implement one)

4) Drop-in CSS variables (if you prefer)
:root{
  --brand-blue:#00539A;
  --brand-blue2:#004896;
  --brand-gold:#FDB945;
  --brand-navy:#11284C;

  --bg:#FFFFFF;
  --panel:#F6F8FB;
  --border:#D9E1EA;

  --text:#11284C;
  --text-2:#3E556E;
  --muted:#6B7F93;

  --hover: rgba(0,83,154,.10);
  --selected: rgba(253,185,69,.22);
  --focus:#FDB945;
}

