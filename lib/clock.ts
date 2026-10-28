export type LondonClock = { hour: number; minute: number; day: number };

export function londonClock(now = new Date()): LondonClock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return { hour: read("hour"), minute: read("minute"), day: read("day") };
}

/** Vercel cron is UTC. Fire at both 06:xx and 07:xx UTC and keep the one that is 07:xx in London. */
export function shouldRunSlot(slot: "release" | "daily", now = new Date()): boolean {
  const clock = londonClock(now);
  if (slot === "release") return clock.hour === 7 && clock.minute === 5;
  return clock.hour === 7 && clock.minute === 30;
}
