/**
 * LabPath Portable PostgreSQL Schema (Drizzle ORM)
 * ------------------------------------------------
 * 100% compatible with both Neon.tech and Supabase PostgreSQL.
 * Switch between providers anytime by changing DATABASE_URL in .env.
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  numeric,
  integer,
  boolean,
  date,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// 1. Users (Admin/Manager, Field Salesperson, Warehouse/Dispatch)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  phone: varchar('phone', { length: 30 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('SALES'), // 'ADMIN' | 'SALES' | 'WAREHOUSE'
  area: varchar('area', { length: 120 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Customers (Labs, Hospitals & Diagnostic Centers in Sukkur Region)
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  labName: varchar('lab_name', { length: 180 }).notNull(),
  contactPerson: varchar('contact_person', { length: 120 }).notNull(),
  phone: varchar('phone', { length: 30 }).notNull(),
  areaCity: varchar('area_city', { length: 150 }).notNull(),
  creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }).notNull().default('50000.00'),
  currentBalance: numeric('current_balance', { precision: 12, scale: 2 }).notNull().default('0.00'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Products (Biochemistry Reagents, Vacutainer Tubes, Lab Equipment, Chemicals)
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  sku: varchar('sku', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  category: varchar('category', { length: 40 }).notNull(), // 'REAGENT' | 'TUBE' | 'EQUIPMENT' | 'CHEMICAL'
  brand: varchar('brand', { length: 100 }).notNull(),
  unit: varchar('unit', { length: 30 }).notNull(), // 'KIT' | 'BOX' | 'TRAY' | 'VIAL' | 'PACK' | 'UNIT'
  packSizeInfo: varchar('pack_size_info', { length: 100 }).notNull(),
  basePrice: numeric('base_price', { precision: 12, scale: 2 }).notNull(),
  minStockAlert: integer('min_stock_alert').notNull().default(10),
  requiresColdChain: boolean('requires_cold_chain').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 4. Product Batches (FEFO Inventory & Expiry Tracking)
export const productBatches = pgTable('product_batches', {
  id: uuid('id').defaultRandom().primaryKey(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  batchNumber: varchar('batch_number', { length: 80 }).notNull(),
  expiryDate: date('expiry_date').notNull(),
  quantityOnHand: integer('quantity_on_hand').notNull().default(0),
  purchaseCost: numeric('purchase_cost', { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 5. Customer-Specific Agreed Prices (Custom Rate Card per Lab)
export const customerPrices = pgTable(
  'customer_prices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    customPrice: numeric('custom_price', { precision: 12, scale: 2 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    customerProductIdx: uniqueIndex('customer_product_unique_idx').on(
      table.customerId,
      table.productId
    ),
  })
);

// 6. Orders (Field Sales Order -> Admin Approval -> Warehouse FEFO Dispatch)
export const orders = pgTable('orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  salespersonId: uuid('salesperson_id')
    .notNull()
    .references(() => users.id),
  status: varchar('status', { length: 30 }).notNull().default('PENDING_APPROVAL'),
  subtotalAmount: numeric('subtotal_amount', { precision: 12, scale: 2 }).notNull(),
  extraDiscountAmount: numeric('extra_discount_amount', { precision: 12, scale: 2 })
    .notNull()
    .default('0.00'),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  approvalNote: text('approval_note'),
  approvedBy: uuid('approved_by').references(() => users.id),
  clientSyncId: varchar('client_sync_id', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  dispatchedAt: timestamp('dispatched_at', { withTimezone: true }),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
});

// 7. Order Line Items (with Batch # allocated during FEFO packing)
export const orderItems = pgTable('order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id),
  allocatedBatchId: uuid('allocated_batch_id').references(() => productBatches.id),
  quantity: integer('quantity').notNull(),
  standardPrice: numeric('standard_price', { precision: 12, scale: 2 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  lineTotal: numeric('line_total', { precision: 12, scale: 2 }).notNull(),
});

// 8. Khata / Ledger Entries (Invoices, Cash/Bank/Cheque Recoveries & Returns)
export const ledgerEntries = pgTable('ledger_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull(), // 'INVOICE_DEBIT' | 'PAYMENT_CREDIT' | 'RETURN_CREDIT' | 'OPENING_BALANCE'
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  runningBalance: numeric('running_balance', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 30 }), // 'CASH' | 'BANK_TRANSFER' | 'CHEQUE'
  referenceNo: varchar('reference_no', { length: 100 }),
  note: text('note'),
  status: varchar('status', { length: 30 }).notNull().default('VERIFIED'), // 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED'
  recordedById: uuid('recorded_by_id')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
