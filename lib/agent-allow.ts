import type { AgentAction } from "@ui-sdk/core/agent";

const NAVIGATION_COMPONENTS = new Set([
  "dialog",
  "popover",
  "accordion",
  "collapsible",
  "tabs",
  "segmented-control",
  "select",
  "command",
  "toggle",
  "toolbar",
  "link",
]);

const NAVIGATION_ACTIONS = new Set(["setValue", "setOpen", "open", "close", "toggle", "setPressed", "setQuery"]);

/** Reading is snapshot and query. act may only open, choose or follow a link. */
export function allowAgentStep(step: Pick<AgentAction, "action" | "component" | "label" | "confirm">): boolean {
  if (step.confirm) return false;
  if (step.component === "input" || step.component === "textarea" || step.component === "number-input") return false;
  if (/dark mode|light mode/i.test(step.label ?? "")) return false;
  if (step.action === "press" && step.component === "link") return true;
  if (!NAVIGATION_ACTIONS.has(step.action)) return false;
  if (step.action === "setQuery" && step.component !== "command" && step.component !== "select") return false;
  return NAVIGATION_COMPONENTS.has(step.component);
}
