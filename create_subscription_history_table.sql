-- Create a robust subscription_history table for tracking all subscription events
CREATE TABLE IF NOT EXISTS public.subscription_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    subscription_id uuid NOT NULL,
    plan text NOT NULL,
    status text NOT NULL,
    payment_method text,
    start_date timestamp with time zone NOT NULL,
    end_date timestamp with time zone,
    amount numeric(12,2),
    invoice_number text,
    transaction_reference text,
    created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    notes text,
    CONSTRAINT subscription_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE,
    CONSTRAINT subscription_history_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES subscriptions (id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscription_history_user_id ON public.subscription_history (user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_subscription_id ON public.subscription_history (subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_history_plan ON public.subscription_history (plan);
CREATE INDEX IF NOT EXISTS idx_subscription_history_status ON public.subscription_history (status);
CREATE INDEX IF NOT EXISTS idx_subscription_history_created_at ON public.subscription_history (created_at);

-- Trigger to update updated_at on row modification
CREATE OR REPLACE FUNCTION update_subscription_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscription_history_updated_at ON public.subscription_history;
CREATE TRIGGER update_subscription_history_updated_at
BEFORE UPDATE ON public.subscription_history
FOR EACH ROW
EXECUTE FUNCTION update_subscription_history_updated_at(); 