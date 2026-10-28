import type { AnySnapshot, SnapshotOf, SourceId } from "@/lib/schema";
import { assertNever } from "@/lib/site";

/** True when the new extract has dropped more than 20% of the previous rows. */
export function droppedTooFar(previous: number, next: number): boolean {
  if (previous <= 0) return false;
  return next < previous * 0.8;
}

export function snapshotRows(snapshot: AnySnapshot): number {
  const sourceId: SourceId = snapshot.sourceId;
  switch (sourceId) {
    case "ons-psf":
      return (snapshot as SnapshotOf<"ons-psf">).data.series.j5ii?.months.length ?? 0;
    case "hmrc-receipts":
      return (snapshot as SnapshotOf<"hmrc-receipts">).data.monthly.length;
    case "pesa": {
      const data = (snapshot as SnapshotOf<"pesa">).data;
      return data.functions.items.length + data.departments.items.length;
    }
    case "boe-yields":
      return (snapshot as SnapshotOf<"boe-yields">).data.series.IUDBEDR.points.length;
    case "hmrc-income-tax":
      return (snapshot as SnapshotOf<"hmrc-income-tax">).data.payers.bands.length;
    case "dmo-gilts":
      return (snapshot as SnapshotOf<"dmo-gilts">).data.portfolio ? 1 : 0;
    case "obr-databank":
      return (snapshot as SnapshotOf<"obr-databank">).data.series.reduce((sum, series) => sum + series.points.length, 0);
    default:
      return assertNever(sourceId);
  }
}
