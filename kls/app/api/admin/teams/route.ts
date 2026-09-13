import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";

const createSchema = z.object({
  league: z.coerce.number().int().min(1).max(1),
  name: z.string().trim().min(2).max(120),
  location: z.string().trim().max(120).default(""),
});
const updateSchema = createSchema.partial().extend({
  id: z.coerce.number().int().positive(),
  active: z.boolean().optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Sprawdź nazwę, ligę i miejscowość." }, { status: 400 });
  const now = new Date().toISOString();
  const result = await getD1().prepare("INSERT INTO teams (league, name, short_name, location, active, created_at) VALUES (?, ?, ?, ?, 1, ?)")
    .bind(parsed.data.league, parsed.data.name, "", parsed.data.location, now).run();
  return Response.json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Nieprawidłowe dane drużyny." }, { status: 400 });
  const current = await getD1().prepare("SELECT league, name, location, active FROM teams WHERE id = ?").bind(parsed.data.id).first();
  if (!current) return Response.json({ error: "Nie znaleziono drużyny." }, { status: 404 });
  await getD1().prepare("UPDATE teams SET league = ?, name = ?, location = ?, active = ? WHERE id = ?")
    .bind(parsed.data.league ?? current.league, parsed.data.name ?? current.name, parsed.data.location ?? current.location, (parsed.data.active ?? Boolean(current.active)) ? 1 : 0, parsed.data.id).run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(await request.json());
  await getD1().batch([
    getD1().prepare("UPDATE teams SET active = 0 WHERE id = ?").bind(id),
    getD1().prepare("UPDATE players SET active = 0 WHERE team_id = ?").bind(id),
  ]);
  return Response.json({ ok: true });
}
