import { env } from "cloudflare:workers";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { ensureSeeded, getD1 } from "@/lib/league-data";
import { normalizeTeamKey, playerPhotoObjectKey } from "@/lib/team-logo";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

function bucket() {
  const value = (env as unknown as { BUCKET?: R2Bucket }).BUCKET;
  if (!value) throw new Error("Magazyn zdjęć jest chwilowo niedostępny.");
  return value;
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const url = new URL(request.url);
  const parsed = z.coerce.number().int().positive().safeParse(url.searchParams.get("playerId"));
  const contentType = (request.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
  const fileName = url.searchParams.get("fileName")?.trim().slice(0, 180) || "zdjecie";
  if (!parsed.success) return Response.json({ error: "Nie wybrano prawidłowego zawodnika." }, { status: 400 });
  if (!allowedTypes.has(contentType)) return Response.json({ error: "Zdjęcie musi być plikiem PNG, JPG lub WebP." }, { status: 400 });

  const declaredSize = Number(request.headers.get("content-length") ?? 0);
  if (declaredSize > 5 * 1024 * 1024) return Response.json({ error: "Zdjęcie może mieć maksymalnie 5 MB." }, { status: 413 });

  let bytes: ArrayBuffer;
  try {
    bytes = await request.arrayBuffer();
  } catch (error) {
    console.error("Player photo body read failed", error);
    return Response.json({ error: "Nie udało się odczytać wybranego zdjęcia." }, { status: 400 });
  }
  if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024) {
    return Response.json({ error: "Zdjęcie może mieć maksymalnie 5 MB." }, { status: 413 });
  }

  try {
    const player = await getD1().prepare(`SELECT p.name, t.name AS team_name, t.league
      FROM players p JOIN teams t ON t.id = p.team_id WHERE p.id = ?`).bind(parsed.data).first<{ name: string; team_name: string; league: number }>();
    if (!player) return Response.json({ error: "Nie znaleziono zawodnika." }, { status: 404 });
    const objectKey = playerPhotoObjectKey(player.league, player.team_name, player.name);
    try {
      await bucket().put(objectKey, bytes, { httpMetadata: { contentType }, customMetadata: { originalName: fileName } });
    } catch (error) {
      console.error("Player photo R2 write failed", error);
      return Response.json({ error: "Nie udało się zapisać pliku w magazynie zdjęć Cloudflare." }, { status: 503 });
    }
    const now = new Date().toISOString();
    try {
      await getD1().prepare(`INSERT INTO player_photos (league, team_key, player_key, object_key, file_name, content_type, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (league, team_key, player_key) DO UPDATE SET object_key = excluded.object_key, file_name = excluded.file_name, content_type = excluded.content_type, updated_at = excluded.updated_at`)
        .bind(player.league, normalizeTeamKey(player.team_name), normalizeTeamKey(player.name), objectKey, fileName, contentType, now).run();
    } catch (error) {
      console.error("Player photo D1 write failed", error);
      return Response.json({ error: "Plik został wysłany, ale nie udało się przypisać zdjęcia do zawodnika w bazie danych." }, { status: 503 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Player photo upload failed", error);
    return Response.json({ error: "Cloudflare nie mógł zapisać zdjęcia. Spróbuj ponownie po odświeżeniu panelu." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  await ensureSeeded();
  const parsed = z.object({ playerId: z.coerce.number().int().positive() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Nie wybrano prawidłowego zawodnika." }, { status: 400 });

  const player = await getD1().prepare(`SELECT p.name, t.name AS team_name, t.league
    FROM players p JOIN teams t ON t.id = p.team_id WHERE p.id = ?`)
    .bind(parsed.data.playerId).first<{ name: string; team_name: string; league: number }>();
  if (!player) return Response.json({ error: "Nie znaleziono zawodnika." }, { status: 404 });

  const teamKey = normalizeTeamKey(player.team_name);
  const playerKey = normalizeTeamKey(player.name);
  const record = await getD1().prepare("SELECT object_key FROM player_photos WHERE league = ? AND team_key = ? AND player_key = ?")
    .bind(player.league, teamKey, playerKey).first<{ object_key: string }>();
  if (record) {
    try {
      await bucket().delete(record.object_key);
    } catch (error) {
      console.error("Player photo R2 delete failed", error);
      return Response.json({ error: "Nie udało się usunąć pliku z magazynu zdjęć Cloudflare." }, { status: 503 });
    }
  }
  await getD1().prepare("DELETE FROM player_photos WHERE league = ? AND team_key = ? AND player_key = ?")
    .bind(player.league, teamKey, playerKey).run();
  return Response.json({ ok: true });
}
