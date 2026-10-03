import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";
import { normalizeTeamKey } from "@/lib/team-logo";

export async function PATCH(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const body = await request.json().catch(() => null) as { roster?: unknown; season?: unknown } | null;
  if (body?.roster) {
    const parsed = z.union([
      z.object({ all: z.literal(true), hidden: z.boolean() }),
      z.object({ teamName: z.string().trim().min(1).max(180), league: z.literal(1), hidden: z.boolean() }),
    ]).safeParse(body.roster);
    if (!parsed.success) return Response.json({ error: "Nieprawidłowe ustawienia widoczności." }, { status: 400 });
    const value = parsed.data;
    const key = "all" in value ? "roster_hidden:all" : `roster_hidden:${value.league}:${normalizeTeamKey(value.teamName)}`;
    await getD1().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, String(value.hidden)).run();
    return Response.json({ ok: true });
  }
  const { season } = z.object({ season: z.string().trim().min(4).max(20) }).parse(body);
  await getD1().prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind("season", season).run();
  return Response.json({ ok: true });
}
