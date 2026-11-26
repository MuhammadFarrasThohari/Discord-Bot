#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1edd03138fc959ac175059bbe19275f2ba382267d67f04913080f76932546fc8/contract';
import endContract from '../../snapshots/1edd03138fc959ac175059bbe19275f2ba382267d67f04913080f76932546fc8/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  col,
  fn,
  lit,
  primaryKey,
  sql,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Artwork',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('favoriteCount', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('fileExt', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('fileSize', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('fileUrl', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isDeleted', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('isPending', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('previewUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('rating', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sampleUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('score', 'int4', {
            notNull: true,
            default: lit(0),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('source', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sourceCreatedAt', 'timestamptz(3)', {
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('sourceId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tagString', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('title', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Character',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('danbooruTag', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'CharacterSchedule',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('dayOfWeek', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userCharacterId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'DeliveryHistory',
        columns: [
          col('artworkId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('channelId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('characterId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('deliveredAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('messageId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'DiscordUser',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('discordId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'GuildConfig',
        columns: [
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('deliveryChannelId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('guildId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'UserCharacter',
        columns: [
          col('characterId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('updatedAt', 'timestamptz(3)', {
            notNull: true,
            default: fn(sql`now()`),
            codecRef: { codecId: 'pg/timestamptz-date@1', typeParams: { precision: 3 } },
          }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Artwork',
        constraint: 'Artwork_source_sourceId_key',
        columns: ['source', 'sourceId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Character',
        constraint: 'Character_danbooruTag_key',
        columns: ['danbooruTag'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'CharacterSchedule',
        constraint: 'CharacterSchedule_userCharacterId_dayOfWeek_key',
        columns: ['userCharacterId', 'dayOfWeek'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'DeliveryHistory',
        constraint: 'DeliveryHistory_userId_artworkId_key',
        columns: ['userId', 'artworkId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'DiscordUser',
        constraint: 'DiscordUser_discordId_key',
        columns: ['discordId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'GuildConfig',
        constraint: 'GuildConfig_guildId_key',
        columns: ['guildId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'UserCharacter',
        constraint: 'UserCharacter_userId_characterId_key',
        columns: ['userId', 'characterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Artwork',
        index: 'Artwork_rating_idx_fcb0b199',
        columns: ['rating'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Artwork',
        index: 'Artwork_score_idx_341b473a',
        columns: ['score'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CharacterSchedule',
        index: 'CharacterSchedule_dayOfWeek_isActive_idx_7bcf8980',
        columns: ['dayOfWeek', 'isActive'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'CharacterSchedule',
        index: 'CharacterSchedule_userCharacterId_idx_aff81178',
        columns: ['userCharacterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DeliveryHistory',
        index: 'DeliveryHistory_artworkId_idx_d1231e6d',
        columns: ['artworkId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DeliveryHistory',
        index: 'DeliveryHistory_characterId_idx_2423fe9d',
        columns: ['characterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DeliveryHistory',
        index: 'DeliveryHistory_userId_characterId_deliveredAt_idx_c8112095',
        columns: ['userId', 'characterId', 'deliveredAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DeliveryHistory',
        index: 'DeliveryHistory_userId_deliveredAt_idx_c60c106a',
        columns: ['userId', 'deliveredAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DeliveryHistory',
        index: 'DeliveryHistory_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserCharacter',
        index: 'UserCharacter_characterId_idx_2423fe9d',
        columns: ['characterId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserCharacter',
        index: 'UserCharacter_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'UserCharacter',
        index: 'UserCharacter_userId_isActive_idx_c5d1c334',
        columns: ['userId', 'isActive'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'CharacterSchedule',
        foreignKey: {
          name: 'CharacterSchedule_userCharacterId_fkey',
          columns: ['userCharacterId'],
          references: { schema: 'public', table: 'UserCharacter', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DeliveryHistory',
        foreignKey: {
          name: 'DeliveryHistory_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'DiscordUser', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DeliveryHistory',
        foreignKey: {
          name: 'DeliveryHistory_characterId_fkey',
          columns: ['characterId'],
          references: { schema: 'public', table: 'Character', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DeliveryHistory',
        foreignKey: {
          name: 'DeliveryHistory_artworkId_fkey',
          columns: ['artworkId'],
          references: { schema: 'public', table: 'Artwork', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserCharacter',
        foreignKey: {
          name: 'UserCharacter_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'DiscordUser', columns: ['id'] },
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserCharacter',
        foreignKey: {
          name: 'UserCharacter_characterId_fkey',
          columns: ['characterId'],
          references: { schema: 'public', table: 'Character', columns: ['id'] },
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
