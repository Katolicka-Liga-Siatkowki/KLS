import { env } from "cloudflare:workers";
import { ensureSeeded, getD1 } from "@/lib/league-data";

export async function GET(request: Request) {
  await ensureSeeded();
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return new Response("Nie znaleziono logo.", { status: 404 });
  const record = await getD1().prepare("SELECT object_key, content_type FROM team_logos WHERE id = ?").bind(id).first<{ object_key: string; content_type: string }>();
  if (!record) return new Response("Nie znaleziono logo.", { status: 404 });
  const storage = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  if (!storage) return new Response("Magazyn logo jest niedostępny.", { status: 503 });
  const object = await storage.get(record.object_key);
  if (!object) return new Response("Nie znaleziono logo.", { status: 404 });
  const headers = new Headers({ "content-type": record.content_type, "cache-control": "public, max-age=3600" });
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}
