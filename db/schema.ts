import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  userId: text("user_id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  plan: text("plan", { enum: ["free", "pro"] }).notNull().default("free"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const orders = sqliteTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: text("created_at").notNull(),
    amount: real("amount").notNull(),
    distance: real("distance").notNull(),
    minutes: real("minutes").notNull(),
    extraWait: real("extra_wait").notNull().default(0),
    returnRisk: integer("return_risk", { mode: "boolean" }).notNull().default(false),
    signal: text("signal", { enum: ["green", "yellow", "red"] }).notNull(),
    fullHourly: real("full_hourly").notNull(),
    perKm: real("per_km").notNull(),
  },
  (table) => [index("idx_orders_user_created").on(table.userId, table.createdAt)],
);

export const feedback = sqliteTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    userId: text("user_id"),
    email: text("email"),
    category: text("category", {
      enum: ["feature", "problem", "pro_interest"],
    }).notNull(),
    message: text("message").notNull(),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [index("idx_feedback_created").on(table.createdAt)],
);

export const marketContributions = sqliteTable(
  "market_contributions",
  {
    receiptId: text("receipt_id").primaryKey(),
    consentVersion: text("consent_version").notNull(),
    observedHour: text("observed_hour").notNull(),
    amountBand: integer("amount_band").notNull(),
    distanceBand: real("distance_band").notNull(),
    durationBand: integer("duration_band").notNull(),
    waitBand: integer("wait_band").notNull(),
    signal: text("signal", { enum: ["green", "yellow", "red"] }).notNull(),
    areaLat: real("area_lat"),
    areaLng: real("area_lng"),
    submittedAt: text("submitted_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [
    index("idx_market_area_hour").on(table.areaLat, table.areaLng, table.observedHour),
    index("idx_market_expires").on(table.expiresAt),
  ],
);
