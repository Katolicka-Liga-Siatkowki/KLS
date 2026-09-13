import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";

const playerSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  number: z.union([z.coerce.number().int().min(0).max(99), z.literal(""), z.null()]).optional(),
  role: z.string().trim().min(2).max(60).default("Zawodnik"),
});

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = playerSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Sprawdź dane zawodnika." }, { status: 400 });
  const order = await getD1().prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_order FROM players WHERE team_id = ?").bind(parsed.data.teamId).first<{ next_order: number }>();
  const result = await getD1().prepare("INSERT INTO players (team_id, name, number, role, active, sort_order) VALUES (?, ?, ?, ?, 1, ?)")
    .bind(parsed.data.teamId, parsed.data.name, parsed.data.number === "" || parsed.data.number == null ? null : parsed.data.number, parsed.data.role, order?.next_order ?? 0).run();
  return Response.json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = playerSchema.partial().extend({ id: z.coerce.number().int().positive(), active: z.boolean().optional() }).safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Nieprawidłowe dane zawodnika." }, { status: 400 });
  const current = await getD1().prepare("SELECT team_id, name, number, role, active FROM players WHERE id = ?").bind(parsed.data.id).first();
  if (!current) return Response.json({ error: "Nie znaleziono zawodnika." }, { status: 404 });
  const number = parsed.data.number === "" || parsed.data.number === null ? null : (parsed.data.number ?? current.number);
  await getD1().prepare("UPDATE players SET team_id = ?, name = ?, number = ?, role = ?, active = ? WHERE id = ?")
    .bind(parsed.data.teamId ?? current.team_id, parsed.data.name ?? current.name, number, parsed.data.role ?? current.role, (parsed.data.active ?? Boolean(current.active)) ? 1 : 0, parsed.data.id).run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(await request.json());
  await getD1().prepare("UPDATE players SET active = 0 WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
