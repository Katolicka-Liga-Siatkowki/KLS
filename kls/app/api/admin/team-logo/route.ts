import { env } from "cloudflare:workers";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";
import { normalizeTeamKey, teamLogoObjectKey } from "@/lib/team-logo";

const teamSchema = z.object({
  league: z.coerce.number().int().min(1).max(1),
  teamName: z.string().trim().min(2).max(120),
});
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

function bucket() {
  const value = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  if (!value) throw new Error("Magazyn logo jest chwilowo niedostępny.");
  return value;
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const form = await request.formData();
  const parsed = teamSchema.safeParse({ league: form.get("league"), teamName: form.get("teamName") });
  const logo = form.get("logo");
  if (!parsed.success || !(logo instanceof File)) return Response.json({ error: "Wybierz drużynę i plik logo." }, { status: 400 });
  if (!allowedTypes.has(logo.type)) return Response.json({ error: "Logo musi być plikiem PNG, JPG lub WebP." }, { status: 400 });
  if (!logo.size || logo.size > 3 * 1024 * 1024) return Response.json({ error: "Logo może mieć maksymalnie 3 MB." }, { status: 400 });

  const teamKey = normalizeTeamKey(parsed.data.teamName);
  const objectKey = teamLogoObjectKey(parsed.data.league, parsed.data.teamName);
  await bucket().put(objectKey, await logo.arrayBuffer(), {
    httpMetadata: { contentType: logo.type },
    customMetadata: { originalName: logo.name },
  });
  const now = new Date().toISOString();
  await getD1().prepare(`INSERT INTO team_logos (league, team_key, object_key, file_name, content_type, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (league, team_key) DO UPDATE SET object_key = excluded.object_key, file_name = excluded.file_name, content_type = excluded.content_type, updated_at = excluded.updated_at`)
    .bind(parsed.data.league, teamKey, objectKey, logo.name, logo.type, now).run();
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const form = await request.formData();
  const parsed = teamSchema.safeParse({ league: form.get("league"), teamName: form.get("teamName") });
  if (!parsed.success) return Response.json({ error: "Nieprawidłowa drużyna." }, { status: 400 });
  const teamKey = normalizeTeamKey(parsed.data.teamName);
  const record = await getD1().prepare("SELECT object_key FROM team_logos WHERE league = ? AND team_key = ?")
    .bind(parsed.data.league, teamKey).first<{ object_key: string }>();
  if (record) await bucket().delete(record.object_key);
  await getD1().prepare("DELETE FROM team_logos WHERE league = ? AND team_key = ?").bind(parsed.data.league, teamKey).run();
  return Response.json({ ok: true });
}
