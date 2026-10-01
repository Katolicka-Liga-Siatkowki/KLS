import { env } from "cloudflare:workers";
import { ensureSeeded, getD1 } from "@/lib/league-data";

export async function GET(request: Request) {
  await ensureSeeded();
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return new Response("Nie znaleziono logo.", { status: 404 });
  const record = await getD1().prepare("SELECT league, team_key, object_key, content_type FROM team_logos WHERE id = ?").bind(id).first<{ league: number; team_key: string; object_key: string; content_type: string }>();
  if (!record) return new Response("Nie znaleziono logo.", { status: 404 });
  const chunks = await getD1().prepare("SELECT content FROM team_logo_chunks WHERE league=? AND team_key=? ORDER BY part")
    .bind(record.league, record.team_key).all<{content: number[] | ArrayBuffer}>();
  if (chunks.results.length) {
    const parts = chunks.results.map(row => new Uint8Array(row.content));
    const bytes = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return new Response(bytes, { headers: { "content-type": record.content_type, "cache-control": "public, max-age=3600", "x-content-type-options": "nosniff" } });
  }
  const storage = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  if (!storage) return new Response("Magazyn logo jest niedostępny.", { status: 503 });
  const object = await storage.get(record.object_key);
  if (!object) return new Response("Nie znaleziono logo.", { status: 404 });
  const headers = new Headers({ "content-type": record.content_type, "cache-control": "public, max-age=3600" });
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  return new Response(object.body, { headers });
}
