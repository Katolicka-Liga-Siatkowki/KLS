import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";

const matchSchema = z.object({
  league: z.coerce.number().int().min(1).max(1),
  matchDate: z.string().trim().min(10).max(40),
  homeTeamId: z.coerce.number().int().positive(),
  awayTeamId: z.coerce.number().int().positive(),
  venue: z.string().trim().max(160).default(""),
  status: z.enum(["scheduled", "finished"]).default("scheduled"),
  homeSets: z.coerce.number().int().min(0).max(3).default(0),
  awaySets: z.coerce.number().int().min(0).max(3).default(0),
  setScores: z.array(z.string().regex(/^\d{1,2}:\d{1,2}$/)).max(5).default([]),
  published: z.boolean().default(true),
}).refine((value) => value.homeTeamId !== value.awayTeamId, { message: "Drużyny muszą być różne." });

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = matchSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Sprawdź dane meczu." }, { status: 400 });
  const value = parsed.data;
  const result = await getD1().prepare("INSERT INTO matches (league, match_date, home_team_id, away_team_id, venue, status, home_sets, away_sets, set_scores, published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(value.league, value.matchDate, value.homeTeamId, value.awayTeamId, value.venue, value.status, value.homeSets, value.awaySets, JSON.stringify(value.setScores), value.published ? 1 : 0, new Date().toISOString()).run();
  return Response.json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const raw = await request.json() as Record<string, unknown>;
  const id = z.coerce.number().int().positive().parse(raw.id);
  const current = await getD1().prepare("SELECT league, match_date, home_team_id, away_team_id, venue, status, home_sets, away_sets, set_scores, published FROM matches WHERE id = ?").bind(id).first();
  if (!current) return Response.json({ error: "Nie znaleziono meczu." }, { status: 404 });
  const parsed = matchSchema.safeParse({
    league: raw.league ?? current.league,
    matchDate: raw.matchDate ?? current.match_date,
    homeTeamId: raw.homeTeamId ?? current.home_team_id,
    awayTeamId: raw.awayTeamId ?? current.away_team_id,
    venue: raw.venue ?? current.venue,
    status: raw.status ?? current.status,
    homeSets: raw.homeSets ?? current.home_sets,
    awaySets: raw.awaySets ?? current.away_sets,
    setScores: raw.setScores ?? JSON.parse(String(current.set_scores ?? "[]")),
    published: raw.published ?? Boolean(current.published),
  });
  if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Sprawdź dane meczu." }, { status: 400 });
  const value = parsed.data;
  await getD1().prepare("UPDATE matches SET league = ?, match_date = ?, home_team_id = ?, away_team_id = ?, venue = ?, status = ?, home_sets = ?, away_sets = ?, set_scores = ?, published = ? WHERE id = ?")
    .bind(value.league, value.matchDate, value.homeTeamId, value.awayTeamId, value.venue, value.status, value.homeSets, value.awaySets, JSON.stringify(value.setScores), value.published ? 1 : 0, id).run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(await request.json());
  await getD1().prepare("DELETE FROM matches WHERE id = ?").bind(id).run();
  return Response.json({ ok: true });
}
