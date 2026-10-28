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

const observation = z.object({
  period: z.string(),
  value: z.number(),
});

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
      months: z.array(observation),
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
          period: z.string(),
          cumulative: z.number(),
          previousCumulative: z.number().nullable(),
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
    note: z.string(),
    borrowingLatest: z.number().nullable(),
    currentBudgetDeficitLatest: z.number().nullable(),
    financialYearBorrowing: z.number().nullable(),
    previousFinancialYearBorrowing: z.number().nullable(),
  }),
});

export const hmrcDataSchema = z.object({
  contentUrl: z.string(),
  attachmentUrl: z.string(),
  attachmentFilename: z.string(),
  annual: z.object({
    year: z.string(),
    total: z.number(),
    taxes: z.array(z.object({ name: z.string(), value: z.number() })),
  }),
  annualHistory: z.array(z.object({ year: z.string(), total: z.number() })),
  monthly: z.array(z.object({ period: z.string(), total: z.number() })),
});

export const pesaDataSchema = z.object({
  contentUrl: z.string(),
  functions: z.object({
    year: z.string(),
    unit: z.literal("£ billion"),
    totalServices: z.number().nullable(),
    totalManagedExpenditure: z.number().nullable(),
    items: z.array(z.object({ name: z.string(), value: z.number() })),
  }),
  departments: z.object({
    year: z.string(),
    basis: z.string(),
    unit: z.literal("£ million"),
    total: z.number().nullable(),
    items: z.array(z.object({ name: z.string(), value: z.number() })),
  }),
  departmentPlans: z.object({
    year: z.string(),
    basis: z.string(),
    unit: z.literal("£ million"),
    total: z.number().nullable(),
    items: z.array(z.object({ name: z.string(), value: z.number() })),
  }),
});

export const boePoint = z.object({ date: z.string(), value: z.number() });

export const boeDataSchema = z.object({
  series: z.object({
    IUDBEDR: z.object({
      description: z.string(),
      latest: boePoint.nullable(),
      points: z.array(boePoint),
    }),
    IUDMNPY: z.object({
      description: z.string(),
      latest: boePoint.nullable(),
      points: z.array(boePoint),
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
    bands: z.array(z.object({ name: z.string(), value: z.number() })),
  }),
  shares: z.object({
    yearLabel: z.string(),
    top1Percent: z.number().nullable(),
    top10Percent: z.number().nullable(),
    totalTaxBillion: z.number().nullable(),
  }),
});

export const dmoDataSchema = z.object({
  portfolio: z
    .object({
      rawTotal: z.number(),
      rawConventional: z.number(),
      rawIndexLinked: z.number(),
      averageMaturityYears: z.number(),
      indexLinkedShare: z.number(),
      unitNote: z.string(),
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
          year: z.string(),
          outturn: z.number().nullable(),
          forecast: z.number().nullable(),
        }),
      ),
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
