import { blob, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const tournament = sqliteTable('tournament', {id: integer('id').primaryKey(), revision: integer('revision').notNull(), owner: text('owner').notNull(), state: text('state').notNull(),lastMutation:text('last_mutation').notNull().default('')});

export const loginAttempts=sqliteTable('tournament_login_attempts',{id:text('id').primaryKey(),startedAt:integer('started_at').notNull(),attempts:integer('attempts').notNull()});

export const tournamentHistory=sqliteTable('tournament_history',{id:text('id').primaryKey(),owner:text('owner').notNull(),sourceRevision:integer('source_revision').notNull(),createdAt:text('created_at').notNull(),state:text('state').notNull(),eventId:text('event_id')});

export const refereeCredentials=sqliteTable('tournament_referee_credentials',{id:integer('id').primaryKey(),passwordHash:text('password_hash').notNull(),version:text('version').notNull()});

export const tournamentEvent=sqliteTable('tournament_event',{id:integer('id').primaryKey(),eventId:text('event_id').notNull()});
export const eventRegistrations=sqliteTable('event_registrations',{id:text('id').primaryKey(),eventId:text('event_id').notNull(),teamName:text('team_name').notNull(),teamKey:text('team_key').notNull(),email:text('email').notNull(),phone:text('phone').notNull(),parishName:text('parish_name').notNull().default(''),bringsSupporters:integer('brings_supporters').notNull().default(0),playerCount:integer('player_count').notNull().default(8),rulesAccepted:integer('rules_accepted').notNull().default(0),fileName:text('file_name').notNull(),fileType:text('file_type').notNull(),fileData:blob('file_data',{mode:'buffer'}).notNull(),fileSize:integer('file_size').notNull(),tokenHash:text('token_hash').notNull(),status:text('status').notNull(),createdAt:text('created_at').notNull(),teamId:text('team_id'),withdrawnAt:text('withdrawn_at'),fileChunkCount:integer('file_chunk_count').notNull().default(0),mailStatus:text('mail_status').notNull().default('pending'),mailSentAt:text('mail_sent_at'),mailLock:text('mail_lock'),mailLockAt:integer('mail_lock_at')});

export const eventPledges=sqliteTable('event_pledges',{eventId:text('event_id').notNull(),itemId:text('item_id').notNull(),ownerId:text('owner_id').notNull(),teamName:text('team_name').notNull(),quantity:integer('quantity').notNull(),delivered:integer('delivered').notNull()},table=>[primaryKey({columns:[table.eventId,table.itemId,table.ownerId]})]);
export const eventRequestLimits=sqliteTable('event_request_limits',{id:text('id').primaryKey(),startedAt:integer('started_at').notNull(),attempts:integer('attempts').notNull()});

export const eventRosterChunks=sqliteTable('event_roster_chunks',{registrationId:text('registration_id').notNull(),chunkIndex:integer('chunk_index').notNull(),data:blob('data',{mode:'buffer'}).notNull()},table=>[primaryKey({columns:[table.registrationId,table.chunkIndex]})]);
