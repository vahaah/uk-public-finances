"use client";

import { createAgent, registerTools } from "@ui-sdk/react/agent";

import { allowAgentStep } from "@/lib/agent-allow";
import { webmcpTools } from "@/lib/webmcp";

type ModelTool = {
  name: string;
  description: string;
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: readonly string[]; additionalProperties: false };
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: Record<string, unknown>) => Promise<unknown>;
};

type ModelContext = {
  registerTool: (tool: ModelTool, options?: { signal?: AbortSignal }) => Promise<unknown>;
};

/** Registers the UI SDK bridge and this site's read-only tools. No-op without document.modelContext. */
export function mountAgent(): () => void {
  if (typeof document === "undefined") return () => {};
  const context = (document as Document & { modelContext?: ModelContext }).modelContext;
  if (!context || typeof context.registerTool !== "function") return () => {};
  const agent = createAgent({ allow: allowAgentStep });
  const unregisterBridge = registerTools(agent, { allow: allowAgentStep });
  const controller = new AbortController();
  for (const tool of webmcpTools) {
    void context.registerTool(
      {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
        execute: (input) => callTool(tool.name, input),
      },
      { signal: controller.signal },
    );
  }
  return () => {
    unregisterBridge();
    controller.abort();
  };
}

async function callTool(name: (typeof webmcpTools)[number]["name"], input: Record<string, unknown>): Promise<unknown> {
  const url = new URL("/api/agent", window.location.origin);
  url.searchParams.set("tool", name);
  if (name === "search_site") url.searchParams.set("q", typeof input.query === "string" ? input.query : "");
  if (name === "get_chart_data") url.searchParams.set("id", typeof input.id === "string" ? input.id : "");
  const response = await fetch(url);
  if (!response.ok) return { error: "The figures could not be loaded." };
  return response.json() as Promise<unknown>;
}
