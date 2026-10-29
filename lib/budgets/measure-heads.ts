/** Plain-English labels for the OBR policy database's tax and spending heads. Unknown heads show as published. */
const LABELS: Record<string, string> = {
  "Alcohol duty": "Alcohol duties",
  "Bank surcharge": "Bank profits surcharge",
  "Betting": "Betting and gaming duties",
  "Business rates": "Business rates",
  "Capital gains tax": "Capital gains tax",
  "Capital grants to private sector": "Capital grants to businesses",
  "Climate change levy": "Climate change levy",
  "Company and other credits": "Company and other tax credits",
  "Customs duty": "Customs duties",
  "EU ETS auction receipts": "Emissions trading auction receipts",
  "Electricity generators levy": "Electricity generator levy",
  "Environmental levies": "Other environmental levies",
  "Fuel Duty": "Fuel duty",
  "High-value council tax surcharge": "High value council tax surcharge",
  "Income tax": "Income tax",
  "Interest and dividend receipts": "Interest and dividend income",
  "Landfill tax": "Landfill tax",
  "Locally-financed capital expenditure": "Locally funded capital spending",
  "Locally-financed current expenditure": "Locally funded current spending",
  "Net public service pension payments": "Public service pensions (net)",
  "Onshore CT": "Corporation tax (onshore)",
  "Other AME (current)": "Other non-departmental current spending",
  "Other departmental expenditure (capital)": "Other departmental capital spending",
  "PSCE in RDEL": "Departmental day to day spending",
  "PSGI in CDEL": "Departmental capital investment",
  "Stamp duty": "Stamp duties",
  "Student loans": "Student loans",
  "VAT": "Value added tax",
  "Vehicle excise duty": "Vehicle excise duty",
  "Welfare inside cap": "Welfare within the cap",
};

export function measureHeadLabel(head: string): string {
  return LABELS[head.trim()] ?? head;
}
