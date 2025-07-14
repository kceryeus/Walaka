-- Drop subscribed_users table if it exists
DROP TABLE IF EXISTS subscribed_users;

-- Alter users table to add subscription fields
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'trial';
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE auth.users ADD CONSTRAINT valid_subscription_type 
    CHECK (subscription_type IN ('trial', 'basic', 'premium', 'enterprise'));

-- Create trial_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS trial_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    trial_start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    invoices_created INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    max_trial_invoices INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    invoice_number TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending',
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('draft', 'pending', 'paid', 'overdue', 'cancelled'))
);

-- Add RLS policies
ALTER TABLE trial_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own trial data" ON trial_users;
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create own invoices" ON invoices;

-- Trial users policies
CREATE POLICY "Users can view own trial data"
    ON trial_users FOR SELECT
    USING (auth.uid() = id);

-- Invoices policies
CREATE POLICY "Users can view own invoices"
    ON invoices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own invoices"
    ON invoices FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Function to check trial status
CREATE OR REPLACE FUNCTION check_trial_status(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM trial_users
        WHERE id = user_id
        AND is_active = true
        AND trial_end_date > CURRENT_TIMESTAMP
        AND invoices_created < max_trial_invoices
    );
END;
$$ LANGUAGE plpgsql;

-- Function to upgrade user from trial to subscription
CREATE OR REPLACE FUNCTION upgrade_trial_user(
    user_id UUID,
    subscription_type TEXT,
    subscription_months INT DEFAULT 12
)
RETURNS BOOLEAN AS $$
DECLARE
    subscription_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Calculate subscription end date
    subscription_end := CURRENT_TIMESTAMP + (subscription_months || ' months')::INTERVAL;

    -- Begin transaction
    BEGIN
        -- Update user's subscription details
        UPDATE auth.users
        SET subscription_start_date = CURRENT_TIMESTAMP,
            subscription_end_date = subscription_end,
            subscription_type = upgrade_trial_user.subscription_type,
            is_active = true
        WHERE id = user_id;

        -- Update trial user status
        UPDATE trial_users
        SET is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = user_id;

        RETURN true;

    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error upgrading user: %', SQLERRM;
        RETURN false;
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to check subscription status
CREATE OR REPLACE FUNCTION check_subscription_status(user_id UUID)
RETURNS TABLE (
    is_active BOOLEAN,
    subscription_type TEXT,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.is_active,
        u.subscription_type,
        EXTRACT(DAY FROM (u.subscription_end_date - CURRENT_TIMESTAMP))::INTEGER as days_remaining
    FROM auth.users u
    WHERE u.id = user_id
    AND u.is_active = true
    AND u.subscription_end_date > CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Example queries have been removed since they require actual UUIDs
-- To use these functions, replace with actual user UUIDs:
-- SELECT upgrade_trial_user(<actual-user-uuid>, 'basic', 12);
-- SELECT * FROM check_subscription_status(<actual-user-uuid>);
