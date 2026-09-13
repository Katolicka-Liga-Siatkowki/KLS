import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";

const newsFields = z.object({
  title: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(5000),
  linkLabel: z.string().trim().max(80).default(""), linkUrl: z.string().trim().max(500).default(""),
  publishedAt: z.string().trim().min(1).max(40),
});
const fields = newsFields.refine((value) => !value.linkUrl || /^https?:\/\//i.test(value.linkUrl), { message: "Link musi zaczynać się od http:// lub https://" });

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response; await ensureSeeded();
  const parsed = fields.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Sprawdź treść aktualności." }, { status: 400 });
  const now = new Date().toISOString(), value = parsed.data;
  const result = await getD1().prepare("INSERT INTO news_posts (title, body, link_label, link_url, published_at, visible, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?)")
    .bind(value.title, value.body, value.linkLabel, value.linkUrl, value.publishedAt, now, now).run();
  return Response.json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response; await ensureSeeded();
  const raw = await request.json().catch(() => null);
  const parsed = newsFields.partial().extend({ id: z.coerce.number().int().positive(), visible: z.boolean().optional() }).safeParse(raw);
  if (!parsed.success) return Response.json({ error: "Nieprawidłowe dane aktualności." }, { status: 400 });
  const current = await getD1().prepare("SELECT title, body, link_label, link_url, published_at, visible FROM news_posts WHERE id = ?").bind(parsed.data.id).first();
  if (!current) return Response.json({ error: "Nie znaleziono aktualności." }, { status: 404 });
  await getD1().prepare("UPDATE news_posts SET title = ?, body = ?, link_label = ?, link_url = ?, published_at = ?, visible = ?, updated_at = ? WHERE id = ?")
    .bind(parsed.data.title ?? current.title, parsed.data.body ?? current.body, parsed.data.linkLabel ?? current.link_label, parsed.data.linkUrl ?? current.link_url, parsed.data.publishedAt ?? current.published_at, (parsed.data.visible ?? Boolean(current.visible)) ? 1 : 0, new Date().toISOString(), parsed.data.id).run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  const parsed = z.object({ id: z.coerce.number().int().positive() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Nieprawidłowa aktualność." }, { status: 400 });
  await getD1().prepare("DELETE FROM news_posts WHERE id = ?").bind(parsed.data.id).run();
  return Response.json({ ok: true });
}
