import { env } from "cloudflare:workers";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";
import { mediaObjectKey } from "@/lib/team-logo";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const mediaSchema = z.object({
  kind: z.enum(["team-cover", "match", "section"]),
  entityKey: z.string().trim().min(1).max(600),
});

function bucket() {
  const value = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  if (!value) throw new Error("Magazyn zdjęć jest chwilowo niedostępny.");
  return value;
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const url = new URL(request.url);
  const parsed = mediaSchema.safeParse({ kind: url.searchParams.get("kind"), entityKey: url.searchParams.get("entityKey") });
  if (!parsed.success) return Response.json({ error: "Nie wybrano prawidłowego miejsca dla zdjęcia." }, { status: 400 });
  const contentType = (request.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
  if (!allowedTypes.has(contentType)) return Response.json({ error: "Zdjęcie musi być plikiem PNG, JPG lub WebP." }, { status: 400 });
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 8 * 1024 * 1024) return Response.json({ error: "Zdjęcie może mieć maksymalnie 8 MB." }, { status: 413 });

  const fileName = url.searchParams.get("fileName")?.trim().slice(0, 180) || "zdjecie";
  const objectKey = mediaObjectKey(parsed.data.kind, parsed.data.entityKey);
  const now = new Date().toISOString();
  try {
    await bucket().put(objectKey, bytes, { httpMetadata: { contentType }, customMetadata: { originalName: fileName } });
    await getD1().prepare(`INSERT INTO media_assets (kind, entity_key, object_key, file_name, content_type, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT (kind, entity_key) DO UPDATE SET object_key = excluded.object_key, file_name = excluded.file_name, content_type = excluded.content_type, updated_at = excluded.updated_at`)
      .bind(parsed.data.kind, parsed.data.entityKey, objectKey, fileName, contentType, now).run();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Media upload failed", error);
    return Response.json({ error: "Nie udało się zapisać zdjęcia w Cloudflare." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = mediaSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Nie wybrano prawidłowego zdjęcia." }, { status: 400 });
  const record = await getD1().prepare("SELECT object_key FROM media_assets WHERE kind = ? AND entity_key = ?")
    .bind(parsed.data.kind, parsed.data.entityKey).first<{ object_key: string }>();
  try {
    if (record) await bucket().delete(record.object_key);
    await getD1().prepare("DELETE FROM media_assets WHERE kind = ? AND entity_key = ?").bind(parsed.data.kind, parsed.data.entityKey).run();
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Media delete failed", error);
    return Response.json({ error: "Nie udało się usunąć zdjęcia." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = mediaSchema.extend({
    positionX: z.coerce.number().int().min(0).max(100),
    positionY: z.coerce.number().int().min(0).max(100),
  }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.kind !== "team-cover") return Response.json({ error: "Nieprawidłowe ustawienie kadru." }, { status: 400 });
  await getD1().prepare("UPDATE media_assets SET position_x = ?, position_y = ?, updated_at = ? WHERE kind = ? AND entity_key = ?")
    .bind(parsed.data.positionX, parsed.data.positionY, new Date().toISOString(), parsed.data.kind, parsed.data.entityKey).run();
  return Response.json({ ok: true });
}
