import { loadSeedEvents, withSeedEvents } from "@/lib/budgets/seed";
import { readSnapshot, takeSnapshot } from "@/lib/store";

export async function fiscalMarkers(): Promise<{ date: string; name: string; light: boolean }[]> {
  const loaded = await readSnapshot("budgets-events");
  const events = withSeedEvents(takeSnapshot("budgets-events", loaded.snapshot)?.data.events);
  return events.map((event) => ({ date: event.date, name: event.name, light: event.weight === "light" }));
}
