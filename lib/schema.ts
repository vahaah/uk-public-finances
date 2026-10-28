import { z } from "zod";

export const SOURCE_IDS = [
  "ons-psf",
  "hmrc-receipts",
  "pesa",
  "dmo-gilts",
  "boe-yields",
  "hmrc-income-tax",
  "obr-databank",
] as const;

export type SourceId = (typeof SOURCE_IDS)[number];

export const CRITICAL_SOURCES: readonly SourceId[] = [
  "ons-psf",
  "hmrc-receipts",
  "pesa",
  "boe-yields",
  "hmrc-income-tax",
];

const monthPeriod = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const dayPeriod = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
const fiscalYear = z.string().regex(/^\d{4}-\d{2}$/);
const finite = z.number().finite();

const observation = z.object({
  period: monthPeriod,
  value: finite,
});

const REQUIRED_ONS = ["j5ii", "jw2o", "kx5q", "jw2t", "kse6", "hf6x", "cpoa", "nmfx", "jnyx", "jnyy"] as const;

export const onsDataSchema = z.object({
  series: z.record(
    z.object({
      cdid: z.string(),
      title: z.string(),
      unit: z.string(),
      preUnit: z.string(),
      releaseDate: z.string(),
      nextRelease: z.string(),
      latest: observation.nullable(),
      months: z.array(observation).min(1),
    }),
  ),
  financialYear: z
    .object({
      year: z.string(),
      through: z.string(),
      borrowing: z.number(),
      previousYearBorrowing: z.number().nullable(),
      months: z.array(
        z.object({
          period: monthPeriod,
          cumulative: finite,
          previousCumulative: finite.nullable(),
        }),
      ),
    })
    .nullable(),
  /**
   * J5II and JW2T are negative in the time series download when the bulletin
   * calls the month borrowing or a deficit. These fields are the negation.
   * Debt, receipts, spending and interest are already on the bulletin's sign.
   */
  bulletinSign: z.object({
    note: z.string().min(1),
    borrowingLatest: z.number().nullable(),
    currentBudgetDeficitLatest: z.number().nullable(),
    financialYearBorrowing: z.number().nullable(),
    previousFinancialYearBorrowing: z.number().nullable(),
  }),
}).superRefine((data, context) => {
  for (const code of REQUIRED_ONS) {
    if (!data.series[code]) {
      context.addIssue({ code: "custom", message: `ONS series ${code} is missing` });
    }
  }
  const ratio = data.series.hf6x?.latest?.value;
  if (ratio != null && (ratio < 0 || ratio > 250)) {
    context.addIssue({ code: "custom", message: `HF6X ${ratio} is outside 0 to 250` });
  }
  const exBoe = data.series.cpoa?.latest?.value;
  if (exBoe != null && (exBoe < 0 || exBoe > 250)) {
    context.addIssue({ code: "custom", message: `CPOA ${exBoe} is outside 0 to 250` });
  }
  const borrowing = data.series.j5ii?.latest?.value;
  if (borrowing != null && (borrowing < -200000 || borrowing > 200000)) {
    context.addIssue({ code: "custom", message: `J5II ${borrowing} is outside the monthly range` });
  }
});

export const hmrcDataSchema = z.object({
  contentUrl: z.string(),
  attachmentUrl: z.string(),
  attachmentFilename: z.string(),
  annual: z.object({
    year: fiscalYear,
    total: finite,
    taxes: z.array(z.object({ name: z.string().min(1), value: finite })).min(1),
  }),
  annualHistory: z.array(z.object({ year: fiscalYear, total: finite })).min(1),
  monthly: z.array(z.object({ period: monthPeriod, total: finite })).min(1),
}).superRefine((data, context) => {
  const sum = data.annual.taxes.reduce((total, tax) => total + tax.value, 0);
  if (Math.abs(sum - data.annual.total) > 50) {
    context.addIssue({
      code: "custom",
      message: `HMRC tax lines sum to ${sum}, total is ${data.annual.total}`,
    });
  }
});

export const pesaDataSchema = z.object({
  contentUrl: z.string(),
  functions: z.object({
    year: fiscalYear,
    unit: z.literal("£ billion"),
    totalServices: finite.nullable(),
    totalManagedExpenditure: finite.nullable(),
    items: z.array(z.object({ name: z.string().min(1), value: finite })).min(1),
  }),
  departments: z.object({
    year: fiscalYear,
    basis: z.string().min(1),
    unit: z.literal("£ million"),
    total: finite.nullable(),
    items: z.array(z.object({ name: z.string().min(1), value: finite })).min(1),
  }),
  departmentPlans: z.object({
    year: fiscalYear,
    basis: z.string().min(1),
    unit: z.literal("£ million"),
    total: finite.nullable(),
    items: z.array(z.object({ name: z.string().min(1), value: finite })).min(1),
  }),
});

