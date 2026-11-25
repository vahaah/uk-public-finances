"use client";

import { useState } from "react";

/** Copy a chart anchor, and save the chart SVG as a PNG. No extra image library. */
export function ChartTools({ chartId, url }: { chartId: string; url: string }) {
  const [status, setStatus] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className="inline-flex h-8 items-center rounded-md border border-neutral-300 px-3 text-xs dark:border-neutral-700"
        aria-label="Copy link to this chart"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => setStatus("Link copied"));
        }}
      >
        Copy link
      </button>
      <button
        type="button"
        className="inline-flex h-8 items-center rounded-md border border-neutral-300 px-3 text-xs dark:border-neutral-700"
        aria-label="Download this chart as a PNG"
        onClick={() => {
          const root = document.getElementById(chartId);
          const svg = largestSvg(root);
          if (!svg) {
            setStatus("Chart not ready");
            return;
          }
          void saveSvgPng(svg, chartId)
            .then(() => setStatus("PNG saved"))
            .catch(() => setStatus("Could not save the PNG"));
        }}
      >
        Download PNG
      </button>
      {status ? <span className="text-xs">{status}</span> : null}
    </>
  );
}

function largestSvg(root: HTMLElement | null): SVGSVGElement | null {
  if (!root) return null;
  const svgs = [...root.querySelectorAll("svg")];
  svgs.sort((left, right) => right.getBoundingClientRect().width * right.getBoundingClientRect().height - left.getBoundingClientRect().width * left.getBoundingClientRect().height);
  return svgs.find((svg) => svg.getBoundingClientRect().width > 20) ?? null;
}

const PAINTED = ["fill", "stroke", "stroke-width", "stroke-dasharray", "font-size", "font-family", "font-weight", "color", "opacity"];

function saveSvgPng(svg: SVGSVGElement, name: string): Promise<void> {
  const box = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlinePaint(svg, clone);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(Math.max(1, Math.round(box.width))));
  clone.setAttribute("height", String(Math.max(1, Math.round(box.height))));
  const xml = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const objectUrl = URL.createObjectURL(blob);
  const image = new Image();
  const dark = document.documentElement.classList.contains("dark");
  return new Promise((resolve, reject) => {
    image.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(box.width * scale);
      canvas.height = Math.round(box.height * scale);
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("no canvas"));
        return;
      }
      context.fillStyle = dark ? "#000" : "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(scale, scale);
      context.drawImage(image, 0, 0, box.width, box.height);
      URL.revokeObjectURL(objectUrl);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${name}.png`;
      link.click();
      resolve();
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("svg"));
    };
    image.src = objectUrl;
  });
}

function inlinePaint(source: Element, target: Element): void {
  const style = getComputedStyle(source);
  const node = target as SVGElement;
  for (const prop of PAINTED) {
    const value = style.getPropertyValue(prop);
    if (value) node.style.setProperty(prop, value);
  }
  const sourceChildren = [...source.children];
  const targetChildren = [...target.children];
  sourceChildren.forEach((child, index) => {
    const next = targetChildren[index];
    if (next) inlinePaint(child, next);
  });
}
