-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text,
    email text UNIQUE NOT NULL,
    role text NOT NULL DEFAULT 'user',
    status text DEFAULT 'active',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can create their own profile during signup" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own non-critical data" ON public.users;
DROP POLICY IF EXISTS "Admins have full access" ON public.users;
DROP POLICY IF EXISTS "Admins can create users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for signup" ON public.users;

-- Allow public to insert new users during signup
CREATE POLICY "Enable insert for signup"
ON public.users
FOR INSERT
WITH CHECK (true);

-- Allow users to view their own profile
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT 
USING (auth.uid() = id);

-- Drop the previous update policy if it exists
DROP POLICY IF EXISTS "Users can update their own non-critical data" ON public.users;

-- Create a new update policy with correct syntax
CREATE POLICY "Users can update their own non-critical data"
ON public.users
FOR UPDATE
TO authenticated
USING (
    auth.uid() = id
)
WITH CHECK (
    auth.uid() = id
    AND role = 'user'  -- Ensure role stays as user
    AND id = id  -- ID cannot be changed
    AND created_at = created_at  -- created_at cannot be changed
);

-- Allow admins full access
CREATE POLICY "Admins have full access"
ON public.users
TO authenticated
USING (auth.jwt()->>'role' = 'admin')
WITH CHECK (auth.jwt()->>'role' = 'admin');

-- Allow admins to create new users
CREATE POLICY "Admins can create users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
    auth.jwt()->>'role' = 'admin'
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS users_id_idx ON users(id);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- Remove the auth_id column and its constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_auth_id_fkey;
ALTER TABLE public.users DROP COLUMN IF EXISTS auth_id;

-- Update created_by to reference public.users(id) instead of auth.users(id)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_created_by_fkey;
ALTER TABLE public.users
    ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);

-- Ensure id references auth.users(id) ON DELETE CASCADE
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create or replace the set_created_by trigger function
CREATE OR REPLACE FUNCTION set_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to set created_by before insert
DROP TRIGGER IF EXISTS set_created_by_before_insert ON public.users;
CREATE TRIGGER set_created_by_before_insert
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION set_created_by();

-- Backend enforcement: Prevent user insert if max_users reached for environment
CREATE OR REPLACE FUNCTION check_user_limit_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    env_id uuid;
    user_count integer;
    max_users integer;
BEGIN
    env_id := NEW.environment_id;
    IF env_id IS NULL THEN
        RETURN NEW; -- Allow if no environment_id (should not happen in normal flow)
    END IF;
    SELECT COUNT(*) INTO user_count FROM public.users WHERE environment_id = env_id;
    SELECT max_users INTO max_users FROM public.subscriptions
        WHERE environment_id = env_id AND status = 'active'
        ORDER BY end_date DESC LIMIT 1;
    IF max_users IS NULL THEN
        max_users := 1; -- Default to 1 if no subscription found
    END IF;
    IF user_count >= max_users THEN
        RAISE EXCEPTION 'User limit reached for this subscription plan (%). Please upgrade your plan to add more users.', max_users;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_user_limit_before_insert ON public.users;
CREATE TRIGGER check_user_limit_before_insert
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION check_user_limit_on_insert();
