-- Create clients table with all required fields
CREATE TABLE IF NOT EXISTS public.clients (
    customer_id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_name TEXT,
    customer_tax_id TEXT,
    email TEXT,
    contact TEXT,
    billing_address TEXT,
    telephone TEXT,
    status TEXT DEFAULT 'active',
    client_type TEXT DEFAULT 'business',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create invoices table with correct foreign key
CREATE TABLE IF NOT EXISTS public.invoices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    issue_date TIMESTAMP WITH TIME ZONE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    client_id UUID REFERENCES public.clients(customer_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    subtotal DECIMAL(10,2) NOT NULL,
    vat_amount DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'MZN',
    payment_terms TEXT,
    notes TEXT,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create invoice_items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    invoice_id BIGINT REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    vat_amount NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create storage bucket for invoice PDFs
INSERT INTO storage.buckets (id, name) 
VALUES ('invoice_pdfs', 'invoice_pdfs');

-- Set up storage policies
CREATE POLICY "Invoice PDFs are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'invoice_pdfs');

CREATE POLICY "Users can upload invoice PDFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'invoice_pdfs');

-- Add support for 'cash' accounts and a balance field
ALTER TABLE public.bank_accounts
    ADD COLUMN IF NOT EXISTS balance numeric(18,2) DEFAULT 0;

ALTER TABLE public.bank_accounts
    DROP CONSTRAINT IF EXISTS bank_accounts_account_type_check;
ALTER TABLE public.bank_accounts
    ADD CONSTRAINT bank_accounts_account_type_check CHECK (
        account_type = ANY (ARRAY['bank', 'wallet', 'cash'])
    );
