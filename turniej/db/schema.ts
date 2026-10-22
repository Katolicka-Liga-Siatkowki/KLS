import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const tournament = sqliteTable('tournament', {id: integer('id').primaryKey(), revision: integer('revision').notNull(), owner: text('owner').notNull(), state: text('state').notNull()});

export const loginAttempts=sqliteTable('tournament_login_attempts',{id:text('id').primaryKey(),startedAt:integer('started_at').notNull(),attempts:integer('attempts').notNull()});
