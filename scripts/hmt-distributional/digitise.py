"""Read the decile charts in HM Treasury's "Impact on households" PDF into JSON.

HM Treasury publishes these figures only as charts. The charts are vector graphics, so each bar
is an exact rectangle. This script converts the chart pages to SVG with pdftocairo, finds each
chart frame, its y-axis tick marks, the stacked bar segments (by fill colour) and the "Overall"
diamond markers, and converts their positions to values by linear interpolation between the
two nearest labelled ticks. Positive segments stack up from zero and negative ones down.

Usage (poppler-utils and numpy needed):
  python3 scripts/hmt-distributional/digitise.py Impact_on_households.pdf spec.json > out.json
spec.json says which page holds which figure and the top and bottom tick labels (see
budget-2026.spec.json). Check every figure: the sum of segments should match the diamond.
"""
import json, re, subprocess, sys, tempfile
from statistics import mean
import numpy as np

COLOURS = {"rgb(76.899719%, 0%, 7.058716%)": "tax", "rgb(90.59906%, 62.69989%, 59.999084%)": "welfare", "rgb(97.599792%, 89.7995%, 90.59906%)": "publicServices"}
GROUPS = ["Bottom decile", "2", "3", "4", "5", "6", "7", "8", "9", "Top decile", "All households"]

def points(d): return [tuple(map(float, m)) for m in re.findall(r"[ML] ([-\d.]+) ([-\d.]+)", d)]
def subpaths(d): return [points(s) for s in re.split(r"(?=M )", d) if s.strip()]

def page_paths(pdf, page):
    with tempfile.NamedTemporaryFile(suffix=".svg") as out:
        subprocess.run(["pdftocairo", "-svg", "-f", str(page), "-l", str(page), pdf, out.name], check=True)
        body = open(out.name).read().split("</defs>", 1)[1]
    found = []
    for attrs in re.findall(r"<path ([^>]*)>", body):
        get = lambda key: (re.search(r"(?:^| )" + key + r'="([^"]*)"', attrs) or [None, None])[1]
        found.append({"fill": get("fill"), "width": get("stroke-width"), "d": get("d")})
    return found

def read_chart(paths, frame, top, bottom, digits):
    pts = points(frame["d"]); x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts); y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
    inside = lambda p: x0 - 1 <= p[0] <= x1 + 1 and y0 - 1 <= p[1] <= y1 + 1
    ticks = sorted({round(s[0][1], 3) for x in paths if x["fill"] == "none" for s in subpaths(x["d"])
                    if len(s) == 2 and abs(s[0][1] - s[1][1]) < 1e-3 and s[1][0] <= x0 + 0.01 and s[0][0] < x0 - 1 and y0 - 1 <= s[0][1] <= y1 + 1})
    step = (top - bottom) / (len(ticks) - 1)
    labels = [bottom + k * step for k in range(len(ticks))]
    value = lambda y: float(np.interp(y, ticks, labels))
    zero = float(np.interp(0, labels, ticks))
    bars = {}
    for x in paths:
        if x["fill"] in COLOURS:
            for s in subpaths(x["d"]):
                if len(s) >= 4 and all(inside(p) for p in s):
                    bars.setdefault(COLOURS[x["fill"]], []).append(((min(p[0] for p in s) + max(p[0] for p in s)) / 2, min(p[1] for p in s), max(p[1] for p in s)))
    diamonds = sorted((mean([min(p[0] for p in s), max(p[0] for p in s)]), mean([min(p[1] for p in s), max(p[1] for p in s)]))
                      for x in paths if x["fill"] == "rgb(0%, 0%, 0%)" and x["width"] in ("0.5", "0.75")
                      for s in [points(x["d"])] if s and all(inside(p) for p in s))
    rows = []
    for index, group in enumerate(GROUPS):
        row = {"group": group}
        for name in COLOURS.values():
            x, low, high = sorted(bars[name])[index]
            row[name] = value(high) - value(low) if low >= zero - 0.5 else value(low) - value(high)
        marker = next((d for d in diamonds if abs(d[0] - x) < 8), None)
        total = row["tax"] + row["welfare"] + row["publicServices"]
        row["overall"] = value(marker[1]) if marker else total
        row["overallFrom"] = "marker" if marker else "sum of segments"
        row["check"] = round(total - row["overall"], digits + 1)
        for key in ("tax", "welfare", "publicServices", "overall"):
            row[key] = round(row[key], digits) if digits > 0 else int(round(row[key]))
        rows.append(row)
    return rows

def main(pdf, spec_path):
    spec = json.load(open(spec_path))
    figures = []
    for fig in spec["figures"]:
        paths = page_paths(pdf, fig["page"])
        frames = [x for x in paths if x["fill"] == "none" and x["width"] == "0.75"]
        frames.sort(key=lambda x: -max(p[1] for p in points(x["d"])))
        rows = read_chart(paths, frames[fig.get("frame", 0)], fig["top"], fig["bottom"], fig["digits"])
        figures.append({k: fig[k] for k in ("figure", "title", "year", "unit", "scope")} | {"rounding": fig["rounding"], "rows": rows})
    out = {k: v for k, v in spec.items() if k != "figures"} | {"figures": figures}
    json.dump(out, sys.stdout, indent=2, ensure_ascii=False)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
