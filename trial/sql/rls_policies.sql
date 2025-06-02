-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can create their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Invoice policies with proper schema references
CREATE POLICY "Users can view their own invoices"
ON invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own invoices"
ON invoices FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND
    amount >= 0
);

CREATE POLICY "Users can update their own invoices"
ON invoices FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
    auth.uid() = user_id AND 
    amount >= 0
);

CREATE POLICY "Users can delete their own invoices"
ON invoices FOR DELETE
USING (auth.uid() = user_id);

-- Storage policies for PDF files
CREATE POLICY "Users can upload invoice PDFs"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'invoice_pdfs' 
    AND auth.uid()::text = owner
);

CREATE POLICY "Users can view their invoice PDFs"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'invoice_pdfs' 
    AND auth.uid()::text = owner
);

CREATE POLICY "Users can update their invoice PDFs"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'invoice_pdfs' 
    AND auth.uid()::text = owner
);

CREATE POLICY "Users can delete their invoice PDFs"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'invoice_pdfs' 
    AND auth.uid()::text = owner
);

-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice_pdfs', 'invoice_pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to invoices table
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
