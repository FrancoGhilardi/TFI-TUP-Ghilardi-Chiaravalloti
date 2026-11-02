-- Names the error raised when a change would remove the last active admin, so the application
-- can tell it apart from any other check violation and answer with its own message. The rest
-- of the function is unchanged.
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
        USING ERRCODE = 'check_violation', CONSTRAINT = 'chk_users_last_active_admin';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
