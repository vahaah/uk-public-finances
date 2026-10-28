import { renderLlms } from "@/lib/brief";

export async function GET(): Promise<Response> {
  const body = await renderLlms(false);
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
