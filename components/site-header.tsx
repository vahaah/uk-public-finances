import { Header } from "@/components/chrome";
import { latestBudgetNav } from "@/lib/nav-event";
import { NAV } from "@/lib/site";

/** Header links, including FAQ and the latest Budget, which takes its name from that event. */
export async function SiteHeader() {
  const featured = await latestBudgetNav();
  const links = [...NAV, ...(featured ? [featured] : []), { href: "/faq", label: "FAQ" }];
  return <Header links={links} />;
}
