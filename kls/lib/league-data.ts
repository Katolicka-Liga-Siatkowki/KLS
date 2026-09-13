import { env } from "cloudflare:workers";
import type { AdminRecord, GalleryAlbum, GalleryPhoto, LeagueMatch, LeagueSnapshot, NewsPost, Player, SiteLink, SiteSection, Standing, Team } from "./league-types";
import { seedMatches, seedPlayers, seedTeams } from "./seed-data";
import { loadGoogleSheetsLeague } from "./google-sheets-data";
import { matchMediaKey, normalizeTeamKey, sectionMediaKey, teamCoverMediaKey } from "./team-logo";

function database(): D1Database {
  if (!env.DB) throw new Error("Baza danych ligi jest chwilowo niedostępna.");
  return env.DB;
}

export async function ensureSeeded() {
  const db = database();
  const marker = await db.prepare("SELECT value FROM settings WHERE key = ?").bind("initial_data_v1").first();
  const createdAt = new Date().toISOString();
  if (!marker) {
    const statements: D1PreparedStatement[] = [];
    for (const team of seedTeams) {
      statements.push(
        db.prepare("INSERT OR IGNORE INTO teams (id, league, name, short_name, location, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)")
          .bind(team.id, team.league, team.name, "", team.location, createdAt),
      );
    }
    let playerId = 1;
    for (const [teamIdText, names] of Object.entries(seedPlayers)) {
      names.forEach((name, sortOrder) => {
        statements.push(
          db.prepare("INSERT OR IGNORE INTO players (id, team_id, name, number, role, active, sort_order) VALUES (?, ?, ?, NULL, ?, 1, ?)")
            .bind(playerId++, Number(teamIdText), name, "Zawodnik", sortOrder),
        );
      });
    }
    for (const match of seedMatches) {
      statements.push(
        db.prepare("INSERT OR IGNORE INTO matches (id, league, match_date, home_team_id, away_team_id, venue, status, home_sets, away_sets, set_scores, published, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)")
          .bind(match.id, match.league, match.matchDate, match.homeTeamId, match.awayTeamId, match.venue, match.status, match.homeSets, match.awaySets, JSON.stringify(match.setScores), createdAt),
      );
    }
    statements.push(db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("season", "2026/2027"));
    statements.push(db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("initial_data_v1", createdAt));
    await db.batch(statements);
  }

  const cmsMarker = await db.prepare("SELECT value FROM settings WHERE key = ?").bind("cms_sections_v1").first();
  if (!cmsMarker) {
    const sections = [
      ["start", "system", "Start", "SEZON", "Katolicka Liga Siatkówki", "Aktualne wyniki, terminarz, tabela i składy drużyn Katolickiej Ligi Siatkówki.", "banner", 10],
      ["tabela", "system", "Tabela", "KLASYFIKACJA", "Tabela ligowa", "Klasyfikacja jest pobierana bezpośrednio z oficjalnego arkusza rozgrywek.", "standard", 20],
      ["mecze", "system", "Mecze", "TERMINARZ I WYNIKI", "Mecze ligowe", "Najbliższe spotkania i ostatnie wyniki z arkusza ligi.", "split", 30],
      ["druzyny", "system", "Drużyny", "ZESPOŁY I ZAWODNICY", "Drużyny", "Wybierz drużynę, aby zobaczyć jej skład i bilans.", "standard", 40],
      ["zgloszenia", "system", "Zgłoszenia", "SEZON", "Zgłoś drużynę", "Pobierz dokumenty, przygotuj skład i prześlij kompletne zgłoszenie do Zarządu KLS.", "standard", 50],
      ["dokumenty", "system", "Dokumenty", "PLIKI DO POBRANIA", "Dokumenty i przepisy", "Regulamin ligi i oficjalne przepisy gry.", "standard", 60],
    ];
    const statements = sections.map((section) =>
      db.prepare("INSERT OR IGNORE INTO site_sections (section_key, kind, nav_label, eyebrow, title, body, layout, sort_order, visible, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)")
        .bind(...section, createdAt, createdAt),
    );
    statements.push(
      db.prepare("INSERT INTO site_links (label, url, location, sort_order, visible, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)")
        .bind("katolickaligasiatkowki@gmail.com", "mailto:katolickaligasiatkowki@gmail.com", "footer", 10, createdAt, createdAt),
      db.prepare("INSERT INTO site_links (label, url, location, sort_order, visible, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)")
        .bind("Facebook", "https://www.facebook.com/KatolickaLigaSiatkowki", "social", 20, createdAt, createdAt),
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("cms_sections_v1", createdAt),
    );
    await db.batch(statements);
  }

  const footerCleanupMarker = await db.prepare("SELECT value FROM settings WHERE key = ?").bind("cms_footer_cleanup_v1").first();
  if (!footerCleanupMarker) {
    await db.batch([
      db.prepare("DELETE FROM site_links WHERE id NOT IN (SELECT MIN(id) FROM site_links GROUP BY lower(url), location)"),
      db.prepare("UPDATE site_links SET label = ? WHERE lower(url) = ?")
        .bind("katolickaligasiatkowki@gmail.com", "mailto:katolickaligasiatkowki@gmail.com"),
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind("cms_footer_cleanup_v1", createdAt),
    ]);
  }

  const expandedSectionsMarker = await db.prepare("SELECT value FROM settings WHERE key = ?").bind("cms_sections_v2").first();
  if (!expandedSectionsMarker) {
    await db.batch([
      db.prepare("INSERT OR IGNORE INTO site_sections (section_key, kind, nav_label, eyebrow, title, body, layout, sort_order, visible, created_at, updated_at) VALUES ('aktualnosci', 'system', 'Aktualności', 'NA BIEŻĄCO', 'Aktualności ligi', 'Bieżące informacje organizacyjne i sportowe Katolickiej Ligi Siatkówki.', 'standard', 15, 1, ?, ?)").bind(createdAt, createdAt),
      db.prepare("INSERT OR IGNORE INTO site_sections (section_key, kind, nav_label, eyebrow, title, body, layout, sort_order, visible, created_at, updated_at) VALUES ('galeria', 'system', 'Galeria', 'ZDJĘCIA KLS', 'Galeria', 'Albumy zdjęć z meczów, finałów, turniejów i wydarzeń ligi.', 'standard', 45, 1, ?, ?)").bind(createdAt, createdAt),
      db.prepare("INSERT OR IGNORE INTO site_sections (section_key, kind, nav_label, eyebrow, title, body, layout, sort_order, visible, created_at, updated_at) VALUES ('kontakt', 'system', 'Kontakt', 'NAPISZ DO NAS', 'Kontakt z Zarządem KLS', 'Wyślij wiadomość bezpośrednio do Zarządu Katolickiej Ligi Siatkówki.', 'standard', 70, 1, ?, ?)").bind(createdAt, createdAt),
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('cms_sections_v2', ?)").bind(createdAt),
    ]);
  }
}

