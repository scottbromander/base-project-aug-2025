DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appuser') THEN
    CREATE ROLE appuser WITH LOGIN PASSWORD 'apppass';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'appdb') THEN
    CREATE DATABASE appdb OWNER appuser;
  END IF;
END
$$;
