import { env } from "cloudflare:workers";
import { getSheetLinks, parseSheetLinks } from "./sheet-settings";
import type { LeagueMatch, Player, Standing, Team } from "./league-types";

const sheetId = () => (env as unknown as { KLS_SHEET_ID?: string }).KLS_SHEET_ID?.trim() || "";
const SHEETS = { 1: { get id() { return sheetId(); }, title: "Tabela KLS" } } as const;

const GIDS = { matches: "1813126838", table: "1968027780", teams: "618067632", players: "1167048519" };

function csvRows(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { cell += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") { row.push(cell); cell = ""; }
    else if (char === "\n") { row.push(cell.replace(/\r$/, "")); rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, "")); rows.push(row); }
  return rows;
}

function number(value: string | undefined) {
  const result = Number(String(value ?? "").replace(",", ".").trim());
  return Number.isFinite(result) ? result : 0;
}

function key(value: string) {
  return value.trim().toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isTeamName(value: string | undefined) {
  const normalized = key(value ?? "");
  return Boolean(normalized) && !new Set([
    "druzyna",
    "druzyny",
    "nazwa druzyny",
    "druzyna (pelna nazwa)",
    "druzyny (pelna nazwa)",
  ]).has(normalized);
}

function stableId(league: number, name: string) {
  let hash = 2166136261;
  for (const char of `${league}:${key(name)}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return Math.abs(hash) + 1000;
}

function exportUrl(id: string, gid: string, range?: string) {
  const rangeParam = range ? `&range=${encodeURIComponent(range)}` : "";
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&gid=${gid}${rangeParam}`;
}

async function csv(id: string, gid: string, range?: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(exportUrl(id, gid, range), { cache: "no-store", signal: AbortSignal.timeout(25000) });
      if (!response.ok) throw new Error(`Arkusz zwrócił błąd ${response.status}`);
      const text = await response.text();
      if (!text.trim() || /<html[\s>]/i.test(text)) throw new Error("Arkusz nie zwrócił danych CSV");
      return csvRows(text);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Nie udało się pobrać arkusza");
}

function parseStandings(rows: string[][], league: number): Standing[] {
  return rows.filter((row) => /^\d+$/.test(row[0]?.trim()) && isTeamName(row[1])).map((row) => ({
    teamId: stableId(league, row[1]),
    name: row[1].trim(),
    points: number(row[2]),
    played: number(row[3]),
    wins: number(row[4]),
    losses: number(row[5]),
    setsWon: number(row[14]),
    setsLost: number(row[15]),
    pointsWon: number(row[16]),
    pointsLost: number(row[17]),
    form: (row[18]?.match(/[🟢🔴]/g) ?? []).map((icon) => icon === "🟢" ? "W" as const : "P" as const).slice(-5),
  }));
}

function dateValue(value: string, rowIndex: number) {
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  if (iso) return { sort: `${iso[1]}-${iso[2]}-${iso[3]}T${iso[4] ?? "12"}:${iso[5] ?? "00"}`, display: trimmed };
  const polish = trimmed.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (polish) {
    const year = polish[3].length === 2 ? `20${polish[3]}` : polish[3];
    return { sort: `${year}-${polish[2].padStart(2, "0")}-${polish[1].padStart(2, "0")}T${(polish[4] ?? "12").padStart(2, "0")}:${polish[5] ?? "00"}`, display: trimmed };
  }
  return { sort: `9999-12-31T23:${String(rowIndex % 60).padStart(2, "0")}`, display: trimmed || "Termin do ustalenia" };
}

function parseMatches(rows: string[][], league: number): LeagueMatch[] {
  return rows.flatMap((row, index) => {
    const home = row[3]?.trim(), away = row[4]?.trim();
    if (!isTeamName(home) || !isTeamName(away)) return [];
    const homeRaw = row[5]?.trim(), awayRaw = row[7]?.trim();
    const finished = /^\d+$/.test(homeRaw) && /^\d+$/.test(awayRaw);
    const date = dateValue(row[1] ?? "", index);
    return [{
      id: stableId(league, `${index}:${home}:${away}`),
      league,
      matchDate: date.sort,
      displayDate: date.display,
      homeTeamId: stableId(league, home),
      awayTeamId: stableId(league, away),
      homeTeam: home,
      awayTeam: away,
      venue: row[2]?.trim() ?? "",
      status: finished ? "finished" as const : "scheduled" as const,
      homeSets: finished ? number(homeRaw) : 0,
      awaySets: finished ? number(awayRaw) : 0,
      setScores: [],
      smallPoints: row[8]?.trim() && row[10]?.trim() ? `${row[8].trim()}:${row[10].trim()}` : undefined,
      published: true,
    }];
  });
}

function addMatchForm(standings: Standing[], matches: LeagueMatch[]) {
  const formByTeam = new Map<string, ("W" | "P")[]>();
  const add = (team: string, result: "W" | "P") => {
    const teamKey = key(team);
    formByTeam.set(teamKey, [...(formByTeam.get(teamKey) ?? []), result]);
  };

  matches.forEach((match) => {
    if (match.status !== "finished" || match.homeSets === match.awaySets) return;
    const homeWon = match.homeSets > match.awaySets;
    add(match.homeTeam, homeWon ? "W" : "P");
    add(match.awayTeam, homeWon ? "P" : "W");
  });

  return standings.map((row) => ({ ...row, form: (formByTeam.get(key(row.name)) ?? []).slice(-5) }));
}

function parseTeams(teamRows: string[][], playerRows: string[][], standings: Standing[], league: number): Team[] {
  const fullNames = new Map<string, string>();
  teamRows.slice(1).forEach((row) => {
    const short = row[1]?.trim();
    if (isTeamName(short)) fullNames.set(key(short), row[0]?.trim() || short);
  });
  const playerMap = new Map<string, Player[]>();
  playerRows.slice(1).forEach((row, index) => {
    const name = row[0]?.trim(), team = row[1]?.trim();
    if (!name || !isTeamName(team) || key(name) === "zawodnik") return;
    const teamKey = key(team);
    const list = playerMap.get(teamKey) ?? [];
    list.push({ id: stableId(league, `player:${index}:${name}`), teamId: stableId(league, team), name, number: null, role: "Zawodnik", active: true, sortOrder: index });
    playerMap.set(teamKey, list);
    if (!fullNames.has(teamKey)) fullNames.set(teamKey, team);
  });
  standings.forEach((row) => { if (!fullNames.has(key(row.name))) fullNames.set(key(row.name), row.name); });
  return [...fullNames.entries()].map(([teamKey, fullName]) => {
    const standing = standings.find((row) => key(row.name) === teamKey);
    const shortName = standing?.name ?? teamRows.slice(1).find((row) => key(row[1] ?? "") === teamKey)?.[1]?.trim() ?? fullName;
    const id = stableId(league, shortName);
    return { id, league, name: shortName, shortName, location: fullName === shortName ? "" : fullName, active: true, players: (playerMap.get(teamKey) ?? []).map((player) => ({ ...player, teamId: id })) };
  });
}

export async function loadGoogleSheetsLeague() {
  const savedLinks = await getSheetLinks();
  const configured = savedLinks.table ? parseSheetLinks(savedLinks) : null;
  if (!configured && !sheetId()) throw new Error("Arkusz KLS nie został jeszcze podłączony.");
  const gids = configured?.gids ?? GIDS;
  const results = await Promise.allSettled(([1] as const).map(async (league) => {
    const source = configured ? { id: configured.id, title: "Tabela KLS" } : SHEETS[league];
    const [tableRows, matchRows, teamRows, playerRows] = await Promise.all([
      csv(source.id, gids.table), csv(source.id, gids.matches, "A4:N"), csv(source.id, gids.teams), csv(source.id, gids.players),
    ]);
    const matches = parseMatches(matchRows, league);
    const standings = addMatchForm(parseStandings(tableRows, league), matches);
    const teams = parseTeams(teamRows, playerRows, standings, league);
    return { league, source, standings, matches, teams };
  }));
  const leagueEntries = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const failedLeagues = results.flatMap((result, index) => result.status === "rejected" ? [([1] as const)[index]] : []);
  if (!leagueEntries.length) throw new Error("Nie udało się pobrać danych żadnej ligi z Arkuszy Google");
  return {
    teams: leagueEntries.flatMap((entry) => entry.teams),
    matches: leagueEntries.flatMap((entry) => entry.matches),
    successfulLeagues: leagueEntries.map((entry) => entry.league),
    failedLeagues,
    standings: Object.fromEntries(leagueEntries.map((entry) => [String(entry.league), entry.standings])),
    leagues: Object.fromEntries(leagueEntries.map((entry) => [String(entry.league), {
      title: entry.source.title,
      url: `https://docs.google.com/spreadsheets/d/${entry.source.id}/edit`,
      rows: entry.standings.length,
      matches: entry.matches.length,
    }])),
  };
}

