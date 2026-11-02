ALTER TABLE "libreria"."product_images" ADD COLUMN "pending_since" timestamp with time zone;--> statement-breakpoint
-- The images already waiting count from when they were added.
UPDATE "libreria"."product_images" SET "pending_since" = "created_at" WHERE "status" = 'PENDING';--> statement-breakpoint
-- Fills in the time for a pending row that comes without one, such as one loaded by hand, and
-- clears it in any other state; the application sets it itself from its clock.
CREATE OR REPLACE FUNCTION libreria.set_image_pending_since()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'PENDING' THEN
    NEW.pending_since := NULL;
  ELSIF NEW.pending_since IS NULL THEN
    NEW.pending_since := now();
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
CREATE TRIGGER trg_product_images_pending_since
  BEFORE INSERT OR UPDATE ON libreria.product_images
  FOR EACH ROW EXECUTE FUNCTION libreria.set_image_pending_since();--> statement-breakpoint
CREATE INDEX "idx_product_images_pending_since" ON "libreria"."product_images" USING btree ("pending_since") WHERE status = 'PENDING';--> statement-breakpoint
ALTER TABLE "libreria"."product_images" ADD CONSTRAINT "chk_product_images_pending_since" CHECK ((status = 'PENDING') = (pending_since IS NOT NULL));
