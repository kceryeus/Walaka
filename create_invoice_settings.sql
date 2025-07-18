-- Create invoice_settings table
CREATE TABLE IF NOT EXISTS invoice_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    template TEXT NOT NULL DEFAULT 'classic',
    content JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY "Users can manage their own settings" 
ON invoice_settings 
FOR ALL 
USING (auth.uid() = user_id);

-- Create policy for public read access to active templates
CREATE POLICY "Anyone can read active templates"
ON invoice_settings
FOR SELECT
USING (true);

-- Insert default template content for authenticated users
INSERT INTO invoice_settings (user_id, template, content)
SELECT 
    auth.uid(),
    'classic',
    jsonb_build_object(
        'styles', '
            .invoice-container { padding: 20px; }
            .invoice-header { margin-bottom: 20px; }
            .invoice-details { margin-bottom: 20px; }
            .invoice-items { width: 100%; border-collapse: collapse; }
            .invoice-items th, .invoice-items td { padding: 8px; border: 1px solid #ddd; }
            .invoice-total { margin-top: 20px; text-align: right; }
        ',
        'layout', '
            <div class="invoice-container">
                <div class="invoice-header">
                    <h1>Invoice {{invoiceNumber}}</h1>
                    <p>Date: {{issueDate}}</p>
                    <p>Due Date: {{dueDate}}</p>
                </div>
                <div class="invoice-details">
                    <h2>Bill To:</h2>
                    <p>{{clientName}}</p>
                    <p>{{clientEmail}}</p>
                    <p>{{clientAddress}}</p>
                </div>
                <table class="invoice-items">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>VAT</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{items}}
                    </tbody>
                </table>
                <div class="invoice-total">
                    <p>Subtotal: {{subtotal}}</p>
                    <p>VAT: {{totalVat}}</p>
                    <p><strong>Total: {{total}}</strong></p>
                </div>
                <div class="invoice-notes">
                    <h3>Notes:</h3>
                    <p>{{notes}}</p>
                </div>
            </div>
        '
    )
WHERE NOT EXISTS (
    SELECT 1 FROM invoice_settings 
    WHERE user_id = auth.uid()
);
