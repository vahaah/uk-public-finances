import { z } from "zod";

export const SOURCE_IDS = [
  "ons-psf",
  "ons-prices",
  "hmrc-receipts",
  "pesa",
  "dmo-gilts",
  "boe-yields",
  "hmrc-income-tax",
  "obr-databank",
  "budgets-events",
  "budgets-obr",
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
const quarterPeriod = z.string().regex(/^\d{4}-Q[1-4]$/);
const calendarYear = z.string().regex(/^\d{4}$/);
const dayPeriod = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
const fiscalYear = z.string().regex(/^\d{4}-\d{2}$/);
const finite = z.number().finite();

const observation = z.object({
  period: monthPeriod,
  value: finite,
});

const yearObservation = z.object({
  period: calendarYear,
  value: finite,
});

const quarterObservation = z.object({
  period: quarterPeriod,
  value: finite,
});

const REQUIRED_ONS = ["j5ii", "jw2o", "kx5q", "jw2t", "kse6", "hf6x", "cpoa", "nmfx", "jnyx", "jnyy"] as const;

export const onsDataSchema = z.object({
  series: z.record(
    z.string(),
    z.object({
      cdid: z.string(),
      title: z.string(),
      unit: z.string(),
      preUnit: z.string(),
      releaseDate: z.string(),
      nextRelease: z.string(),
      latest: observation.nullable(),
      months: z.array(observation).min(1),
      quarters: z.array(quarterObservation).min(1),
      years: z.array(yearObservation).min(1),
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
  annualHistory: z
    .array(
      z.object({
        year: fiscalYear,
        total: finite,
        taxes: z.array(z.object({ name: z.string().min(1), value: finite })).min(1),
      }),
    )
    .min(1),
  monthly: z.array(z.object({ period: monthPeriod, total: finite })).min(1),
}).superRefine((data, context) => {
  for (const year of data.annualHistory) {
    const sum = year.taxes.reduce((total, tax) => total + tax.value, 0);
    if (Math.abs(sum - year.total) > 50) {
      context.addIssue({
        code: "custom",
        message: `HMRC ${year.year} tax lines sum to ${sum}, total is ${year.total}`,
      });
    }
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
  functionHistory: z
    .array(
      z.object({
        year: fiscalYear,
        totalServices: finite.nullable(),
        totalManagedExpenditure: finite.nullable(),
        items: z.array(z.object({ name: z.string().min(1), value: finite })).min(1),
      }),
    )
    .min(1),
  departmentHistory: z
    .array(
      z.object({
        year: fiscalYear,
        basis: z.enum(["outturn", "plans"]),
        total: finite.nullable(),
        items: z.array(z.object({ name: z.string().min(1), value: finite })).min(1),
      }),
    )
    .min(1),
  /** HM Treasury GDP deflators (outturn plus OBR forecast years), for real-terms plans. Optional: older snapshots have none. */
  deflators: z
    .object({
      base: z.string().nullable(),
      url: z.string(),
      releaseDate: z.string().nullable(),
      years: z.array(z.object({ year: fiscalYear, index: finite.positive(), forecast: z.boolean() })).min(10),
    })
    .optional(),
  /** HM Treasury comparison of independent forecasts: GDP growth average, median and range by calendar year. Optional. */
  independent: z
    .object({
      title: z.string(),
      url: z.string(),
      releaseDate: z.string().nullable(),
      years: z.array(z.object({ year: z.string().regex(/^\d{4}$/), average: finite.nullable(), median: finite.nullable(), highest: finite.nullable(), lowest: finite.nullable(), count: z.number().int().nonnegative() })).min(1),
    })
    .optional(),
  /** DfE school funding statistics: national revenue funding per pupil aged 5-16, England. Optional. */
  perPupil: z
    .object({
      priceYear: fiscalYear,
      url: z.string(),
      releaseDate: z.string().nullable(),
      rows: z.array(z.object({ year: fiscalYear, cashGbp: finite.positive(), realGbp: finite.positive(), pupils: finite.positive().nullable() })).min(5),
    })
    .optional(),
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

const positivePoint = z.object({
  period: z.string().min(1),
  value: finite.positive(),
});

export const priceSeriesSchema = z.object({
  cdid: z.string().min(1),
  title: z.string().min(1),
  unit: z.string(),
  releaseDate: z.string().min(1),
  years: z.array(z.object({ period: calendarYear, value: finite.positive() })),
  quarters: z.array(z.object({ period: quarterPeriod, value: finite.positive() })),
  months: z.array(z.object({ period: monthPeriod, value: finite.positive() })),
});

export const priceDataSchema = z
  .object({
    mnf2: priceSeriesSchema,
    l8gg: priceSeriesSchema,
    bktl: priceSeriesSchema,
    d7bt: priceSeriesSchema,
    l522: priceSeriesSchema,
    chaw: priceSeriesSchema,
    /** RHDI per head, CVM £. Optional so snapshots from before it was added still validate. */
    crxx: priceSeriesSchema.optional(),
    /** UK mid-year population estimate (ONS UKPOP), for per-person figures. Optional like CRXX. */
    ukpop: priceSeriesSchema.optional(),
  })
  .superRefine((data, context) => {
    if (data.mnf2.cdid !== "MNF2" || data.mnf2.years.length < 1) {
      context.addIssue({ code: "custom", message: "MNF2 calendar-year deflator is missing" });
    }
    if (data.l8gg.cdid !== "L8GG" || data.l8gg.quarters.length < 1) {
      context.addIssue({ code: "custom", message: "L8GG quarterly deflator is missing" });
    }
    if (data.bktl.cdid !== "BKTL" || data.bktl.years.length < 1 || data.bktl.quarters.length < 1) {
      context.addIssue({ code: "custom", message: "BKTL money GDP is missing" });
    }
    for (const code of ["d7bt", "l522", "chaw"] as const) {
      if (data[code].years.length < 1 || data[code].months.length < 1) {
        context.addIssue({ code: "custom", message: `${code} is missing annual or monthly observations` });
      }
    }
    if (positivePoint.safeParse(data.mnf2.years[0]).success === false) {
      context.addIssue({ code: "custom", message: "Deflator observations must be positive" });
    }
  });

const fiscalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const budgetsEventsDataSchema = z.object({
  events: z.array(
    z.object({
      slug: z.string().min(1),
      date: fiscalDate,
      name: z.string().min(1),
      shortName: z.string().min(1).max(28).nullable(),
      type: z.enum(["budget", "statement", "emergency", "growth-plan", "forecast-only", "spending-review"]),
      chancellor: z.string().min(1),
      government: z.string().min(1),
      obrForecast: z.enum(["yes", "no", "unknown"]),
      weight: z.enum(["full", "light"]),
      govukPath: z.string().nullable(),
      dateStatus: z.enum(["verified", "unverified", "discovered", "mismatch"]),
      status: z.enum(["listed", "pending"]),
      observedDate: fiscalDate.nullable(),
    }),
  ).min(1),
  checkedAt: z.string().nullable(),
});

const vintageSchema = z.object({
  date: fiscalDate,
  precision: z.enum(["day", "month"]),
  series: z.enum(["psnb", "receipts", "tme", "psnd_pct", "gdp", "cpi", "psnfl_pct"]),
  /** Fiscal year ("2026-27"), or calendar year ("2026") for GDP growth and CPI inflation. */
  points: z.array(z.object({ fy: z.string().regex(/^\d{4}(-\d{2})?$/), value: finite })),
});

const efoPeriod = z.string().regex(/^\d{4}(-\d{2})?$/);
const efoCompare = z.object({
  currentLabel: z.string(),
  previousLabel: z.string(),
  points: z.array(z.object({ period: efoPeriod, current: finite.nullable(), previous: finite.nullable() })),
});
const efoLine = z.array(z.object({ period: efoPeriod, value: finite }));
export const efoDataSchema = z.object({
  eventDate: fiscalDate.nullable(),
  currentLabel: z.string().nullable(),
  previousLabel: z.string().nullable(),
  gdp: efoCompare.nullable(),
  cpi: efoCompare.nullable(),
  rhdiGrowth: efoCompare.nullable(),
  rhdiRolling: efoLine,
  psnb: efoCompare.nullable(),
  psnfl: efoCompare.extend({ outturn: efoLine }).nullable(),
  taxBurden: efoCompare.extend({ outturn: efoLine }).nullable(),
  debtInterest: efoCompare.nullable(),
  policy: z.array(
    z.object({ period: efoPeriod, total: finite.nullable(), currentSpending: finite.nullable(), capitalSpending: finite.nullable(), receipts: finite.nullable() }),
  ),
  packages: z.array(z.object({ event: z.string(), pctGdp: finite })),
  debtVsOutturn: z
    .object({ vintages: z.array(z.string()), points: z.array(z.object({ period: efoPeriod, values: z.array(finite.nullable()), outturn: finite.nullable() })) })
    .nullable(),
  borrowingChanges: z
    .array(z.object({ period: efoPeriod, total: finite.nullable(), debtInterest: finite.nullable(), welfare: finite.nullable(), otherSpending: finite.nullable(), receipts: finite.nullable(), policy: finite.nullable() }))
    .default([]),
  found: z.array(z.string()),
});

export const budgetsObrDataSchema = z.object({
  /** Latest EFO and forecast evaluation charts, uploaded by hand under manual/obr/efo/. Older snapshots have none. */
  efo: z.object({ loaded: z.boolean(), files: z.array(z.string()), data: efoDataSchema.nullable() }).optional(),
  historical: z.object({
    loaded: z.boolean(),
    asOf: z.string().nullable(),
    vintages: z.array(vintageSchema),
  }),
  measures: z.object({
    loaded: z.boolean(),
    asOf: z.string().nullable(),
    rows: z.array(
      z.object({
        eventDate: fiscalDate.nullable(),
        name: z.string(),
        category: z.string(),
        year3: finite.nullable(),
      }),
    ),
  }),
  evaluation: z.object({
    loaded: z.boolean(),
    asOf: z.string().nullable(),
    rows: z.array(
      z.object({
        eventDate: fiscalDate.nullable(),
        fy: fiscalYear,
        series: z.string(),
        policy: finite.nullable(),
        economy: finite.nullable(),
        other: finite.nullable(),
      }),
    ),
  }),
  headroom: z.object({
    loaded: z.boolean(),
    asOf: z.string().nullable(),
    rows: z.array(
      z.object({
        eventDate: fiscalDate.nullable(),
        rule: z.string(),
        headroomBn: finite.nullable(),
      }),
    ),
  }),
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
  "ons-prices": envelope(priceDataSchema),
  "hmrc-receipts": envelope(hmrcDataSchema),
  pesa: envelope(pesaDataSchema),
  "dmo-gilts": envelope(dmoDataSchema),
  "boe-yields": envelope(boeDataSchema),
  "hmrc-income-tax": envelope(incomeTaxDataSchema),
  "obr-databank": envelope(obrDataSchema),
  "budgets-events": envelope(budgetsEventsDataSchema),
  "budgets-obr": envelope(budgetsObrDataSchema),
} as const;

export type SnapshotOf<T extends SourceId> = z.infer<(typeof snapshotSchemas)[T]>;
export type AnySnapshot = { [K in SourceId]: SnapshotOf<K> }[SourceId];

export const healthSourceSchema = z.object({
  source: z.enum(SOURCE_IDS),
  status: z.enum(["ok", "stale", "validation_failed", "missing", "pending"]),
  fallbackReason: z.string().nullable(),
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
