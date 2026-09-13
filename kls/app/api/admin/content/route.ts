import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";

const layout = z.enum(["standard", "split", "banner"]);
const createSchema = z.object({
  navLabel: z.string().trim().min(1).max(40),
  eyebrow: z.string().trim().max(80).default(""),
  title: z.string().trim().min(1).max(140),
  body: z.string().trim().max(1200).default(""),
  layout: layout.default("standard"),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(100),
});
const updateSchema = createSchema.partial().extend({
  id: z.coerce.number().int().positive(),
  visible: z.boolean().optional(),
});

function sectionKey(title: string) {
  return `sekcja-${title.toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 45)}-${Date.now().toString(36)}`;
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Sprawdź nazwę, tytuł i treść sekcji." }, { status: 400 });
  const value = parsed.data, now = new Date().toISOString();
  const result = await getD1().prepare("INSERT INTO site_sections (section_key, kind, nav_label, eyebrow, title, body, layout, sort_order, visible, created_at, updated_at) VALUES (?, 'custom', ?, ?, ?, ?, ?, ?, 1, ?, ?)")
    .bind(sectionKey(value.title), value.navLabel, value.eyebrow, value.title, value.body, value.layout, value.sortOrder, now, now).run();
  return Response.json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Nieprawidłowe dane sekcji." }, { status: 400 });
  const current = await getD1().prepare("SELECT nav_label, eyebrow, title, body, layout, sort_order, visible FROM site_sections WHERE id = ?").bind(parsed.data.id).first();
  if (!current) return Response.json({ error: "Nie znaleziono sekcji." }, { status: 404 });
  await getD1().prepare("UPDATE site_sections SET nav_label = ?, eyebrow = ?, title = ?, body = ?, layout = ?, sort_order = ?, visible = ?, updated_at = ? WHERE id = ?")
    .bind(parsed.data.navLabel ?? current.nav_label, parsed.data.eyebrow ?? current.eyebrow, parsed.data.title ?? current.title, parsed.data.body ?? current.body, parsed.data.layout ?? current.layout, parsed.data.sortOrder ?? current.sort_order, (parsed.data.visible ?? Boolean(current.visible)) ? 1 : 0, new Date().toISOString(), parsed.data.id).run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(await request.json());
  const row = await getD1().prepare("SELECT kind FROM site_sections WHERE id = ?").bind(id).first<{ kind: string }>();
  if (!row) return Response.json({ error: "Nie znaleziono sekcji." }, { status: 404 });
  if (row.kind === "system") return Response.json({ error: "Sekcję systemową można ukryć, ale nie usunąć." }, { status: 400 });
  await getD1().prepare("DELETE FROM site_sections WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
