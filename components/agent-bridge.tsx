"use client";

import { useEffect } from "react";

/** One bridge for the page. The SDK and the tool registration load after first paint. */
export function AgentBridge() {
  useEffect(() => {
    let unregister = () => {};
    let cancelled = false;
    void import("@/lib/agent-mount").then((mod) => {
      if (cancelled) return;
      unregister = mod.mountAgent();
    });
    return () => {
      cancelled = true;
      unregister();
    };
  }, []);
  return null;
}