export const boePoint = z.object({
  date: dayPeriod,
  value: finite.min(-5).max(40),
});

export const boeDataSchema = z.object({
  series: z.object({
    IUDBEDR: z.object({
      description: z.string(),
      latest: boePoint.nullable(),
      points: z.array(boePoint).min(1),
    }),
    IUDMNPY: z.object({
      description: z.string().min(1),
      latest: boePoint.nullable(),
      points: z.array(boePoint).min(1),
    }),
  }),
});

export const incomeTaxDataSchema = z.object({
  contentUrl: z.string(),
  attachmentUrl: z.string(),
  attachmentFilename: z.string(),
  payers: z.object({
    yearLabel: z.string(),
    projected: z.boolean(),
    unit: z.literal("thousands"),
    total: z.number().nullable(),
    bands: z.array(z.object({ name: z.string().min(1), value: finite.nonnegative() })).min(1),
  }),
  shares: z.object({
    yearLabel: z.string().min(1),
    top1Percent: finite.min(0).max(100).nullable(),
    top10Percent: finite.min(0).max(100).nullable(),
    totalTaxBillion: finite.nonnegative().nullable(),
  }),
});

export const dmoDataSchema = z.object({
  portfolio: z
    .object({
      rawTotal: finite.positive(),
      rawConventional: finite.nonnegative(),
      rawIndexLinked: finite.nonnegative(),
      averageMaturityYears: finite.min(0).max(80),
      indexLinkedShare: finite.min(0).max(1),
      conventionalYield: finite.min(-5).max(40).nullable(),
      indexLinkedYield: finite.min(-5).max(40).nullable(),
      unitNote: z.string().min(1),
    })
    .nullable(),
  maturity: z
    .object({
      asOf: z.string(),
      buckets: z.array(z.object({ label: z.string(), nominal: z.number() })),
    })
    .nullable(),
});

export const obrDataSchema = z.object({
  origin: z.enum(["obr", "blob-manual"]),
  round: z.string().nullable(),
  series: z.array(
    z.object({
      name: z.string(),
      points: z.array(
        z.object({
          year: fiscalYear,
          outturn: finite.nullable(),
          forecast: finite.nullable(),
        }),
      ).min(1),
    }),
  ),
});

const envelope = <T extends z.ZodType>(data: T) =>
  z.object({
    sourceId: z.enum(SOURCE_IDS),
    schemaVersion: z.literal(1),
    retrievedAt: z.string(),
    releaseDate: z.string().nullable(),
    nextRelease: z.string().nullable(),
    sourceUrl: z.string(),
    sourceTitle: z.string(),
    publisher: z.string(),
    licence: z.string(),
    licenceUrl: z.string(),
    contentHash: z.string(),
    data,
  });

export const snapshotSchemas = {
  "ons-psf": envelope(onsDataSchema),
  "hmrc-receipts": envelope(hmrcDataSchema),
  pesa: envelope(pesaDataSchema),
  "dmo-gilts": envelope(dmoDataSchema),
  "boe-yields": envelope(boeDataSchema),
  "hmrc-income-tax": envelope(incomeTaxDataSchema),
  "obr-databank": envelope(obrDataSchema),
} as const;

export type SnapshotOf<T extends SourceId> = z.infer<(typeof snapshotSchemas)[T]>;
export type AnySnapshot = { [K in SourceId]: SnapshotOf<K> }[SourceId];

export const healthSourceSchema = z.object({
  source: z.enum(SOURCE_IDS),
  status: z.enum(["ok", "stale", "validation_failed", "missing"]),
  critical: z.boolean(),
  releaseDate: z.string().nullable(),
  retrievedAt: z.string().nullable(),
  origin: z.enum(["blob", "fixture", "none"]),
  validationError: z.string().nullable(),
  usingLastGood: z.boolean(),
  stale: z.boolean(),
});

export const healthReportSchema = z.object({
  ok: z.boolean(),
  checkedAt: z.string(),
  sources: z.array(healthSourceSchema),
});

export type HealthReport = z.infer<typeof healthReportSchema>;
export type HealthSource = z.infer<typeof healthSourceSchema>;
