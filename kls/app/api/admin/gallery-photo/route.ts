import { env } from "cloudflare:workers";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
function bucket() { const value = (env as unknown as { BUCKET?: R2Bucket }).BUCKET; if (!value) throw new Error("Magazyn zdjęć jest niedostępny."); return value; }

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  await ensureSeeded();
  const url = new URL(request.url);
  const albumId = Number(url.searchParams.get("albumId") || 0);
  const matchKey = url.searchParams.get("matchKey")?.trim().slice(0, 600) || "";
  if ((!Number.isInteger(albumId) || albumId < 0) || (!albumId && !matchKey) || (albumId && matchKey)) return Response.json({ error: "Nie wybrano albumu lub meczu." }, { status: 400 });
  const contentType = (request.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
  if (!allowedTypes.has(contentType)) return Response.json({ error: "Zdjęcie musi być plikiem PNG, JPG lub WebP." }, { status: 400 });
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 8 * 1024 * 1024) return Response.json({ error: "Jedno zdjęcie może mieć maksymalnie 8 MB." }, { status: 413 });
  if (albumId && !(await getD1().prepare("SELECT id FROM gallery_albums WHERE id = ?").bind(albumId).first())) return Response.json({ error: "Nie znaleziono albumu." }, { status: 404 });
  const orderRow = albumId
    ? await getD1().prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM gallery_photos WHERE album_id = ?").bind(albumId).first<{ next_order: number }>()
    : await getD1().prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM gallery_photos WHERE match_key = ?").bind(matchKey).first<{ next_order: number }>();
  const objectKey = `gallery/${albumId ? `album-${albumId}` : "matches"}/${crypto.randomUUID()}`;
  const fileName = url.searchParams.get("fileName")?.trim().slice(0, 180) || "zdjecie";
  try {
    await bucket().put(objectKey, bytes, { httpMetadata: { contentType }, customMetadata: { originalName: fileName } });
    const result = await getD1().prepare("INSERT INTO gallery_photos (album_id, match_key, object_key, file_name, content_type, caption, sort_order, created_at) VALUES (?, ?, ?, ?, ?, '', ?, ?)")
      .bind(albumId || null, matchKey, objectKey, fileName, contentType, Number(orderRow?.next_order ?? 0), new Date().toISOString()).run();
    return Response.json({ id: result.meta.last_row_id }, { status: 201 });
  } catch (error) { console.error("Gallery photo upload failed", error); return Response.json({ error: "Nie udało się zapisać zdjęcia." }, { status: 503 }); }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  const parsed = z.object({ id: z.coerce.number().int().positive(), caption: z.string().trim().max(300).optional(), direction: z.enum(["up", "down"]).optional() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Nieprawidłowe dane zdjęcia." }, { status: 400 });
  const photo = await getD1().prepare("SELECT id, album_id, match_key, sort_order FROM gallery_photos WHERE id = ?").bind(parsed.data.id).first<{ id: number; album_id: number | null; match_key: string; sort_order: number }>();
  if (!photo) return Response.json({ error: "Nie znaleziono zdjęcia." }, { status: 404 });
  if (parsed.data.caption !== undefined) await getD1().prepare("UPDATE gallery_photos SET caption = ? WHERE id = ?").bind(parsed.data.caption, photo.id).run();
  if (parsed.data.direction) {
    const comparator = parsed.data.direction === "up" ? "<" : ">";
    const order = parsed.data.direction === "up" ? "DESC" : "ASC";
    const sibling = photo.album_id
      ? await getD1().prepare(`SELECT id, sort_order FROM gallery_photos WHERE album_id = ? AND sort_order ${comparator} ? ORDER BY sort_order ${order} LIMIT 1`).bind(photo.album_id, photo.sort_order).first<{ id: number; sort_order: number }>()
      : await getD1().prepare(`SELECT id, sort_order FROM gallery_photos WHERE match_key = ? AND sort_order ${comparator} ? ORDER BY sort_order ${order} LIMIT 1`).bind(photo.match_key, photo.sort_order).first<{ id: number; sort_order: number }>();
    if (sibling) await getD1().batch([getD1().prepare("UPDATE gallery_photos SET sort_order = ? WHERE id = ?").bind(sibling.sort_order, photo.id), getD1().prepare("UPDATE gallery_photos SET sort_order = ? WHERE id = ?").bind(photo.sort_order, sibling.id)]);
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Nieprawidłowe zdjęcie." }, { status: 400 });
  const photo = await getD1().prepare("SELECT object_key FROM gallery_photos WHERE id = ?").bind(parsed.data.id).first<{ object_key: string }>();
  if (photo) await bucket().delete(photo.object_key);
  await getD1().prepare("DELETE FROM gallery_photos WHERE id = ?").bind(parsed.data.id).run();
  return Response.json({ ok: true });
}
