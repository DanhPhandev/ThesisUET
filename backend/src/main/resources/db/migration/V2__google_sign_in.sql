-- A Google account is identified by sub; the verified email remains the user's canonical email.
-- Existing users are retained unchanged. Email is already CITEXT UNIQUE in V1.
ALTER TABLE users ADD COLUMN google_sub VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX ux_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;
