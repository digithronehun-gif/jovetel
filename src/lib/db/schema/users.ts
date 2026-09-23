import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgSchema,
  pgTable,
  smallint,
  text,
  time,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { products } from './catalog'

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
const id = () => uuid('id').primaryKey().defaultRandom()

/** A Supabase Auth saját táblája (csak hivatkozáshoz és a törléshez). */
export const authSchema = pgSchema('auth')
export const authUsers = authSchema.table('users', {
  id: uuid('id').primaryKey(),
  email: text('email'),
})

export const SKIN_TYPES = [
  'normal',
  'szaraz',
  'zsiros',
  'kombinalt',
  'erzekeny',
  'nem_tudom',
] as const
/** Fő bőrgondok (PRODUCT_SPEC 4.2): a profil és a termékek `concern:*` címkéi ugyanezt a szótárat használják. */
export const SKIN_CONCERNS = [
  'pattanasok',
  'pigmentfolt',
  'rancok',
  'tag_porusok',
  'szarazsag',
  'pirossag',
  'fakosag',
] as const
/** Kerülendő összetevők (PRODUCT_SPEC 4.2): a termékek `free_from:*` címkéi. */
export const AVOID_INGREDIENTS = ['illatanyag', 'alkohol', 'paraben', 'szilikon', 'illoolaj'] as const
export const BUDGET_BANDS = ['u5', '5_15', '15_30', 'o30'] as const
export const USE_CASES = ['gifts', 'beauty', 'both'] as const
export const RELATIONS = [
  'anya',
  'apa',
  'par',
  'barat',
  'baratno',
  'testver',
  'gyerek',
  'nagyszulo',
  'kollega',
  'egyeb',
] as const
export const OCCASION_TYPES = [
  'birthday',
  'nameday',
  'christmas',
  'mothers_day',
  'fathers_day',
  'valentines',
  'womens_day',
  'mikulas',
  'anniversary',
  'custom',
] as const
export const CONSENT_TYPES = [
  'service_email',
  'marketing_email',
  'analytics',
  'marketing',
  'terms',
  'privacy',
] as const

export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  displayName: text('display_name'),
  firstName: text('first_name'),
  useCase: text('use_case', { enum: USE_CASES }),
  skinType: text('skin_type', { enum: SKIN_TYPES }),
  skinConcerns: text('skin_concerns')
    .array()
    .notNull()
    .default(sql`'{}'`),
  avoidIngredients: text('avoid_ingredients')
    .array()
    .notNull()
    .default(sql`'{}'`),
  budgetBand: text('budget_band', { enum: BUDGET_BANDS }),
  favoriteMerchantIds: uuid('favorite_merchant_ids')
    .array()
    .notNull()
    .default(sql`'{}'`),
  digestTime: time('digest_time').notNull().default('07:30'),
  onboardingCompletedAt: timestamp('onboarding_completed_at', { withTimezone: true }),
  onboardingStep: smallint('onboarding_step').notNull().default(0),
  role: text('role', { enum: ['user', 'admin'] })
    .notNull()
    .default('user'),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const consents = pgTable('consents', {
  id: id(),
  userId: uuid('user_id'),
  email: text('email'),
  anonId: text('anon_id'),
  type: text('type', { enum: CONSENT_TYPES }).notNull(),
  granted: boolean('granted').notNull(),
  version: text('version').notNull(),
  source: text('source').notNull(),
  createdAt: createdAt(),
})

