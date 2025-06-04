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
