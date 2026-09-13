export type Player = {
  id: number;
  teamId: number;
  name: string;
  number: number | null;
  role: string;
  active: boolean;
  sortOrder: number;
  photoUrl?: string;
};

export type Team = {
  id: number;
  league: number;
  name: string;
  shortName: string;
  location: string;
  active: boolean;
  logoUrl?: string;
  coverUrl?: string;
  coverPositionX?: number;
  coverPositionY?: number;
  players: Player[];
};

export type LeagueMatch = {
  id: number;
  league: number;
  matchDate: string;
  displayDate?: string;
  homeTeamId: number;
  awayTeamId: number;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  status: "scheduled" | "finished";
  homeSets: number;
  awaySets: number;
  setScores: string[];
  smallPoints?: string;
  published: boolean;
  imageUrl?: string;
  photos?: GalleryPhoto[];
};

export type GalleryPhoto = {
  id: number;
  albumId: number | null;
  matchKey: string;
  url: string;
  caption: string;
  sortOrder: number;
};

export type GalleryAlbum = {
  id: number;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  visible: boolean;
  photos: GalleryPhoto[];
};

export type NewsPost = {
  id: number;
  title: string;
  body: string;
  linkLabel: string;
  linkUrl: string;
  publishedAt: string;
  visible: boolean;
};

export type Standing = {
  teamId: number;
  name: string;
  played: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  points: number;
  form: ("W" | "P")[];
};

export type AdminRecord = {
  id: number;
  email: string;
  displayName: string;
  createdAt: string;
};

export type SiteSection = {
  id: number;
  sectionKey: string;
  kind: "system" | "custom";
  navLabel: string;
  eyebrow: string;
  title: string;
  body: string;
  layout: "standard" | "split" | "banner";
  sortOrder: number;
  visible: boolean;
  imageUrl?: string;
};

export type SiteLink = {
  id: number;
  label: string;
  url: string;
  location: "footer" | "social";
  sortOrder: number;
  visible: boolean;
};

export type LeagueDataSource = {
  mode: "google-sheets" | "mixed" | "backup";
  updatedAt: string;
  leagues: Record<string, { title: string; url: string; rows: number; matches: number }>;
};

export type LeagueSnapshot = {
  season: string;
  teams: Team[];
  matches: LeagueMatch[];
  officialMatches?: LeagueMatch[];
  standings: Record<string, Standing[]>;
  admins: AdminRecord[];
  sections: SiteSection[];
  links: SiteLink[];
  galleryAlbums: GalleryAlbum[];
  newsPosts: NewsPost[];
  dataSource: LeagueDataSource;
};
