import { commandIndex } from "@/lib/command-index";

export const revalidate = 60;

export async function GET(): Promise<Response> {
  const items = await commandIndex();
  return Response.json(items, { headers: { "cache-control": "public, max-age=60" } });
}
