"use client";

import { announce } from "@ui-sdk/core";
import { useEffect, useState } from "react";

import { textButton } from "@/components/ui/popup-classes";

/** Copy a chart anchor, and save an SVG chart as a PNG. HTML-only figures keep the link and skip the PNG. */
export function ChartTools({ chartId, url }: { chartId: string; url: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const note = (message: string) => {
    setStatus(message);
    announce(message);
  };
  const [png, setPng] = useState(false);
  useEffect(() => {
    const root = document.getElementById(chartId);
    if (!root) return;
    const update = () => setPng(hasChartSvg(root));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [chartId]);
  return (
    <>
      <button
        type="button"
        className={textButton}
        aria-label="Copy link to this chart"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(() => note("Link copied"));
        }}
      >
        Copy link
      </button>
      {png ? (
        <button
          type="button"
          className={textButton}
          aria-label="Download this chart as a PNG"
          onClick={() => {
            const svg = largestSvg(document.getElementById(chartId));
            if (!svg) {
              note("Chart not ready");
              return;
            }
            void saveSvgPng(svg, chartId)
              .then(() => note("PNG saved"))
              .catch(() => note("Could not save the PNG"));
          }}
        >
          Download PNG
        </button>
      ) : null}
      <span className="text-xs" aria-live="polite">
        {status}
      </span>
    </>
  );
}

function hasChartSvg(root: HTMLElement): boolean {
  return [...root.querySelectorAll("svg")].some((svg) => svg.childElementCount > 0);
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
