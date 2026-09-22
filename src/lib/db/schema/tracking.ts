import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { merchants, networks, offers } from './catalog'
import { authUsers } from './users'

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
const id = () => uuid('id').primaryKey().defaultRandom()

export const clicks = pgTable('clicks', {
  id: id(),
  clickId: text('click_id').notNull().unique(),
  offerId: uuid('offer_id').references(() => offers.id, { onDelete: 'set null' }),
  merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
  sessionId: text('session_id'),
  placement: text('placement'),
  contentRef: text('content_ref'),
  ipHash: text('ip_hash'),
  uaHash: text('ua_hash'),
  isBot: boolean('is_bot').notNull().default(false),
  createdAt: createdAt(),
})

export const conversions = pgTable(
  'conversions',
  {
    id: id(),
    networkId: uuid('network_id')
      .notNull()
      .references(() => networks.id),
    networkTransactionId: text('network_transaction_id').notNull(),
    clickId: text('click_id'),
    merchantId: uuid('merchant_id').references(() => merchants.id, { onDelete: 'set null' }),
    orderValueHuf: integer('order_value_huf'),
    commissionHuf: integer('commission_huf'),
    status: text('status', { enum: ['pending', 'approved', 'rejected'] }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
    updatedFromNetworkAt: timestamp('updated_from_network_at', { withTimezone: true }),
    raw: jsonb('raw').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('conversions_network_id_network_transaction_id_key').on(
      t.networkId,
      t.networkTransactionId,
    ),
  ],
)

export const events = pgTable('events', {
  id: id(),
  name: text('name').notNull(),
  userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
  props: jsonb('props').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
})

export const aiRequests = pgTable('ai_requests', {
  id: id(),
  kind: text('kind', { enum: ['interpret', 'explain'] }).notNull(),
  userId: uuid('user_id').references(() => authUsers.id, { onDelete: 'set null' }),
  inputHash: text('input_hash').notNull(),
  model: text('model'),
  tokensIn: integer('tokens_in'),
  tokensOut: integer('tokens_out'),
  costHuf: numeric('cost_huf', { precision: 8, scale: 3, mode: 'number' }),
  cacheHit: boolean('cache_hit').notNull().default(false),
  validatorPassed: boolean('validator_passed'),
  latencyMs: integer('latency_ms'),
  output: jsonb('output').$type<Record<string, unknown>>(),
  createdAt: createdAt(),
})

export const aiExplanations = pgTable('ai_explanations', {
  id: id(),
  cacheKey: text('cache_key').notNull().unique(),
  text: text('text').notNull(),
  createdAt: createdAt(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
})

export const auditLog = pgTable('audit_log', {
  id: id(),
  actorUserId: uuid('actor_user_id'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  diff: jsonb('diff').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: createdAt(),
})
