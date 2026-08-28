-- The original generic trigger writes NEW.updated_at. The users table uses the
-- quoted camel-case column "updatedAt", so any Google account-link/sign-in
-- update failed before the session cookie could be created.
DROP TRIGGER IF EXISTS trg_users_updated_at ON "users";

CREATE OR REPLACE FUNCTION nightfall_set_users_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION nightfall_set_users_updated_at();
