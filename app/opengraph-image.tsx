import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Budget, UK public finances";

export default function OpenGraphImage() {
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
          fontSize: 36,
        }}
      >
        <div>Budget</div>
        <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -1 }}>UK public finances</div>
        <div style={{ fontSize: 24, color: "#a3a3a3" }}>ONS · HMRC · HM Treasury · DMO · Bank of England · OBR</div>
      </div>
    ),
    size,
  );
}