export async function reconcileAdminPlayersWithGoogleSheets() {
  await ensureSeeded();
  const db = database();
  const markerKey = "google_teams_players_cleanup_v2";
  const sheets = await loadGoogleSheetsLeague();
  if (sheets.failedLeagues.length) throw new Error(`Nie udało się pobrać ligi: ${sheets.failedLeagues.join(", ")}`);

  const teamRows = await db.prepare("SELECT id, league, name FROM teams").all();
  const databaseTeams = (teamRows.results ?? []).map((row) => ({ id: Number(row.id), league: Number(row.league), name: String(row.name) }));
  const matchedTeamIds = new Set<number>();

  for (const sheetTeam of sheets.teams.filter((team) => team.active)) {
    let databaseTeam = databaseTeams.find((team) => team.league === sheetTeam.league && normalizeTeamKey(team.name) === normalizeTeamKey(sheetTeam.name));
    if (!databaseTeam) {
      const result = await db.prepare("INSERT INTO teams (league, name, short_name, location, active, created_at) VALUES (?, ?, ?, ?, 1, ?)")
        .bind(sheetTeam.league, sheetTeam.name, sheetTeam.shortName || "", sheetTeam.location || "", new Date().toISOString()).run();
      databaseTeam = { id: Number(result.meta.last_row_id), league: sheetTeam.league, name: sheetTeam.name };
      databaseTeams.push(databaseTeam);
    }
    matchedTeamIds.add(databaseTeam.id);
    await db.prepare("UPDATE teams SET name = ?, short_name = ?, location = ?, active = 1 WHERE id = ?")
      .bind(sheetTeam.name, sheetTeam.shortName || "", sheetTeam.location || "", databaseTeam.id).run();

    const playerRows = await db.prepare("SELECT id, name FROM players WHERE team_id = ? ORDER BY id").bind(databaseTeam.id).all();
    const databasePlayers = (playerRows.results ?? []).map((row) => ({ id: Number(row.id), name: String(row.name), used: false }));
    for (const [sortOrder, sheetPlayer] of sheetTeam.players.filter((player) => player.active).entries()) {
      const existing = databasePlayers.find((player) => !player.used && normalizeTeamKey(player.name) === normalizeTeamKey(sheetPlayer.name));
      if (existing) {
        existing.used = true;
        await db.prepare("UPDATE players SET name = ?, number = ?, role = ?, active = 1, sort_order = ? WHERE id = ?")
          .bind(sheetPlayer.name, sheetPlayer.number, sheetPlayer.role || "Zawodnik", sortOrder, existing.id).run();
      } else {
        await db.prepare("INSERT INTO players (team_id, name, number, role, active, sort_order) VALUES (?, ?, ?, ?, 1, ?)")
          .bind(databaseTeam.id, sheetPlayer.name, sheetPlayer.number, sheetPlayer.role || "Zawodnik", sortOrder).run();
      }
    }
    for (const player of databasePlayers.filter((item) => !item.used)) {
      await db.prepare("UPDATE players SET active = 0 WHERE id = ?").bind(player.id).run();
    }
  }

  for (const team of databaseTeams.filter((item) => !matchedTeamIds.has(item.id))) {
    await db.batch([
      db.prepare("UPDATE teams SET active = 0 WHERE id = ?").bind(team.id),
      db.prepare("UPDATE players SET active = 0 WHERE team_id = ?").bind(team.id),
    ]);
  }
  await db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").bind(markerKey, new Date().toISOString()).run();
}

