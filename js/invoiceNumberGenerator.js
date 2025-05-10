class InvoiceNumberGenerator {
    constructor() {
        this.supabase = window.supabase;
        this.prefix = 'INV';
        this.year = new Date().getFullYear();
    }

    async getNextNumber() {
        try {
            // Get the latest invoice number for the current year
            const { data, error } = await this.supabase
                .from('invoices')
                .select('invoice_number')
                .ilike('invoice_number', `${this.prefix}-${this.year}-%`)
                .order('invoice_number', { ascending: false })
                .limit(1);

            if (error) throw error;

            let sequence = 1;
            if (data && data.length > 0) {
                // Extract the sequence number from the last invoice
                const lastNumber = data[0].invoice_number;
                const matches = lastNumber.match(/\d+$/);
                if (matches) {
                    sequence = parseInt(matches[0]) + 1;
                }
            }

            // Format: INV-YYYY-XXXXX (where XXXXX is padded with zeros)
            const newInvoiceNumber = `${this.prefix}-${this.year}-${String(sequence).padStart(5, '0')}`;

            // Verify uniqueness
            const { data: existingInvoice } = await this.supabase
                .from('invoices')
                .select('invoice_number')
                .eq('invoice_number', newInvoiceNumber)
                .single();

            if (existingInvoice) {
                // If duplicate found, recursively try next number
                return this.getNextNumber();
            }

            return newInvoiceNumber;
        } catch (error) {
            console.error('Error generating invoice number:', error);
            throw error;
        }
    }
}

export default InvoiceNumberGenerator;
