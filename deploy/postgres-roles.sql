-- Run once as the PostgreSQL database owner/admin against tickwise_prod.
-- Passwords are set interactively with the psql \password commands below.
CREATE ROLE tickwise_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE tickwise_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE tickwise_backup LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

\password tickwise_app
\password tickwise_migrator
\password tickwise_backup

GRANT CONNECT ON DATABASE tickwise_prod TO tickwise_app, tickwise_migrator, tickwise_backup;
GRANT USAGE ON SCHEMA public TO tickwise_app, tickwise_migrator, tickwise_backup;
GRANT CREATE ON SCHEMA public TO tickwise_migrator;
REVOKE CREATE ON SCHEMA public FROM tickwise_app, tickwise_backup, PUBLIC;

-- Existing app tables become migration-owned; app receives DML only.
DO $$
DECLARE obj record;
BEGIN
  FOR obj IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO tickwise_migrator', obj.tablename);
  END LOOP;
  FOR obj IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO tickwise_migrator', obj.sequencename);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tickwise_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO tickwise_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO tickwise_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO tickwise_backup;

ALTER DEFAULT PRIVILEGES FOR ROLE tickwise_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO tickwise_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tickwise_migrator IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO tickwise_app;
ALTER DEFAULT PRIVILEGES FOR ROLE tickwise_migrator IN SCHEMA public
  GRANT SELECT ON TABLES TO tickwise_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE tickwise_migrator IN SCHEMA public
  GRANT SELECT ON SEQUENCES TO tickwise_backup;

