ALTER TABLE "libreria"."sessions" ADD COLUMN "family_id" uuid;--> statement-breakpoint
-- Each existing session starts its own family, as if it came from a login.
UPDATE "libreria"."sessions" SET "family_id" = "id";--> statement-breakpoint
ALTER TABLE "libreria"."sessions" ALTER COLUMN "family_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_sessions_family_active" ON "libreria"."sessions" USING btree (family_id) WHERE revoked_at IS NULL;
