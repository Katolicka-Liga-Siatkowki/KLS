export function normalizeTeamKey(value: string) {
  return value.trim().toLocaleLowerCase("pl").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function teamLogoObjectKey(league: number, teamName: string) {
  const value = `${league}:${normalizeTeamKey(teamName)}`;
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `team-logos/${league}/${(hash >>> 0).toString(16)}`;
}

export function playerPhotoObjectKey(league: number, teamName: string, playerName: string) {
  const value = `${league}:${normalizeTeamKey(teamName)}:${normalizeTeamKey(playerName)}`;
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return `player-photos/${league}/${(hash >>> 0).toString(16)}`;
}

function hashKey(value: string) {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(16);
}

export function teamCoverMediaKey(league: number, teamName: string) {
  return `${league}:${normalizeTeamKey(teamName)}`;
}

export function matchMediaKey(match: { league: number; matchDate: string; homeTeam: string; awayTeam: string }) {
  return `${match.league}:${match.matchDate.trim()}:${normalizeTeamKey(match.homeTeam)}:${normalizeTeamKey(match.awayTeam)}`;
}

export function sectionMediaKey(sectionKey: string) {
  return sectionKey.trim().toLocaleLowerCase("pl");
}

export function mediaObjectKey(kind: string, entityKey: string) {
  return `media/${kind}/${hashKey(`${kind}:${entityKey}`)}`;
}
