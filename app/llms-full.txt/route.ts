import { renderLlms } from "@/lib/brief";

export async function GET(): Promise<Response> {
  const body = await renderLlms(true);
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
}
