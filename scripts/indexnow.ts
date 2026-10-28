import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

const host = process.env.INDEXNOW_HOST ?? "budget.vahaah.com";
const key = process.env.INDEXNOW_KEY;
const all = process.argv.includes("--all");
const markerPath = process.env.INDEXNOW_MARKER ?? path.join("artifacts", "indexnow-marker.json");

if (!key) {
  console.error("INDEXNOW_KEY is not set");
  process.exit(1);
}

type Marker = { lastmod: Record<string, string> };

async function main(): Promise<void> {
  const sitemap = await fetch(`https://${host}/sitemap.xml`).then((response) => {
    if (!response.ok) throw new Error(`sitemap ${response.status}`);
    return response.text();
  });
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1] ?? "");
  const mods = new Map<string, string>();
  for (const match of sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const block = match[1] ?? "";
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
    if (loc && lastmod) mods.set(loc, lastmod);
  }
  const marker: Marker = existsSync(markerPath)
    ? (JSON.parse(readFileSync(markerPath, "utf8")) as Marker)
    : { lastmod: {} };
  const changed = all
    ? urls
    : urls.filter((url) => {
        const lastmod = mods.get(url);
        return !lastmod || marker.lastmod[url] !== lastmod;
      });
  if (changed.length === 0) {
    console.log("no changed urls");
    return;
  }
  for (let index = 0; index < changed.length; index += 100) {
    const batch = changed.slice(index, index + 100);
    let posted = false;
    for (let attempt = 0; attempt < 3 && !posted; attempt += 1) {
      const response = await fetch("https://api.indexnow.org/indexnow", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ host, key, urlList: batch }),
      });
      if (response.status === 200 || response.status === 202) posted = true;
      else if (response.status >= 500 || response.status === 429) await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      else throw new Error(`IndexNow ${response.status}`);
    }
    if (!posted) throw new Error("IndexNow did not accept a batch");
  }
  for (const url of changed) {
    const lastmod = mods.get(url);
    if (lastmod) marker.lastmod[url] = lastmod;
  }
  mkdirSync(path.dirname(markerPath), { recursive: true });
  writeFileSync(markerPath, `${JSON.stringify(marker, null, 2)}\n`);
  console.log(`submitted ${changed.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
