-- Migration script to update users table to new schema
-- This script will:
-- 1. Drop existing constraints and indexes
-- 2. Remove old columns
-- 3. Add new columns
-- 4. Create new indexes

-- Step 1: Drop existing constraints and indexes
DROP INDEX IF EXISTS idx_users_firebase_uid;
DROP INDEX IF EXISTS idx_users_email;

-- Step 2: Remove old columns (firebase_uid, name)
ALTER TABLE users DROP COLUMN IF EXISTS firebase_uid;
ALTER TABLE users DROP COLUMN IF EXISTS name;

-- Step 3: Add new columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS firstname TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS lastname TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Step 4: Create new indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Step 5: Update comments
COMMENT ON TABLE users IS 'User accounts with basic profile information';
COMMENT ON COLUMN users.email IS 'Unique email address for user';
COMMENT ON COLUMN users.role IS 'User role (admin, user, manager)';

-- Note: You may need to update existing data manually if you have users in the database
-- Example update for existing users:
-- UPDATE users SET firstname = 'John', lastname = 'Doe', role = 'user' WHERE firstname = '';
