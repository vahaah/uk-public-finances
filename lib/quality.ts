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
    case "ons-psf": {
      const series = (snapshot as SnapshotOf<"ons-psf">).data.series.j5ii;
      return (series?.months.length ?? 0) + (series?.quarters.length ?? 0) + (series?.years.length ?? 0);
    }
    case "ons-prices": {
      const data = (snapshot as SnapshotOf<"ons-prices">).data;
      return data.mnf2.years.length + data.l8gg.quarters.length + data.bktl.years.length + data.d7bt.months.length;
    }
    case "hmrc-receipts": {
      const data = (snapshot as SnapshotOf<"hmrc-receipts">).data;
      return data.monthly.length + data.annualHistory.length;
    }
    case "pesa": {
      const data = (snapshot as SnapshotOf<"pesa">).data;
      return data.functionHistory.reduce((sum, year) => sum + year.items.length, 0) + data.departmentHistory.length;
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
