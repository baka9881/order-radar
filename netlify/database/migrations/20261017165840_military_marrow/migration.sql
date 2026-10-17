CREATE TABLE "feedback" (
	"id" text PRIMARY KEY,
	"user_id" text,
	"email" text,
	"category" text NOT NULL,
	"message" text NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_contributions" (
	"receipt_id" text PRIMARY KEY,
	"consent_version" text NOT NULL,
	"observed_hour" text NOT NULL,
	"amount_band" integer NOT NULL,
	"distance_band" real NOT NULL,
	"duration_band" integer NOT NULL,
	"wait_band" integer NOT NULL,
	"signal" text NOT NULL,
	"area_lat" real,
	"area_lng" real,
	"submitted_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"expires_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY,
	"user_id" text NOT NULL,
	"created_at" text NOT NULL,
	"amount" real NOT NULL,
	"distance" real NOT NULL,
	"minutes" real NOT NULL,
	"extra_wait" real DEFAULT 0 NOT NULL,
	"return_risk" boolean DEFAULT false NOT NULL,
	"return_mode" text DEFAULT 'local' NOT NULL,
	"signal" text NOT NULL,
	"full_hourly" real NOT NULL,
	"per_km" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"created_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_feedback_created" ON "feedback" ("created_at");--> statement-breakpoint
CREATE INDEX "idx_market_area_hour" ON "market_contributions" ("area_lat","area_lng","observed_hour");--> statement-breakpoint
CREATE INDEX "idx_market_expires" ON "market_contributions" ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_orders_user_created" ON "orders" ("user_id","created_at");