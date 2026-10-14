-- citext operators live in the extensions schema; without it in the search path the runtime role
-- compares citext columns as plain text, which is case-sensitive.
ALTER ROLE libreria_app SET search_path = libreria, extensions, public;
