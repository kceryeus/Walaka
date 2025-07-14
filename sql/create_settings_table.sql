-- Function to create settings table if it doesn't exist
CREATE OR REPLACE FUNCTION create_settings_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Create settings table if it doesn't exist
    CREATE TABLE IF NOT EXISTS public.settings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        invoice_color TEXT DEFAULT '#007ec7',
        logo_url TEXT,
        language TEXT DEFAULT 'en',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
    );

    -- Create index on user_id
    CREATE INDEX IF NOT EXISTS settings_user_id_idx ON public.settings(user_id);

    -- Add RLS policies
    ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

    -- Policy for users to view their own settings
    CREATE POLICY "Users can view their own settings"
        ON public.settings
        FOR SELECT
        USING (auth.uid() = user_id);

    -- Policy for users to insert their own settings
    CREATE POLICY "Users can insert their own settings"
        ON public.settings
        FOR INSERT
        WITH CHECK (auth.uid() = user_id);

    -- Policy for users to update their own settings
    CREATE POLICY "Users can update their own settings"
        ON public.settings
        FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);

    -- Policy for users to delete their own settings
    CREATE POLICY "Users can delete their own settings"
        ON public.settings
        FOR DELETE
        USING (auth.uid() = user_id);
END;
$$; 