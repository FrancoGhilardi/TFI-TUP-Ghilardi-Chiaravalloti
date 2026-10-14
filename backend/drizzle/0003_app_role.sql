DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'libreria_app') THEN
    CREATE ROLE libreria_app NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA libreria TO libreria_app;
--> statement-breakpoint
GRANT USAGE ON SCHEMA extensions TO libreria_app;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA libreria TO libreria_app;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA libreria TO libreria_app;
--> statement-breakpoint
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA libreria TO libreria_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA libreria
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO libreria_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA libreria
  GRANT USAGE, SELECT ON SEQUENCES TO libreria_app;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA libreria
  GRANT EXECUTE ON FUNCTIONS TO libreria_app;
--> statement-breakpoint
REVOKE ALL ON SCHEMA libreria FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA libreria FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA libreria FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA libreria FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
ALTER ROLE libreria_app SET statement_timeout = '15s';
--> statement-breakpoint
ALTER ROLE libreria_app SET idle_in_transaction_session_timeout = '30s';
