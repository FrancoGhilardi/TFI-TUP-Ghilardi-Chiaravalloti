-- The application sets password_changed_at with its own clock, the same one that stamps the
-- access tokens, so a token issued right after a password change is never older than it.
-- The trigger now only fills it in for changes made outside the application, when the
-- password hash changes and the date does not.
DROP TRIGGER IF EXISTS trg_users_password_changed_at ON libreria.users;
--> statement-breakpoint
CREATE TRIGGER trg_users_password_changed_at
  BEFORE UPDATE OF password_hash ON libreria.users
  FOR EACH ROW
  WHEN (
    OLD.password_hash IS DISTINCT FROM NEW.password_hash
    AND OLD.password_changed_at IS NOT DISTINCT FROM NEW.password_changed_at
  )
  EXECUTE FUNCTION libreria.set_password_changed_at();
