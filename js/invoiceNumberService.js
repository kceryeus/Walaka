import { createClient } from '@supabase/supabase-js';

class InvoiceNumberService {
    constructor() {
        this.supabase = window.supabase;
    }

    async getNextInvoiceNumber(clientId) {
        try {
            if (!clientId) {
                throw new Error('Client ID is required to generate invoice number');
            }

            const currentYear = new Date().getFullYear();

            // Get the latest invoice number for this client in the current year
            const { data: lastInvoice, error } = await this.supabase
                .from('invoices')
                .select('invoiceNumber')
                .eq('client_id', clientId)
                .ilike('invoiceNumber', `CLI-${clientId}-${currentYear}-%`)
                .order('invoiceNumber', { ascending: false })
                .limit(1)
                .single();

            let nextSequence = 1;
            
            if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
                throw error;
            }

            if (lastInvoice) {
                // Extract sequence number from last invoice
                const matches = lastInvoice.invoiceNumber.match(/\d+$/);
                if (matches) {
                    nextSequence = parseInt(matches[0]) + 1;
                }
            }

            // Format: CLI-{ClientId}-YYYY-XXXX
            const formattedNumber = `CLI-${clientId}-${currentYear}-${String(nextSequence).padStart(4, '0')}`;
            
            // Verify uniqueness
            const { data: existingInvoice, error: checkError } = await this.supabase
                .from('invoices')
                .select('invoiceNumber')
                .eq('invoiceNumber', formattedNumber)
                .single();

            if (checkError && checkError.code !== 'PGRST116') throw checkError;
            
            if (existingInvoice) {
                // If somehow we got a duplicate, try again recursively
                return this.getNextInvoiceNumber(clientId);
            }

            return formattedNumber;
        } catch (error) {
            console.error('Error generating invoice number:', error);
            throw error;
        }
    }
}

export default new InvoiceNumberService();
