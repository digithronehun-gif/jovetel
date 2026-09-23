import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { tsvector } from './types'

// A séma a src/lib/db/migrations/*.sql TÜKRE (az SQL az irányadó); a drift-teszt ellenőrzi az egyezést.

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
const id = () => uuid('id').primaryKey().defaultRandom()

export const networks = pgTable('networks', {
  id: id(),
  code: text('code', {
    enum: ['awin', 'cj', 'dognet', 'admitad', 'tradetracker', 'direct', 'manual'],
  })
    .notNull()
    .unique(),
  name: text('name').notNull(),
  subidParam: text('subid_param'),
  subidMaxLen: integer('subid_max_len'),
  trackingDomains: text('tracking_domains')
    .array()
    .notNull()
    .default(sql`'{}'`),
  notes: text('notes'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const merchants = pgTable('merchants', {
  id: id(),
  networkId: uuid('network_id')
    .notNull()
    .references(() => networks.id),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  domainAllowlist: text('domain_allowlist')
    .array()
    .notNull()
    .default(sql`'{}'`),
  programId: text('program_id'),
  status: text('status', { enum: ['pending', 'active', 'paused', 'rejected'] })
    .notNull()
    .default('pending'),
  shippingFeeHuf: integer('shipping_fee_huf').notNull().default(0),
  freeShippingThresholdHuf: integer('free_shipping_threshold_huf'),
  customsFeeHuf: integer('customs_fee_huf').notNull().default(0),
  deliveryDaysMin: smallint('delivery_days_min'),
  deliveryDaysMax: smallint('delivery_days_max'),
  returnDays: smallint('return_days'),
  qualityScore: numeric('quality_score', { precision: 3, scale: 2, mode: 'number' })
    .notNull()
    .default(0.5),
  isComparisonAllowed: boolean('is_comparison_allowed').notNull().default(false),
  termsReviewedAt: timestamp('terms_reviewed_at', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const feeds = pgTable('feeds', {
  id: id(),
  merchantId: uuid('merchant_id')
    .notNull()
    .references(() => merchants.id, { onDelete: 'cascade' }),
  format: text('format', { enum: ['csv', 'xml', 'json', 'api'] }).notNull(),
  url: text('url'),
  adapter: text('adapter').notNull(),
  config: jsonb('config').$type<Record<string, unknown>>().notNull().default({}),
  scheduleCron: text('schedule_cron'),
  isActive: boolean('is_active').notNull().default(true),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  lastItemCount: integer('last_item_count'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const feedRuns = pgTable('feed_runs', {
  id: id(),
  feedId: uuid('feed_id')
    .notNull()
    .references(() => feeds.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  status: text('status', { enum: ['running', 'success', 'failed', 'blocked'] })
    .notNull()
    .default('running'),
  itemsSeen: integer('items_seen').notNull().default(0),
  itemsValid: integer('items_valid').notNull().default(0),
  itemsChanged: integer('items_changed').notNull().default(0),
  itemsRejected: integer('items_rejected').notNull().default(0),
  errorSample: jsonb('error_sample').$type<unknown[]>().notNull().default([]),
  rawObjectPath: text('raw_object_path'),
  blockedReason: text('blocked_reason'),
  stats: jsonb('stats').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const brands = pgTable('brands', {
  id: id(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const categories = pgTable('categories', {
  id: id(),
  slug: text('slug').notNull(),
  name: text('name').notNull(),
  parentId: uuid('parent_id').references((): AnyPgColumn => categories.id, {
    onDelete: 'restrict',
  }),
  path: text('path').notNull().unique(),
  slotId: text('slot_id'),
  sort: integer('sort').notNull().default(0),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const categoryMappings = pgTable(
  'category_mappings',
  {
    id: id(),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    sourceCategory: text('source_category').notNull(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('category_mappings_merchant_id_source_category_key').on(
      t.merchantId,
      t.sourceCategory,
    ),
  ],
)

export const products = pgTable(
  'products',
  {
    id: id(),
    slug: text('slug').notNull().unique(),
    brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'set null' }),
    categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    brandName: text('brand_name'),
    categoryText: text('category_text'),
    nameNormalized: text('name_normalized').generatedAlwaysAs(sql`public.f_normalize(name)`),
    gtin: text('gtin'),
    sizeValue: numeric('size_value', { precision: 10, scale: 2, mode: 'number' }),
    sizeUnit: text('size_unit', { enum: ['ml', 'g', 'db'] }),
    descriptionClean: text('description_clean'),
    imageUrl: text('image_url'),
    imageSourceMerchantId: uuid('image_source_merchant_id').references(() => merchants.id, {
      onDelete: 'set null',
    }),
    isIndexable: boolean('is_indexable').notNull().default(false),
    searchVector: tsvector('search_vector').generatedAlwaysAs(sql`''::tsvector`),
    /** márka + név ékezetmentesen (trigram-visszaesés, 0009) */
    searchText: text('search_text').generatedAlwaysAs(sql`public.f_normalize(coalesce(brand_name, '') || ' ' || name)`),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('products_gtin_idx').on(t.gtin), index('products_category_idx').on(t.categoryId)],
)

export const sourceItems = pgTable(
  'source_items',
  {
    id: id(),
    feedId: uuid('feed_id')
      .notNull()
      .references(() => feeds.id, { onDelete: 'cascade' }),
    merchantSku: text('merchant_sku').notNull(),
    contentHash: text('content_hash').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('source_items_feed_id_merchant_sku_key').on(t.feedId, t.merchantSku)],
)

export const offers = pgTable(
  'offers',
  {
    id: id(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    sourceItemId: uuid('source_item_id').references(() => sourceItems.id, { onDelete: 'set null' }),
    merchantSku: text('merchant_sku').notNull(),
    url: text('url').notNull(),
    deeplinkTemplate: text('deeplink_template'),
    priceHuf: integer('price_huf').notNull(),
    /** a feed szerinti „régi ár” — a Valódi akció ítélethez SOHA nem használjuk */
    oldPriceHuf: integer('old_price_huf'),
    inStock: boolean('in_stock').notNull().default(true),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    lastPriceChangeAt: timestamp('last_price_change_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    missedRuns: smallint('missed_runs').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('offers_merchant_id_merchant_sku_key').on(t.merchantId, t.merchantSku)],
)

export const priceDaily = pgTable(
  'price_daily',
  {
    offerId: uuid('offer_id')
      .notNull()
      .references(() => offers.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    priceMinHuf: integer('price_min_huf').notNull(),
    priceLastHuf: integer('price_last_huf').notNull(),
    inStockAny: boolean('in_stock_any').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.offerId, t.day] })],
)

export const productTags = pgTable(
  'product_tags',
  {
    id: id(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    tag: text('tag').notNull(),
    source: text('source', { enum: ['rule', 'feed', 'editor', 'ai_extracted'] }).notNull(),
    evidence: text('evidence'),
    approved: boolean('approved').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('product_tags_product_id_tag_key').on(t.productId, t.tag)],
)

export const usageDefaults = pgTable('usage_defaults', {
  id: id(),
  categoryId: uuid('category_id')
    .notNull()
    .unique()
    .references(() => categories.id, { onDelete: 'cascade' }),
  unit: text('unit', { enum: ['ml', 'g', 'db'] }).notNull(),
  dailyAmount: numeric('daily_amount', { precision: 8, scale: 3, mode: 'number' }).notNull(),
  note: text('note'),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const namedays = pgTable(
  'namedays',
  {
    id: id(),
    month: smallint('month').notNull(),
    day: smallint('day').notNull(),
    name: text('name').notNull(),
    nameNormalized: text('name_normalized').generatedAlwaysAs(sql`public.f_normalize(name)`),
    isPrimary: boolean('is_primary').notNull().default(false),
    inCalendar: boolean('in_calendar').notNull().default(false),
    calendarRank: smallint('calendar_rank'),
    source: text('source').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('namedays_name_month_day_key').on(t.name, t.month, t.day)],
)

/**
 * SZÁRMAZTATOTT táblák (0009): a `refresh_catalog_stats()` tölti minden ingest végén, csak eltérésnél ír.
 * Ajánlatonként a teljes ár (PRODUCT_SPEC 7.4) és a „Valódi akció?” ítélet (7.3) a saját ártörténetből.
 */
export const offerStats = pgTable(
  'offer_stats',
  {
    offerId: uuid('offer_id')
      .primaryKey()
      .references(() => offers.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    merchantId: uuid('merchant_id')
      .notNull()
      .references(() => merchants.id, { onDelete: 'cascade' }),
    feedId: uuid('feed_id').references(() => feeds.id, { onDelete: 'set null' }),
    seenAt: timestamp('seen_at', { withTimezone: true }).notNull(),
    missedRuns: smallint('missed_runs').notNull(),
    priceHuf: integer('price_huf').notNull(),
    shippingHuf: integer('shipping_huf').notNull(),
    customsHuf: integer('customs_huf').notNull(),
    totalHuf: integer('total_huf').notNull(),
    inStock: boolean('in_stock').notNull(),
    daysTracked: smallint('days_tracked').notNull(),
    min30Huf: integer('min30_huf'),
    med30Twice: integer('med30_twice'),
    verdict: text('verdict', { enum: ['deal', 'usual', 'pricier', 'collecting'] }).notNull(),
    feedDiscountNote: boolean('feed_discount_note').notNull(),
    realDiscountPct: smallint('real_discount_pct'),
    updatedAt: updatedAt(),
  },
  (t) => [index('offer_stats_product_idx').on(t.productId), index('offer_stats_merchant_idx').on(t.merchantId, t.productId)],
)

/** Termékenként a legjobb friss, listázható ajánlat és a szűrőkhöz kellő mezők (0009). */
export const productStats = pgTable('product_stats', {
  productId: uuid('product_id')
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
  categoryPath: text('category_path'),
  brandId: uuid('brand_id').references(() => brands.id, { onDelete: 'set null' }),
  offerCount: smallint('offer_count').notNull().default(0),
  merchantIds: uuid('merchant_ids')
    .array()
    .notNull()
    .default(sql`'{}'`),
  bestOfferId: uuid('best_offer_id').references(() => offers.id, { onDelete: 'set null' }),
  bestMerchantId: uuid('best_merchant_id').references(() => merchants.id, { onDelete: 'set null' }),
  bestFeedId: uuid('best_feed_id').references(() => feeds.id, { onDelete: 'set null' }),
  bestSeenAt: timestamp('best_seen_at', { withTimezone: true }),
  bestMissedRuns: smallint('best_missed_runs'),
  bestPriceHuf: integer('best_price_huf'),
  bestShippingHuf: integer('best_shipping_huf'),
  bestCustomsHuf: integer('best_customs_huf'),
  bestTotalHuf: integer('best_total_huf'),
  bestInStock: boolean('best_in_stock').notNull().default(false),
  bestQuality: numeric('best_quality', { precision: 3, scale: 2, mode: 'number' }),
  verdict: text('verdict', { enum: ['deal', 'usual', 'pricier', 'collecting'] }),
  realDiscountPct: smallint('real_discount_pct'),
  daysTracked: smallint('days_tracked'),
  tags: text('tags')
    .array()
    .notNull()
    .default(sql`'{}'`),
  updatedAt: updatedAt(),
})
