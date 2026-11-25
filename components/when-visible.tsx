"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Mount chart children when they are near the viewport, so their JS is not part of the first load. */
export function WhenVisible({ children, minHeight = 256 }: { children: ReactNode; minHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setShow(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShow(true);
          observer.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} data-chart-slot="" style={{ minHeight: show ? undefined : minHeight }}>
      {show ? children : null}
    </div>
  );
}
