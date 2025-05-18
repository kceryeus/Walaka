class InvoiceNumberGenerator {
    constructor() {
        this.supabase = window.supabase;
        this.prefix = 'INV';
        this.year = new Date().getFullYear();
        this.lock = false; // Prevent concurrent calls
    }

    async getNextNumber() {
        if (this.lock) {
            throw new Error('Invoice number generation is already in progress');
        }
        this.lock = true;

        try {
            // Get the latest invoice number for the current year
            const { data, error } = await this.supabase
                .from('invoices')
                .select('invoiceNumber')
                .ilike('invoiceNumber', `${this.prefix}-${this.year}-%`)
                .order('invoiceNumber', { ascending: false })
                .limit(1);

            if (error) throw error;

            let sequence = 1;
            if (data && data.length > 0) {
                const lastNumber = data[0].invoiceNumber;
                const matches = lastNumber.match(/-(\d+)$/);
                if (matches) {
                    sequence = parseInt(matches[1], 10) + 1;
                }
            }

            let newInvoiceNumber;
            let isUnique = false;

            // Loop to ensure uniqueness (no recursion)
            while (!isUnique) {
                newInvoiceNumber = `${this.prefix}-${this.year}-${String(sequence).padStart(5, '0')}`;

                const { data: existingInvoice, error: checkError } = await this.supabase
                    .from('invoices')
                    .select('invoiceNumber')
                    .eq('invoiceNumber', newInvoiceNumber)
                    .single();

                if (checkError && checkError.code !== 'PGRST116') throw checkError;

                if (!existingInvoice) {
                    isUnique = true;
                } else {
                    sequence++;
                }
            }

            return newInvoiceNumber;
        } catch (error) {
            console.error('Error generating invoice number:', error);
            throw error;
        } finally {
            this.lock = false; // Always release the lock
        }
    }
}

// Attach to window for global use
if (typeof window !== 'undefined') {
    window.InvoiceNumberGenerator = InvoiceNumberGenerator;
}

