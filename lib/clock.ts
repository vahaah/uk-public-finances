export type Slot = "release" | "daily";

export type LondonParts = {
  hour: number;
  minute: number;
  date: string;
};

export type SlotRun = { londonDate: string; slot: Slot };

export type SlotDecision =
  | { run: true; londonDate: string; reason: string }
  | { run: false; reason: string };

const TARGETS: Record<Slot, { hour: number; minute: number; windowMinutes: number }> = {
  release: { hour: 7, minute: 5, windowMinutes: 20 },
  daily: { hour: 7, minute: 30, windowMinutes: 20 },
};

export function londonParts(now = new Date()): LondonParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  const hour = Number(read("hour"));
  const minute = Number(read("minute"));
  return { hour, minute, date: `${read("year")}-${read("month")}-${read("day")}` };
}

/**
 * Cron is UTC, so each slot is scheduled at both possible UTC hours.
 * Accept a window after the London target, and run at most once per London date and slot.
 * A skip always carries a reason.
 */
export function evaluateSlot(input: {
  slot: Slot;
  now?: Date;
  lastRun?: SlotRun | null;
  windowMinutes?: number;
}): SlotDecision {
  const now = input.now ?? new Date();
  const clock = londonParts(now);
  const target = TARGETS[input.slot];
  const windowMinutes = input.windowMinutes ?? target.windowMinutes;
  const start = target.hour * 60 + target.minute;
  const current = clock.hour * 60 + clock.minute;
  const label = `${pad(target.hour)}:${pad(target.minute)}`;
  if (input.lastRun?.londonDate === clock.date && input.lastRun.slot === input.slot) {
    return {
      run: false,
      reason: `Already ran ${input.slot} for ${clock.date}.`,
    };
  }
  if (current < start || current >= start + windowMinutes) {
    return {
      run: false,
      reason: `London time ${pad(clock.hour)}:${pad(clock.minute)} on ${clock.date} is outside the ${label} window of ${windowMinutes} minutes for ${input.slot}.`,
    };
  }
  return {
    run: true,
    londonDate: clock.date,
    reason: `London time is inside the ${label} window for ${input.slot} on ${clock.date}.`,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
