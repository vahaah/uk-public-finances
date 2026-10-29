import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** One card style for every page: section kicker, page title, sources line. */
export function ogCard(input: { kicker: string; title: string; detail?: string }): ImageResponse {
  const title = input.title.slice(0, 110);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#000",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          fontSize: 32,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, color: "#a3a3a3" }}>
          <svg width="44" height="44" viewBox="0 0 24 24">
            <path d="M16.5 7.5A4.5 4.5 0 0 0 9 10.5V18M4.5 18H19.5M4.5 12H15" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="butt" strokeLinejoin="miter" />
          </svg>
          <div style={{ display: "flex" }}>{`Budget · ${input.kicker}`.slice(0, 60)}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: title.length > 60 ? 60 : 76, fontWeight: 600, letterSpacing: -1, lineHeight: 1.1 }}>{title}</div>
          {input.detail ? <div style={{ fontSize: 30, color: "#d4d4d4" }}>{input.detail.slice(0, 120)}</div> : null}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#a3a3a3" }}>budget.vahaah.com · ONS · HMRC · HM Treasury · DMO · Bank of England · OBR</div>
      </div>
    ),
    { ...OG_SIZE, headers: { "cache-control": "public, max-age=86400, s-maxage=86400" } },
  );
}
