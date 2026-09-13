import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";

const createSchema = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().min(1).max(500).refine((value) => /^(https?:\/\/|mailto:|\/)/i.test(value), "Podaj pełny adres https://, mailto: lub ścieżkę /..."),
  location: z.enum(["footer", "social"]).default("footer"),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(100),
});
const updateSchema = createSchema.partial().extend({ id: z.coerce.number().int().positive(), visible: z.boolean().optional() });

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Sprawdź link." }, { status: 400 });
  const value = parsed.data, now = new Date().toISOString();
  const result = await getD1().prepare("INSERT INTO site_links (label, url, location, sort_order, visible, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)")
    .bind(value.label, value.url, value.location, value.sortOrder, now, now).run();
  return Response.json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Sprawdź link." }, { status: 400 });
  const current = await getD1().prepare("SELECT label, url, location, sort_order, visible FROM site_links WHERE id = ?").bind(parsed.data.id).first();
  if (!current) return Response.json({ error: "Nie znaleziono linku." }, { status: 404 });
  await getD1().prepare("UPDATE site_links SET label = ?, url = ?, location = ?, sort_order = ?, visible = ?, updated_at = ? WHERE id = ?")
    .bind(parsed.data.label ?? current.label, parsed.data.url ?? current.url, parsed.data.location ?? current.location, parsed.data.sortOrder ?? current.sort_order, (parsed.data.visible ?? Boolean(current.visible)) ? 1 : 0, new Date().toISOString(), parsed.data.id).run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(await request.json());
  await getD1().prepare("DELETE FROM site_links WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
