import { env } from "cloudflare:workers";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";

const fields = z.object({ name: z.string().trim().min(1).max(100), description: z.string().trim().max(1200).default(""), sortOrder: z.coerce.number().int().min(0).max(1000).default(100) });
const update = fields.partial().extend({ id: z.coerce.number().int().positive(), visible: z.boolean().optional() });
const slugify = (value: string) => value.toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = fields.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Podaj nazwę albumu." }, { status: 400 });
  const now = new Date().toISOString();
  const slug = `${slugify(parsed.data.name) || "album"}-${Date.now().toString(36)}`;
  const result = await getD1().prepare("INSERT INTO gallery_albums (slug, name, description, sort_order, visible, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)")
    .bind(slug, parsed.data.name, parsed.data.description, parsed.data.sortOrder, now, now).run();
  return Response.json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = update.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Nieprawidłowe dane albumu." }, { status: 400 });
  const current = await getD1().prepare("SELECT name, description, sort_order, visible FROM gallery_albums WHERE id = ?").bind(parsed.data.id).first();
  if (!current) return Response.json({ error: "Nie znaleziono albumu." }, { status: 404 });
  await getD1().prepare("UPDATE gallery_albums SET name = ?, description = ?, sort_order = ?, visible = ?, updated_at = ? WHERE id = ?")
    .bind(parsed.data.name ?? current.name, parsed.data.description ?? current.description, parsed.data.sortOrder ?? current.sort_order, (parsed.data.visible ?? Boolean(current.visible)) ? 1 : 0, new Date().toISOString(), parsed.data.id).run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Nieprawidłowy album." }, { status: 400 });
  const photos = await getD1().prepare("SELECT object_key FROM gallery_photos WHERE album_id = ?").bind(parsed.data.id).all<{ object_key: string }>();
  const bucket = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  if (bucket && photos.results?.length) await bucket.delete(photos.results.map((row) => row.object_key));
  await getD1().prepare("DELETE FROM gallery_albums WHERE id = ?").bind(parsed.data.id).run();
  return Response.json({ ok: true });
}
