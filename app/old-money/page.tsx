import { OldMoneyCalculator } from "@/components/calculator";
import { Breadcrumb, JsonLd, PageIntro, SourceNote, breadcrumbJsonLd } from "@/components/blocks";
import { pageMeta } from "@/lib/meta";
import { readSnapshot, takeSnapshot } from "@/lib/store";
import { SOURCES } from "@/lib/site";

export const metadata = pageMeta({
  title: "Old money vs new",
  description:
    "Revalue a pound amount between two years with the GDP deflator, CPI, CPIH or RPI. Only published ONS index values are used.",
  path: "/old-money",
});

export default async function OldMoneyPage() {
  const loaded = await readSnapshot("ons-prices");
  const snapshot = takeSnapshot("ons-prices", loaded.snapshot);
  const meta = SOURCES["ons-prices"];
  if (!snapshot) {
    return (
      <>
        <Breadcrumb current="Old money vs new" />
        <PageIntro kicker="Prices" title="Old money vs new" lede="The price indexes are not loaded, so no amount is converted." />
      </>
    );
  }
  const data = snapshot.data;
  return (
    <>
      <JsonLd data={breadcrumbJsonLd("Old money vs new", "/old-money")} />
      <Breadcrumb current="Old money vs new" />
      <PageIntro
        kicker="Prices"
        title="What is an old amount worth today?"
        lede="Enter an amount and two years. The result uses only the published index values for those years. It does not fill a gap. The GDP deflator is the measure for public spending. CPI and CPIH are household prices. RPI is for index-linked gilts and contracts that still use it."
      />
      <OldMoneyCalculator
        series={{
          mnf2: { title: data.mnf2.title, releaseDate: data.mnf2.releaseDate, points: data.mnf2.years },
          l8gg: { title: data.l8gg.title, releaseDate: data.l8gg.releaseDate, points: [], quarters: data.l8gg.quarters },
          d7bt: { title: data.d7bt.title, releaseDate: data.d7bt.releaseDate, points: data.d7bt.years },
          l522: { title: data.l522.title, releaseDate: data.l522.releaseDate, points: data.l522.years },
          chaw: { title: data.chaw.title, releaseDate: data.chaw.releaseDate, points: data.chaw.years },
        }}
      />
      <SourceNote
        publisher={meta.publisher}
        title="MNF2 and L8GG (GDP deflator), BKTL is not used here, D7BT (CPI), L522 (CPIH), CHAW (RPI)"
        url="https://www.ons.gov.uk/economy/grossdomesticproductgdp/timeseries/l8gg/qna"
        releaseDate={snapshot.releaseDate}
        licenceUrl={meta.licenceUrl}
        sourceId="ons-prices"
      />
    </>
  );
}
