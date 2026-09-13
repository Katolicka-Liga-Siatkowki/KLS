import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const teams = sqliteTable(
  "teams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    league: integer("league").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name").notNull().default(""),
    location: text("location").notNull().default(""),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_teams_league_active").on(table.league, table.active),
    uniqueIndex("idx_teams_league_name").on(table.league, table.name),
  ],
);

export const teamLogos = sqliteTable(
  "team_logos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    league: integer("league").notNull(),
    teamKey: text("team_key").notNull(),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("idx_team_logos_league_team").on(table.league, table.teamKey)],
);

export const playerPhotos = sqliteTable(
  "player_photos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    league: integer("league").notNull(),
    teamKey: text("team_key").notNull(),
    playerKey: text("player_key").notNull(),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("idx_player_photos_identity").on(table.league, table.teamKey, table.playerKey)],
);

export const mediaAssets = sqliteTable(
  "media_assets",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    kind: text("kind").notNull(),
    entityKey: text("entity_key").notNull(),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    updatedAt: text("updated_at").notNull(),
    positionX: integer("position_x").notNull().default(50),
    positionY: integer("position_y").notNull().default(50),
  },
  (table) => [uniqueIndex("idx_media_assets_kind_entity").on(table.kind, table.entityKey)],
);

export const galleryAlbums = sqliteTable(
  "gallery_albums",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    visible: integer("visible", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("idx_gallery_albums_slug").on(table.slug), index("idx_gallery_albums_order").on(table.sortOrder)],
);

export const galleryPhotos = sqliteTable(
  "gallery_photos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    albumId: integer("album_id").references(() => galleryAlbums.id, { onDelete: "cascade" }),
    matchKey: text("match_key").notNull().default(""),
    objectKey: text("object_key").notNull(),
    fileName: text("file_name").notNull(),
    contentType: text("content_type").notNull(),
    caption: text("caption").notNull().default(""),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_gallery_photos_album_order").on(table.albumId, table.sortOrder), index("idx_gallery_photos_match_order").on(table.matchKey, table.sortOrder)],
);

export const newsPosts = sqliteTable(
  "news_posts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    linkLabel: text("link_label").notNull().default(""),
    linkUrl: text("link_url").notNull().default(""),
    publishedAt: text("published_at").notNull(),
    visible: integer("visible", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("idx_news_posts_visible_date").on(table.visible, table.publishedAt)],
);

export const players = sqliteTable(
  "players",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    number: integer("number"),
    role: text("role").notNull().default("Zawodnik"),
    active: integer("active", { mode: "boolean" }).notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [index("idx_players_team_active").on(table.teamId, table.active)],
);

export const matches = sqliteTable(
  "matches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    league: integer("league").notNull(),
    matchDate: text("match_date").notNull(),
    homeTeamId: integer("home_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "restrict" }),
    awayTeamId: integer("away_team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "restrict" }),
    venue: text("venue").notNull().default(""),
    status: text("status").notNull().default("scheduled"),
    homeSets: integer("home_sets").notNull().default(0),
    awaySets: integer("away_sets").notNull().default(0),
    setScores: text("set_scores").notNull().default("[]"),
    published: integer("published", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_matches_league_date").on(table.league, table.matchDate),
    index("idx_matches_status_published").on(table.status, table.published),
  ],
);

export const admins = sqliteTable(
  "admins",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    email: text("email").notNull(),
    displayName: text("display_name").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("idx_admins_email").on(table.email)],
);

export const adminSessions = sqliteTable(
  "admin_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    email: text("email").notNull(),
    expiresAt: integer("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("idx_admin_sessions_expiry").on(table.expiresAt)],
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const siteSections = sqliteTable(
  "site_sections",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    sectionKey: text("section_key").notNull(),
    kind: text("kind").notNull().default("custom"),
    navLabel: text("nav_label").notNull(),
    eyebrow: text("eyebrow").notNull().default(""),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    layout: text("layout").notNull().default("standard"),
    sortOrder: integer("sort_order").notNull().default(0),
    visible: integer("visible", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_site_sections_key").on(table.sectionKey),
    index("idx_site_sections_order_visible").on(table.sortOrder, table.visible),
  ],
);

export const siteLinks = sqliteTable(
  "site_links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    label: text("label").notNull(),
    url: text("url").notNull(),
    location: text("location").notNull().default("footer"),
    sortOrder: integer("sort_order").notNull().default(0),
    visible: integer("visible", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("idx_site_links_location_order").on(table.location, table.sortOrder)],
);
