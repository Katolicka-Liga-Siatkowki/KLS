import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";
import { normalizeTeamKey, teamLogoObjectKey } from "@/lib/team-logo";

const teamSchema = z.object({
  league: z.coerce.number().int().min(1).max(1),
  teamName: z.string().trim().min(2).max(120),
});
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  try {
  await ensureSeeded();
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Wybierz plik logo." }, { status: 400 });
  const parts: Uint8Array[] = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 3 * 1024 * 1024 + 65536) {
      await reader.cancel();
      return Response.json({ error: "Logo jest za duże. Odśwież panel, aby automatycznie zmniejszyć plik." }, { status: 413 });
    }
    parts.push(value);
  }
  const body = new Uint8Array(size); let offset = 0;
  for (const part of parts) { body.set(part, offset); offset += part.length; }
  const form = await new Response(body, { headers: { "Content-Type": request.headers.get("Content-Type") || "" } }).formData();
  const parsed = teamSchema.safeParse({ league: form.get("league"), teamName: form.get("teamName") });
  const logo = form.get("logo");
  if (!parsed.success || !(logo instanceof File)) return Response.json({ error: "Wybierz drużynę i plik logo." }, { status: 400 });
  if (!allowedTypes.has(logo.type)) return Response.json({ error: "Logo musi być plikiem PNG, JPG lub WebP." }, { status: 400 });
  if (!logo.size || logo.size > 3 * 1024 * 1024) return Response.json({ error: "Logo może mieć maksymalnie 3 MB." }, { status: 400 });

  const teamKey = normalizeTeamKey(parsed.data.teamName);
  const objectKey = teamLogoObjectKey(parsed.data.league, parsed.data.teamName);
  const bytes = new Uint8Array(await logo.arrayBuffer());
  const signature = Array.from(bytes.subarray(0, 12));
  const valid = logo.type === "image/png" ? signature.slice(0, 8).join(",") === "137,80,78,71,13,10,26,10"
    : logo.type === "image/jpeg" ? signature[0] === 255 && signature[1] === 216 && signature[2] === 255
    : String.fromCharCode(...signature.slice(0, 4)) === "RIFF" && String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
  if (!valid) return Response.json({ error: "Zawartość pliku nie jest obrazem PNG, JPG lub WebP." }, { status: 400 });
  const now = new Date().toISOString();
  const db = getD1();
  const statements = [db.prepare(`INSERT INTO team_logos (league, team_key, object_key, file_name, content_type, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT (league, team_key) DO UPDATE SET object_key = excluded.object_key, file_name = excluded.file_name, content_type = excluded.content_type, updated_at = excluded.updated_at`)
    .bind(parsed.data.league, teamKey, objectKey, logo.name.slice(0, 180), logo.type, now),
    db.prepare("DELETE FROM team_logo_chunks WHERE league=? AND team_key=?").bind(parsed.data.league, teamKey)];
  for (let pos = 0, part = 0; pos < bytes.length; pos += 524288, part++)
    statements.push(db.prepare("INSERT INTO team_logo_chunks(league,team_key,part,content) VALUES (?,?,?,?)")
      .bind(parsed.data.league, teamKey, part, bytes.slice(pos, pos + 524288).buffer));
  await db.batch(statements);
  return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Nie udało się zapisać logo. Dotychczasowe logo pozostaje bez zmian. Spróbuj ponownie." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const form = await request.formData();
  const parsed = teamSchema.safeParse({ league: form.get("league"), teamName: form.get("teamName") });
  if (!parsed.success) return Response.json({ error: "Nieprawidłowa drużyna." }, { status: 400 });
  const teamKey = normalizeTeamKey(parsed.data.teamName);
  const db = getD1();
  await db.batch([
    db.prepare("DELETE FROM team_logo_chunks WHERE league=? AND team_key=?").bind(parsed.data.league, teamKey),
    db.prepare("DELETE FROM team_logos WHERE league=? AND team_key=?").bind(parsed.data.league, teamKey),
  ]);
  return Response.json({ ok: true });
}
