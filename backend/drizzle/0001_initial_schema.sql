CREATE SCHEMA "libreria";
--> statement-breakpoint
CREATE TYPE "libreria"."image_status" AS ENUM('PENDING', 'PROCESSED', 'FAILED');--> statement-breakpoint
CREATE TYPE "libreria"."user_role" AS ENUM('ADMIN', 'SELLER');--> statement-breakpoint
CREATE SEQUENCE "libreria"."product_sku_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "libreria"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" extensions.citext NOT NULL,
	"name" varchar(120) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "libreria"."user_role" DEFAULT 'SELLER' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"temporary_password_hash" varchar(255),
	"temporary_password_expires_at" timestamp with time zone,
	"password_changed_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_by" uuid,
	"updated_by" uuid,
	"deleted_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "chk_users_email_format" CHECK (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
	CONSTRAINT "chk_users_name_not_blank" CHECK (btrim(name) <> ''),
	CONSTRAINT "chk_users_deleted_by_requires_deleted_at" CHECK (deleted_by IS NULL OR deleted_at IS NOT NULL),
	CONSTRAINT "chk_users_temporary_password_pair" CHECK ((temporary_password_hash IS NULL) = (temporary_password_expires_at IS NULL))
);
--> statement-breakpoint
CREATE TABLE "libreria"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"refresh_token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"user_agent" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_sessions_refresh_token_hash" UNIQUE("refresh_token_hash"),
	CONSTRAINT "chk_sessions_expires_after_created" CHECK (expires_at > created_at)
);
--> statement-breakpoint
CREATE TABLE "libreria"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_categories_slug" UNIQUE("slug"),
	CONSTRAINT "chk_categories_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "chk_categories_not_own_parent" CHECK (parent_id IS NULL OR parent_id <> id)
);
--> statement-breakpoint
CREATE TABLE "libreria"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sku" varchar(64) NOT NULL,
	"title" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"sale_price" numeric(12, 2),
	"is_on_sale" boolean DEFAULT false NOT NULL,
	"sale_ends_at" timestamp with time zone,
	"stock" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"new_until" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "uq_products_sku" UNIQUE("sku"),
	CONSTRAINT "uq_products_slug" UNIQUE("slug"),
	CONSTRAINT "chk_products_sku_format" CHECK (sku ~ '^LMS-[0-9]{6,}$'),
	CONSTRAINT "chk_products_slug_format" CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
	CONSTRAINT "chk_products_title_not_blank" CHECK (btrim(title) <> ''),
	CONSTRAINT "chk_products_price_positive" CHECK (price > 0),
	CONSTRAINT "chk_products_sale_price_range" CHECK (sale_price IS NULL OR (sale_price > 0 AND sale_price < price)),
	CONSTRAINT "chk_products_on_sale_requires_sale_price" CHECK (NOT is_on_sale OR sale_price IS NOT NULL),
	CONSTRAINT "chk_products_stock_non_negative" CHECK (stock >= 0)
);
--> statement-breakpoint
CREATE TABLE "libreria"."product_categories" (
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	CONSTRAINT "pk_product_categories" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "libreria"."related_products" (
	"product_id" uuid NOT NULL,
	"related_product_id" uuid NOT NULL,
	"sort_order" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "pk_related_products" PRIMARY KEY("product_id","related_product_id"),
	CONSTRAINT "chk_related_products_not_self" CHECK (product_id <> related_product_id)
);
--> statement-breakpoint
CREATE TABLE "libreria"."product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"original_key" varchar(500) NOT NULL,
	"public_key" varchar(500),
	"alt_text" varchar(255),
	"mime_type" varchar(50) NOT NULL,
	"width" integer,
	"height" integer,
	"size_bytes" integer,
	"status" "libreria"."image_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_product_images_original_key" UNIQUE("original_key"),
	CONSTRAINT "uq_product_images_public_key" UNIQUE("public_key"),
	CONSTRAINT "chk_product_images_position_range" CHECK (position BETWEEN 1 AND 5),
	CONSTRAINT "chk_product_images_mime_type" CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "chk_product_images_dimensions" CHECK ((width IS NULL OR width > 0) AND (height IS NULL OR height > 0)),
	CONSTRAINT "chk_product_images_size" CHECK (size_bytes IS NULL OR size_bytes > 0),
	CONSTRAINT "chk_product_images_processed_has_public_key" CHECK (status <> 'PROCESSED' OR public_key IS NOT NULL)
);
--> statement-breakpoint
ALTER TABLE "libreria"."users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "libreria"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libreria"."users" ADD CONSTRAINT "users_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "libreria"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libreria"."users" ADD CONSTRAINT "users_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "libreria"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libreria"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "libreria"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libreria"."categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "libreria"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libreria"."products" ADD CONSTRAINT "products_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "libreria"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libreria"."products" ADD CONSTRAINT "products_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "libreria"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libreria"."product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "libreria"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libreria"."product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "libreria"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libreria"."related_products" ADD CONSTRAINT "related_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "libreria"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libreria"."related_products" ADD CONSTRAINT "related_products_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "libreria"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "libreria"."product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "libreria"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_users_email_not_deleted" ON "libreria"."users" USING btree (email) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_users_role_active" ON "libreria"."users" USING btree (role) WHERE is_active AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_sessions_user_active" ON "libreria"."sessions" USING btree (user_id) WHERE revoked_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_categories_name_not_deleted" ON "libreria"."categories" USING btree (lower(name)) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_categories_parent_id" ON "libreria"."categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_categories_visible" ON "libreria"."categories" USING btree ("sort_order") WHERE is_active AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_products_visible" ON "libreria"."products" USING btree (sort_order,created_at DESC) WHERE is_active AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_products_featured" ON "libreria"."products" USING btree (sort_order,created_at DESC) WHERE is_featured AND is_active AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_products_new" ON "libreria"."products" USING btree (sort_order,created_at DESC) WHERE is_new AND is_active AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_products_on_sale" ON "libreria"."products" USING btree (sort_order) WHERE is_on_sale AND is_active AND deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_products_created_by" ON "libreria"."products" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_products_updated_by" ON "libreria"."products" USING btree ("updated_by");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_product_categories_primary" ON "libreria"."product_categories" USING btree ("product_id") WHERE is_primary;--> statement-breakpoint
CREATE INDEX "idx_product_categories_category_id" ON "libreria"."product_categories" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_related_products_related_product_id" ON "libreria"."related_products" USING btree ("related_product_id");