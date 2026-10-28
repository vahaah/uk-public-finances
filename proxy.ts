import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest): NextResponse {
  const key = process.env.INDEXNOW_KEY;
  if (key && request.nextUrl.pathname === `/${key}.txt`) {
    return new NextResponse(key, { headers: { "content-type": "text/plain; charset=utf-8" } });
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
