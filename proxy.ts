import { NextResponse, type NextRequest } from "next/server";

import { PLAUSIBLE_EVENT_PATH } from "@/lib/plausible";

export function proxy(request: NextRequest): NextResponse {
  const key = process.env.INDEXNOW_KEY;
  if (key && request.nextUrl.pathname === `/${key}.txt`) {
    return new NextResponse(key, { headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  // Plausible beacon: do not forward cookies to plausible.io. The rewrite
  // lives in next.config.ts. An empty Cookie override drops the inbound one.
  if (request.nextUrl.pathname === PLAUSIBLE_EVENT_PATH) {
    const headers = new Headers(request.headers);
    headers.set("cookie", "");
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