function bool(value: unknown) {
  return value === true || value === 1;
}

function safeScores(value: unknown): string[] {
  try {
    const parsed = JSON.parse(String(value ?? "[]"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function calculateStandings(league: number, teams: Team[], matches: LeagueMatch[]): Standing[] {
  const table = new Map<number, Standing>();
  teams.filter((team) => team.league === league && team.active).forEach((team) => {
    table.set(team.id, { teamId: team.id, name: team.name, played: 0, wins: 0, losses: 0, setsWon: 0, setsLost: 0, pointsWon: 0, pointsLost: 0, points: 0, form: [] });
  });

  matches
    .filter((match) => match.league === league && match.status === "finished" && match.published)
    .sort((a, b) => a.matchDate.localeCompare(b.matchDate))
    .forEach((match) => {
      const home = table.get(match.homeTeamId);
      const away = table.get(match.awayTeamId);
      if (!home || !away) return;
      home.played += 1; away.played += 1;
      home.setsWon += match.homeSets; home.setsLost += match.awaySets;
      away.setsWon += match.awaySets; away.setsLost += match.homeSets;
      for (const score of match.setScores) {
        const [homePoints, awayPoints] = score.split(":").map(Number);
        if (Number.isFinite(homePoints) && Number.isFinite(awayPoints)) {
          home.pointsWon += homePoints; home.pointsLost += awayPoints;
          away.pointsWon += awayPoints; away.pointsLost += homePoints;
        }
      }
      const homeWon = match.homeSets > match.awaySets;
      (homeWon ? home : away).wins += 1;
      (homeWon ? away : home).losses += 1;
      home.form.push(homeWon ? "W" : "P");
      away.form.push(homeWon ? "P" : "W");
      if (Math.abs(match.homeSets - match.awaySets) >= 2) {
        (homeWon ? home : away).points += 3;
      } else {
        (homeWon ? home : away).points += 2;
        (homeWon ? away : home).points += 1;
      }
    });

  const ratio = (a: number, b: number) => (b === 0 ? (a > 0 ? Number.POSITIVE_INFINITY : 0) : a / b);
  return [...table.values()]
    .map((row) => ({ ...row, form: row.form.slice(-5) }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || ratio(b.setsWon, b.setsLost) - ratio(a.setsWon, a.setsLost) || ratio(b.pointsWon, b.pointsLost) - ratio(a.pointsWon, a.pointsLost) || a.name.localeCompare(b.name, "pl"));
}

export async function getLeagueSnapshot(options: { useGoogleSheets?: boolean; includeOfficialMatches?: boolean } = {}): Promise<LeagueSnapshot> {
  await ensureSeeded();
  const db = database();
  const [teamRows, playerRows, matchRows, adminRows, seasonRow, sectionRows, linkRows, teamLogoRows, playerPhotoRows, mediaRows, albumRows, galleryPhotoRows, newsRows] = await Promise.all([
    db.prepare("SELECT id, league, name, short_name, location, active FROM teams ORDER BY league, name").all(),
    db.prepare("SELECT id, team_id, name, number, role, active, sort_order FROM players ORDER BY team_id, sort_order, name").all(),
    db.prepare("SELECT id, league, match_date, home_team_id, away_team_id, venue, status, home_sets, away_sets, set_scores, published FROM matches ORDER BY match_date DESC").all(),
    db.prepare("SELECT id, email, display_name, created_at FROM admins ORDER BY email").all(),
    db.prepare("SELECT value FROM settings WHERE key = ?").bind("season").first<{ value: string }>(),
    db.prepare("SELECT id, section_key, kind, nav_label, eyebrow, title, body, layout, sort_order, visible FROM site_sections ORDER BY sort_order, id").all(),
    db.prepare("SELECT id, label, url, location, sort_order, visible FROM site_links ORDER BY location, sort_order, id").all(),
    db.prepare("SELECT id, league, team_key, updated_at FROM team_logos").all(),
    db.prepare("SELECT id, league, team_key, player_key, updated_at FROM player_photos").all(),
    db.prepare("SELECT id, kind, entity_key, updated_at, position_x, position_y FROM media_assets").all(),
    db.prepare("SELECT id, slug, name, description, sort_order, visible FROM gallery_albums ORDER BY sort_order, id").all(),
    db.prepare("SELECT id, album_id, match_key, caption, sort_order FROM gallery_photos ORDER BY sort_order, id").all(),
    db.prepare("SELECT id, title, body, link_label, link_url, published_at, visible FROM news_posts ORDER BY published_at DESC, id DESC").all(),
  ]);

  const mediaUrls = new Map((mediaRows.results ?? []).map((row) => [
    `${String(row.kind)}:${String(row.entity_key)}`,
    `/api/media?id=${Number(row.id)}&v=${encodeURIComponent(String(row.updated_at))}`,
  ]));
  const mediaPositions = new Map((mediaRows.results ?? []).map((row) => [`${String(row.kind)}:${String(row.entity_key)}`, { x: Number(row.position_x ?? 50), y: Number(row.position_y ?? 50) }]));
  const galleryPhotos = (galleryPhotoRows.results ?? []).map((row) => ({ id: Number(row.id), albumId: row.album_id == null ? null : Number(row.album_id), matchKey: String(row.match_key), url: `/api/gallery-photo?id=${Number(row.id)}`, caption: String(row.caption), sortOrder: Number(row.sort_order) })) satisfies GalleryPhoto[];
  const galleryAlbums = (albumRows.results ?? []).map((row) => ({ id: Number(row.id), slug: String(row.slug), name: String(row.name), description: String(row.description), sortOrder: Number(row.sort_order), visible: bool(row.visible), photos: galleryPhotos.filter((photo) => photo.albumId === Number(row.id)) })) satisfies GalleryAlbum[];
  const newsPosts = (newsRows.results ?? []).map((row) => ({ id: Number(row.id), title: String(row.title), body: String(row.body), linkLabel: String(row.link_label), linkUrl: String(row.link_url), publishedAt: String(row.published_at), visible: bool(row.visible) })) satisfies NewsPost[];

  const playerPhotoUrls = new Map((playerPhotoRows.results ?? []).map((row) => [
    `${Number(row.league)}:${String(row.team_key)}:${String(row.player_key)}`,
    `/api/player-photo?id=${Number(row.id)}&v=${encodeURIComponent(String(row.updated_at))}`,
  ]));
  const players = (playerRows.results ?? []).map((row) => ({
    id: Number(row.id), teamId: Number(row.team_id), name: String(row.name), number: row.number == null ? null : Number(row.number), role: String(row.role), active: bool(row.active), sortOrder: Number(row.sort_order),
  })) satisfies Player[];
  const teams = (teamRows.results ?? []).map((row) => {
    const league = Number(row.league);
    const name = String(row.name);
    return {
      id: Number(row.id), league, name, shortName: String(row.short_name), location: String(row.location), active: bool(row.active),
      players: players.filter((player) => player.teamId === Number(row.id)).map((player) => ({
        ...player,
        photoUrl: playerPhotoUrls.get(`${league}:${normalizeTeamKey(name)}:${normalizeTeamKey(player.name)}`),
      })),
    };
  }) satisfies Team[];
  const names = new Map(teams.map((team) => [team.id, team.name]));
  const matches = (matchRows.results ?? []).map((row) => ({
    id: Number(row.id), league: Number(row.league), matchDate: String(row.match_date), homeTeamId: Number(row.home_team_id), awayTeamId: Number(row.away_team_id), homeTeam: names.get(Number(row.home_team_id)) ?? "Drużyna", awayTeam: names.get(Number(row.away_team_id)) ?? "Drużyna", venue: String(row.venue), status: row.status === "finished" ? "finished" as const : "scheduled" as const, homeSets: Number(row.home_sets), awaySets: Number(row.away_sets), setScores: safeScores(row.set_scores), published: bool(row.published),
  })) satisfies LeagueMatch[];
  const adminRecords = (adminRows.results ?? []).map((row) => ({
    id: Number(row.id), email: String(row.email), displayName: String(row.display_name), createdAt: String(row.created_at),
  })) satisfies AdminRecord[];
  const sections = (sectionRows.results ?? []).map((row) => ({
    id: Number(row.id), sectionKey: String(row.section_key), kind: row.kind === "system" ? "system" as const : "custom" as const,
    navLabel: String(row.nav_label), eyebrow: String(row.eyebrow), title: String(row.title), body: String(row.body),
    layout: row.layout === "split" || row.layout === "banner" ? row.layout : "standard" as const,
    sortOrder: Number(row.sort_order), visible: bool(row.visible),
    imageUrl: mediaUrls.get(`section:${sectionMediaKey(String(row.section_key))}`),
  })) satisfies SiteSection[];
  const linkRecords = (linkRows.results ?? []).map((row) => ({
    id: Number(row.id), label: String(row.label), url: String(row.url), location: row.location === "social" ? "social" as const : "footer" as const,
    sortOrder: Number(row.sort_order), visible: bool(row.visible),
  })) satisfies SiteLink[];
  const links = [...new Map(linkRecords.map((link) => [`${link.location}:${link.url.toLocaleLowerCase("pl")}`, link] as const)).values()];
  const logoUrls = new Map((teamLogoRows.results ?? []).map((row) => [
    `${Number(row.league)}:${String(row.team_key)}`,
    `/api/team-logo?id=${Number(row.id)}&v=${encodeURIComponent(String(row.updated_at))}`,
  ]));
  const withLogos = (items: Team[]) => items.map((team) => ({
    ...team,
    logoUrl: logoUrls.get(`${team.league}:${normalizeTeamKey(team.name)}`),
    coverUrl: mediaUrls.get(`team-cover:${teamCoverMediaKey(team.league, team.name)}`),
    coverPositionX: mediaPositions.get(`team-cover:${teamCoverMediaKey(team.league, team.name)}`)?.x ?? 50,
    coverPositionY: mediaPositions.get(`team-cover:${teamCoverMediaKey(team.league, team.name)}`)?.y ?? 50,
    players: team.players.map((player) => ({
      ...player,
      photoUrl: playerPhotoUrls.get(`${team.league}:${normalizeTeamKey(team.name)}:${normalizeTeamKey(player.name)}`),
    })),
  }));
  const withMatchImages = (items: LeagueMatch[]) => items.map((match) => ({
    ...match,
    imageUrl: mediaUrls.get(`match:${matchMediaKey(match)}`),
    photos: galleryPhotos.filter((photo) => photo.matchKey === matchMediaKey(match)),
  }));

  let liveTeams: Team[] = teams, liveMatches = matches;
  let officialMatches: LeagueMatch[] | undefined;
  let liveStandings: Record<string, Standing[]> = { "1": calculateStandings(1, teams, matches) };
  let dataSource: LeagueSnapshot["dataSource"] = {
    mode: "backup", updatedAt: new Date().toISOString(),
    leagues: {
      "1": { title: "Rozgrywki KLS", url: "", rows: liveStandings["1"].length, matches: matches.filter((match) => match.league === 1).length },
    },
  };
  if (options.useGoogleSheets !== false) {
    try {
      const sheets = await loadGoogleSheetsLeague();
      const successful = new Set<number>(sheets.successfulLeagues);
      liveTeams = [...teams.filter((team) => !successful.has(team.league)), ...sheets.teams];
      liveMatches = [...matches.filter((match) => !successful.has(match.league)), ...sheets.matches];
      liveStandings = { ...liveStandings, ...sheets.standings };
      dataSource = {
        mode: sheets.failedLeagues.length ? "mixed" : "google-sheets",
        updatedAt: new Date().toISOString(),
        leagues: { ...dataSource.leagues, ...sheets.leagues },
      };
    } catch (error) {
      console.error("Google Sheets league data unavailable", error);
    }
  }
  if (options.includeOfficialMatches && options.useGoogleSheets === false) {
    try {
      const sheets = await loadGoogleSheetsLeague();
      const successful = new Set<number>(sheets.successfulLeagues);
      officialMatches = [...matches.filter((match) => !successful.has(match.league)), ...sheets.matches];
      dataSource = {
        mode: sheets.failedLeagues.length ? "mixed" : "google-sheets",
        updatedAt: new Date().toISOString(),
        leagues: { ...dataSource.leagues, ...sheets.leagues },
      };
    } catch (error) {
      console.error("Google Sheets match list unavailable in admin", error);
      officialMatches = [];
    }
  }
  liveTeams = withLogos(liveTeams);
  liveMatches = withMatchImages(liveMatches);
  officialMatches = officialMatches ? withMatchImages(officialMatches) : undefined;

  return {
    season: seasonRow?.value ?? "2026/2027",
    teams: liveTeams,
    matches: liveMatches,
    officialMatches,
    standings: liveStandings,
    admins: adminRecords,
    sections,
    links,
    galleryAlbums,
    newsPosts,
    dataSource,
  };
}

export function getD1() {
  return database();
}