export const lovedOnes = pgTable('loved_ones', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  nickname: text('nickname').notNull(),
  relation: text('relation', { enum: RELATIONS }).notNull(),
  firstName: text('first_name'),
  namedayMonth: smallint('nameday_month'),
  namedayDay: smallint('nameday_day'),
  birthdayMonth: smallint('birthday_month'),
  birthdayDay: smallint('birthday_day'),
  birthYear: smallint('birth_year'),
  interests: text('interests')
    .array()
    .notNull()
    .default(sql`'{}'`),
  budgetBand: text('budget_band', { enum: BUDGET_BANDS }),
  note: text('note'),
  avoid: text('avoid')
    .array()
    .notNull()
    .default(sql`'{}'`),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const occasions = pgTable('occasions', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  lovedOneId: uuid('loved_one_id').references(() => lovedOnes.id, { onDelete: 'cascade' }),
  type: text('type', { enum: OCCASION_TYPES }).notNull(),
  label: text('label'),
  month: smallint('month'),
  day: smallint('day'),
  remindOffsets: smallint('remind_offsets')
    .array()
    .notNull()
    .default(sql`'{10,3}'`),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const giftHistory = pgTable('gift_history', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  lovedOneId: uuid('loved_one_id')
    .notNull()
    .references(() => lovedOnes.id, { onDelete: 'cascade' }),
  occasionType: text('occasion_type'),
  year: smallint('year'),
  productId: uuid('product_id').references(() => products.id, { onDelete: 'set null' }),
  freeText: text('free_text'),
  source: text('source', { enum: ['manual', 'click_confirm'] }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const lists = pgTable('lists', {
  id: id(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  type: text('type', { enum: ['wishlist', 'gift_ideas', 'editorial', 'creator'] }).notNull(),
  title: text('title').notNull(),
  slug: text('slug'),
  intro: text('intro'),
  coverSlot: text('cover_slot'),
  coverImageUrl: text('cover_image_url'),
  lovedOneId: uuid('loved_one_id').references(() => lovedOnes.id, { onDelete: 'set null' }),
  occasionType: text('occasion_type'),
  occasionDate: date('occasion_date', { mode: 'string' }),
  visibility: text('visibility', { enum: ['private', 'link', 'public'] })
    .notNull()
    .default('private'),
  shareToken: text('share_token').unique(),
  surpriseMode: boolean('surprise_mode').notNull().default(true),
  isIndexable: boolean('is_indexable').notNull().default(false),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const listItems = pgTable(
  'list_items',
  {
    id: id(),
    listId: uuid('list_id')
      .notNull()
      .references(() => lists.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    note: text('note'),
    priority: text('priority', { enum: ['must', 'nice'] })
      .notNull()
      .default('nice'),
    priceAtAddHuf: integer('price_at_add_huf'),
    position: integer('position').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('list_items_list_id_product_id_key').on(t.listId, t.productId)],
)

export const reservations = pgTable('reservations', {
  id: id(),
  listItemId: uuid('list_item_id')
    .notNull()
    .references(() => listItems.id, { onDelete: 'cascade' }),
  reserverUserId: uuid('reserver_user_id')
    .notNull()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  status: text('status', { enum: ['active', 'cancelled', 'purchased'] })
    .notNull()
    .default('active'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const priceAlerts = pgTable(
  'price_alerts',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.userId, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    targetPriceHuf: integer('target_price_huf').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('price_alerts_user_id_product_id_key').on(t.userId, t.productId)],
)

export const shelfItems = pgTable('shelf_items', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  sizeValue: numeric('size_value', { precision: 10, scale: 2, mode: 'number' }),
  sizeUnit: text('size_unit', { enum: ['ml', 'g', 'db'] }),
  openedAt: date('opened_at', { mode: 'string' }).notNull().defaultNow(),
  pace: text('pace', { enum: ['slow', 'normal', 'fast'] })
    .notNull()
    .default('normal'),
  estRunoutDate: date('est_runout_date', { mode: 'string' }),
  status: text('status', { enum: ['active', 'finished', 'archived'] })
    .notNull()
    .default('active'),
  cycle: smallint('cycle').notNull().default(1),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const notifications = pgTable('notifications', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .references(() => profiles.userId, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  dedupeKey: text('dedupe_key').notNull().unique(),
  scheduledFor: date('scheduled_for', { mode: 'string' }).notNull(),
  status: text('status', { enum: ['pending', 'sent', 'skipped', 'failed'] })
    .notNull()
    .default('pending'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  emailId: text('email_id'),
  digestId: uuid('digest_id'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const waitlist = pgTable('waitlist', {
  id: id(),
  email: text('email').notNull().unique(),
  useCase: text('use_case', { enum: USE_CASES }),
  source: jsonb('source').$type<Record<string, string>>().notNull().default({}),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  confirmTokenHash: text('confirm_token_hash'),
  marketingConsent: boolean('marketing_consent').notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})
