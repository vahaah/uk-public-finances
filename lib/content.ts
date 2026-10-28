export const GLOSSARY = [
  {
    term: "Public sector net borrowing (PSNB ex)",
    body: "The gap between public sector spending and income, excluding public sector banks. ONS code J5II. In the time series download a negative value is borrowing; the monthly bulletin states the same figure as a positive amount borrowed.",
  },
  {
    term: "Current budget deficit",
    body: "Borrowing used to fund day-to-day spending, after investment is taken out. ONS code JW2T. The download uses the same sign as J5II.",
  },
  {
    term: "Total managed expenditure (TME)",
    body: "Current spending plus net investment. The monthly ONS series is KX5Q, in £ million. PESA also publishes an annual TME in £ billion.",
  },
  {
    term: "Public sector net debt (PSND ex)",
    body: "The public sector's financial liabilities minus liquid financial assets, excluding public sector banks. ONS publishes the stock in £ million (KSE6) and as a share of GDP (HF6X). CPOA is the share excluding the Bank of England.",
  },
  {
    term: "Debt interest",
    body: "Central government net interest payable, ONS code NMFX. JNYX is interest excluding the capital uplift on index-linked gilts. JNYY is that uplift, excluding uplift paid at redemption.",
  },
  {
    term: "DEL and AME",
    body: "Departmental expenditure limits are the budgets departments are set. Annually managed expenditure moves with demand or with the economy, including most welfare and debt interest. PESA table 6.1 on this site is central government own expenditure within DEL.",
  },
  {
    term: "COFOG",
    body: "The UN Classification of the Functions of Government. PESA table 4.2 groups spending on services into those functions, in £ billion. Debt interest sits inside general public services, so it is not added again.",
  },
  {
    term: "Financial year",
    body: "UK public finance years run from April to March. A figure for 2026-27 through September is the sum of the published monthly values from April 2026 to September 2026.",
  },
  {
    term: "Outturn and plans",
    body: "Outturn is spending that has happened. Plans are later years in the same PESA table. The department chart can show either. Plans are not forecasts from the OBR.",
  },
  {
    term: "Index-linked gilt",
    body: "A government bond whose payments rise with inflation. The DMO portfolio fields split the uplifted nominal value into conventional and index-linked stocks. The share on the debt page is the index-linked field divided by the total field.",
  },
  {
    term: "Bank Rate",
    body: "The Bank of England's official interest rate, series IUDBEDR. The 10-year gilt yield on the same page is the Bank's nominal par yield, IUDMNPY. A blank day is left blank.",
  },
] as const;

export const FAQ = [
  {
    question: "Where do the numbers come from?",
    answer:
      "Each chart names its publisher, series or table, and release date. Monthly borrowing, debt, receipts and interest are ONS public sector finances time series. Tax-by-tax receipts are HMRC's monthly receipts workbook. Spending by function and department is HM Treasury's PESA. Gilt yields and Bank Rate are the Bank of England's interactive database. Taxpayer counts are HMRC income tax liabilities statistics. Gilt portfolio totals are the DMO GetSalesData feed. OBR forecasts appear only when the public finances databank has been parsed.",
  },
  {
    question: "Why is ONS borrowing negative in the download but positive on the page?",
    answer:
      "The J5II time series download is negative in a month the ONS bulletin describes as borrowing. Budget stores the downloaded value and also the negation, and the charts use the negation so a positive bar matches the bulletin. The source note on the borrowing page says this.",
  },
  {
    question: "What happens if a new file fails validation?",
    answer:
      "The pipeline keeps the last snapshot that passed the schema and records the failure on the data health page and at /api/health. A failed file does not replace the published numbers.",
  },
  {
    question: "Why might the OBR comparison be empty?",
    answer:
      "obr.uk has blocked scripted downloads. The workflow tries the site from Vercel and, if that fails, reads a workbook uploaded to Blob at manual/obr-public-finances.xlsx. Until one of those succeeds, the forecasts page shows ONS outturn only and does not draw a forecast line.",
  },
  {
    question: "How often does Budget update?",
    answer:
      "ONS is fetched at 07:05 UK time on the 18th to the 23rd of the month, around the public sector finances release, and again at 07:30 UK time every day with the other sources. Vercel cron runs in UTC, so the route checks Europe/London before it starts the workflows.",
  },
  {
    question: "Can I use the figures?",
    answer:
      "ONS, HMRC, HM Treasury and OBR statistics on this site are Open Government Licence v3.0. Bank of England and DMO figures keep their own terms, linked from the source line. Say which publisher the figure came from, not only Budget.",
  },
] as const;
