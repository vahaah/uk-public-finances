export type Term = { id: string; term: string; body: string };
export type FaqItem = { question: string; answer: string; links?: { href: string; label: string }[] };

export const GLOSSARY: Term[] = [
  {
    id: "psnb",
    term: "Public sector net borrowing (PSNB ex)",
    body: "The amount the public sector borrows to cover the gap between its spending and its income, excluding public sector banks. It is the main measure of the deficit. ONS series J5II.",
  },
  {
    id: "current-budget",
    term: "Current budget deficit",
    body: "The difference between current expenditure and receipts, after accounting for depreciation. It excludes borrowing for investment. A negative current budget deficit is a surplus. ONS series JW2T.",
  },
  {
    id: "tme",
    term: "Total managed expenditure (TME)",
    body: "All public sector spending. In PESA 2026 table 4.1, total managed expenditure for 2025-26 equals public sector current expenditure plus depreciation plus public sector net investment, within £0.1 billion of rounding. The monthly ONS series is KX5Q and excludes public sector banks.",
  },
  {
    id: "psnd",
    term: "Public sector net debt (PSND ex)",
    body: "The public sector's debt securities, loans, deposits and currency, minus cash and other liquid assets, excluding public sector banks. Shown in pounds (KSE6) and as a percentage of GDP (HF6X). CPOA is the same debt ratio excluding public sector banks and the Bank of England.",
  },
  {
    id: "debt-interest",
    term: "Central government net interest",
    body: "Interest central government pays on its debt, net of interest it receives. The ONS series NMFX includes the capital uplift on index-linked gilts. JNYX is interest excluding that uplift, and JNYY is the uplift excluding any uplift paid at redemption. In September 2026 those two series add up to NMFX.",
  },
  {
    id: "del",
    term: "DEL and AME",
    body: "Departmental expenditure limits (DEL) are the budgets set for departments. Annually managed expenditure (AME) covers spending that is harder to set in advance, including most social security and debt interest. Together they make up total managed expenditure. The department chart uses central government own expenditure within DEL from PESA table 6.1.",
  },
  {
    id: "cofog",
    term: "COFOG",
    body: "The United Nations Classification of the Functions of Government. PESA table 4.2 groups public sector expenditure on services by function, such as health, education and defence. Public sector debt interest is counted within general public services.",
  },
  {
    id: "financial-year",
    term: "Financial year and tax year",
    body: "Public finance figures use financial years from 1 April to 31 March, written as 2026-27. A figure for 2026-27 to September covers April to September 2026. Income tax uses the tax year, from 6 April to 5 April.",
  },
  {
    id: "outturn",
    term: "Outturn and plans",
    body: "Outturn is what was spent or received. Plans are amounts the government has set for later years in PESA. Plans can change. They are not Office for Budget Responsibility forecasts.",
  },
  {
    id: "gilt",
    term: "Index-linked gilt",
    body: "A UK government bond whose payments rise with inflation. A conventional gilt pays a fixed coupon. The Debt Management Office reports the uplifted nominal value of each.",
  },
  {
    id: "yield",
    term: "Gilt yield",
    body: "The Bank of England's daily 10-year nominal par yield on conventional gilts, series IUDMNPY. It is an estimate of the annual return from buying a 10-year gilt at the day's price and holding it to maturity.",
  },
  {
    id: "bank-rate",
    term: "Bank Rate",
    body: "The interest rate the Bank of England pays on reserves held by commercial banks. The Monetary Policy Committee sets it. The daily series is IUDBEDR.",
  },
  {
    id: "gdp",
    term: "GDP",
    body: "Gross domestic product: the total value of goods and services produced in the UK. Debt and borrowing are shown as a share of GDP so that different years can be compared.",
  },
  {
    id: "nominal",
    term: "Nominal and real",
    body: "Figures on this site are nominal: pounds at the time, not adjusted for inflation. PESA also publishes real-terms columns. Those columns are not shown here.",
  },
  {
    id: "public-sector",
    term: "Public sector",
    body: "Central government, local government and public corporations. The headline measures on this site exclude public sector banks.",
  },
  {
    id: "receipts",
    term: "Public sector current receipts",
    body: "Money the public sector receives that is not borrowed, mainly taxes and National Insurance. The monthly ONS series (JW2O) is on an accrued basis for the whole public sector. HMRC's receipts are cash received by HMRC, so the two totals differ.",
  },
];

export const FAQ: FaqItem[] = [
  {
    question: "How much is the UK borrowing?",
    answer:
      "The latest monthly figure and the financial year to date are on the borrowing page, from the ONS public sector finances release named there.",
    links: [{ href: "/borrowing", label: "Borrowing" }],
  },
  {
    question: "How much is the UK national debt?",
    answer:
      "Public sector net debt, in pounds and as a share of GDP, is on the debt page. The ONS marks the latest month as provisional in its bulletin.",
    links: [{ href: "/debt", label: "Debt and gilts" }],
  },
  {
    question: "Where do the numbers come from?",
    answer:
      "Each chart names its publisher, table and release date. Monthly borrowing, receipts, spending, debt and debt interest come from the Office for National Statistics. Receipts by tax come from HM Revenue & Customs. Spending by function and department comes from HM Treasury's Public Expenditure Statistical Analyses. Bank Rate and gilt yields come from the Bank of England. Income taxpayer numbers come from HMRC's Income Tax liabilities statistics. Gilts in issue come from the UK Debt Management Office. Forecasts come from the Office for Budget Responsibility when that file is available.",
  },
  {
    question: "Why do HMRC receipts differ from the receipts on the overview?",
    answer:
      "The overview shows ONS public sector current receipts for one month, mostly on an accrued basis. The tax and receipts page shows cash HMRC received in a financial year. They cover different organisations and different timings.",
    links: [
      { href: "/receipts", label: "Tax and receipts" },
      { href: "/", label: "Overview" },
    ],
  },
  {
    question: "Why do the figures change after they are first published?",
    answer:
      "ONS public sector finances are estimates and are revised in later releases. This site shows the latest published figures, so a month's value can change.",
  },
  {
    question: "What is the difference between the deficit and the debt?",
    answer:
      "The deficit is how much the public sector borrows in a period. The debt is the stock owed, net of liquid assets. Borrowing over time adds to the debt.",
    links: [
      { href: "/borrowing", label: "Borrowing" },
      { href: "/debt", label: "Debt and gilts" },
    ],
  },
  {
    question: "Why are there no OBR forecasts?",
    answer:
      "The forecast vintage is pending. This site could not download the OBR public finances databank automatically. Until a vintage is loaded, the forecasts page shows ONS outturn only.",
    links: [{ href: "/forecasts", label: "Forecasts" }],
  },
  {
    question: "How often does this site update?",
    answer:
      "It checks for the ONS public sector finances release each morning around the usual publication window, in the third or fourth week of the month, and checks the other sources once a day.",
  },
  {
    question: "Can I reuse a figure?",
    answer:
      "ONS, HMRC, HM Treasury and OBR statistics are available under the Open Government Licence v3.0. Bank of England and Debt Management Office figures keep their own terms, linked from each source line. Sums, shares and the borrowing presentation on this site are available under CC BY 4.0. Credit the original publisher, and this site if you use a derived figure.",
  },
];
