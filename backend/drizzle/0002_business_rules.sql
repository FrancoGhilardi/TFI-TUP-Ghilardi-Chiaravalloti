-- unaccent is not IMMUTABLE; this wrapper allows it in indexes
CREATE OR REPLACE FUNCTION libreria.immutable_unaccent(text)
RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;
--> statement-breakpoint
-- Refreshes updated_at on every update
CREATE OR REPLACE FUNCTION libreria.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
-- Rejects changes to an immutable column; the column name arrives as the trigger argument
CREATE OR REPLACE FUNCTION libreria.prevent_immutable_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Column % of % is immutable', TG_ARGV[0], TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON libreria.users
  FOR EACH ROW EXECUTE FUNCTION libreria.set_updated_at();
--> statement-breakpoint
-- Records when the password changed
CREATE OR REPLACE FUNCTION libreria.set_password_changed_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.password_changed_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trg_users_password_changed_at
  BEFORE UPDATE OF password_hash ON libreria.users
  FOR EACH ROW
  WHEN (OLD.password_hash IS DISTINCT FROM NEW.password_hash)
  EXECUTE FUNCTION libreria.set_password_changed_at();
--> statement-breakpoint
-- Prevents deleting, deactivating or demoting the last active ADMIN
CREATE OR REPLACE FUNCTION libreria.prevent_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.role = 'ADMIN' AND OLD.is_active AND OLD.deleted_at IS NULL
     AND (
       TG_OP = 'DELETE'
       OR NEW.role <> 'ADMIN'
       OR NOT NEW.is_active
       OR NEW.deleted_at IS NOT NULL
     )
  THEN
    -- Serializes the check so two admins cannot remove each other concurrently
    PERFORM pg_advisory_xact_lock(hashtext('libreria.users.last_admin'));

    IF NOT EXISTS (
      SELECT 1
      FROM libreria.users
      WHERE id <> OLD.id
        AND role = 'ADMIN'
        AND is_active
        AND deleted_at IS NULL
    ) THEN
      RAISE EXCEPTION 'The last active administrator cannot be removed'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trg_users_prevent_last_admin_removal
  BEFORE UPDATE OR DELETE ON libreria.users
  FOR EACH ROW EXECUTE FUNCTION libreria.prevent_last_admin_removal();
--> statement-breakpoint
-- Revokes sessions when the user is deactivated, deleted, or changes role or password
CREATE OR REPLACE FUNCTION libreria.revoke_user_sessions()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE libreria.sessions
     SET revoked_at = now()
   WHERE user_id = NEW.id
     AND revoked_at IS NULL;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trg_users_revoke_sessions
  AFTER UPDATE OF role, is_active, deleted_at, password_hash ON libreria.users
  FOR EACH ROW
  WHEN (
    OLD.role          IS DISTINCT FROM NEW.role
    OR OLD.is_active  IS DISTINCT FROM NEW.is_active
    OR OLD.deleted_at IS DISTINCT FROM NEW.deleted_at
    OR OLD.password_hash IS DISTINCT FROM NEW.password_hash
  )
  EXECUTE FUNCTION libreria.revoke_user_sessions();
--> statement-breakpoint
CREATE TRIGGER trg_categories_set_updated_at
  BEFORE UPDATE ON libreria.categories
  FOR EACH ROW EXECUTE FUNCTION libreria.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_categories_prevent_slug_update
  BEFORE UPDATE OF slug ON libreria.categories
  FOR EACH ROW
  WHEN (OLD.slug IS DISTINCT FROM NEW.slug)
  EXECUTE FUNCTION libreria.prevent_immutable_update('slug');
--> statement-breakpoint
-- System-generated SKU: LMS- followed by at least 6 digits (LMS-000001, ..., LMS-1000000)
CREATE OR REPLACE FUNCTION libreria.next_product_sku()
RETURNS varchar
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'LMS-' || lpad(n::text, greatest(6, length(n::text)), '0')
  FROM (SELECT nextval('libreria.product_sku_seq') AS n) AS seq
$$;
--> statement-breakpoint
ALTER TABLE libreria.products
  ALTER COLUMN sku SET DEFAULT libreria.next_product_sku();
--> statement-breakpoint
-- Title search tolerant to accents and typos
-- Usage: WHERE libreria.immutable_unaccent(title) ILIKE libreria.immutable_unaccent('%text%')
CREATE INDEX idx_products_title_trgm
  ON libreria.products
  USING gin (libreria.immutable_unaccent(title) extensions.gin_trgm_ops);
--> statement-breakpoint
CREATE TRIGGER trg_products_set_updated_at
  BEFORE UPDATE ON libreria.products
  FOR EACH ROW EXECUTE FUNCTION libreria.set_updated_at();
--> statement-breakpoint
CREATE TRIGGER trg_products_prevent_slug_update
  BEFORE UPDATE OF slug ON libreria.products
  FOR EACH ROW
  WHEN (OLD.slug IS DISTINCT FROM NEW.slug)
  EXECUTE FUNCTION libreria.prevent_immutable_update('slug');
--> statement-breakpoint
CREATE TRIGGER trg_products_prevent_sku_update
  BEFORE UPDATE OF sku ON libreria.products
  FOR EACH ROW
  WHEN (OLD.sku IS DISTINCT FROM NEW.sku)
  EXECUTE FUNCTION libreria.prevent_immutable_update('sku');
--> statement-breakpoint
-- Every product must have at least one category (checked at COMMIT)
CREATE OR REPLACE FUNCTION libreria.check_product_has_category()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    v_product_id := NEW.id;
  ELSE
    v_product_id := OLD.product_id;
  END IF;

  -- Nothing to validate if the product was deleted in the same transaction
  IF NOT EXISTS (SELECT 1 FROM libreria.products WHERE id = v_product_id) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM libreria.product_categories WHERE product_id = v_product_id
  ) THEN
    RAISE EXCEPTION 'Product % must have at least one category', v_product_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trg_products_require_category
  AFTER INSERT ON libreria.products
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION libreria.check_product_has_category();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trg_product_categories_require_category
  AFTER UPDATE OR DELETE ON libreria.product_categories
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION libreria.check_product_has_category();
--> statement-breakpoint
-- Deferrable so images can be reordered inside a transaction:
-- SET CONSTRAINTS libreria.uq_product_images_position DEFERRED
ALTER TABLE libreria.product_images
  ADD CONSTRAINT uq_product_images_position UNIQUE (product_id, position)
  DEFERRABLE INITIALLY IMMEDIATE;
--> statement-breakpoint
-- Every product must have at least one image (checked at COMMIT)
CREATE OR REPLACE FUNCTION libreria.check_product_has_image()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_product_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'products' THEN
    v_product_id := NEW.id;
  ELSE
    v_product_id := OLD.product_id;
  END IF;

  -- Nothing to validate if the product was deleted in the same transaction
  IF NOT EXISTS (SELECT 1 FROM libreria.products WHERE id = v_product_id) THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM libreria.product_images WHERE product_id = v_product_id
  ) THEN
    RAISE EXCEPTION 'Product % must have at least one image', v_product_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trg_products_require_image
  AFTER INSERT ON libreria.products
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION libreria.check_product_has_image();
--> statement-breakpoint
CREATE CONSTRAINT TRIGGER trg_product_images_require_image
  AFTER UPDATE OR DELETE ON libreria.product_images
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION libreria.check_product_has_image();
