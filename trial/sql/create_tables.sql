-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    email TEXT,
    role TEXT DEFAULT 'user',
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    organization JSONB DEFAULT '{}',
    invoice JSONB DEFAULT '{}',
    subscription JSONB DEFAULT '{}',
    modules JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create account table
CREATE TABLE IF NOT EXISTS public.account (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'active',
    trial_end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create inv_config table
CREATE TABLE IF NOT EXISTS public.inv_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    template TEXT DEFAULT 'standard',
    color_theme TEXT DEFAULT '#3498db',
    payment_terms TEXT DEFAULT 'due_on_receipt',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inv_config ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Settings policies
CREATE POLICY "Users can view their own settings"
    ON public.settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.settings FOR UPDATE
    USING (auth.uid() = user_id);

-- Account policies
CREATE POLICY "Users can view their own account"
    ON public.account FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own account"
    ON public.account FOR UPDATE
    USING (auth.uid() = user_id);

-- Invoice config policies
CREATE POLICY "Users can view their own invoice config"
    ON public.inv_config FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoice config"
    ON public.inv_config FOR UPDATE
    USING (auth.uid() = user_id); 