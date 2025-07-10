class InvoiceNumberGenerator {
    constructor() {
        this.supabase = window.supabase; // Ensure Supabase client is available globally
        this.prefix = 'INV';
        this.year = new Date().getFullYear();
        this.lock = false; // Prevent concurrent calls for the same instance
    }

    /**
     * Get the next invoice number for a user and serie
     * @param {string} userId - The user ID
     * @param {string} serie - The invoice series (e.g., 'A', 'B')
     * @returns {Promise<string>} - The next invoice number
     */
    async getNextNumber(userId, serie) {
        if (!this.supabase) throw new Error('Supabase client not found.');
        if (this.lock) throw new Error('Invoice number generation is already in progress for this instance.');
        this.lock = true;
        try {
            if (!userId) throw new Error('User ID is required for invoice number generation.');
            if (!serie) serie = 'A';
            // Query latest invoice for this user, year, and serie
            const { data: lastInvoiceData, error: fetchLastError } = await this.supabase
                .from('invoices')
                .select('invoiceNumber')
                .eq('user_id', userId)
                .eq('serie', serie)
                .ilike('invoiceNumber', `${serie}/INV-${this.year}-%`)
                .order('invoiceNumber', { ascending: false })
                .limit(1);
            if (fetchLastError) throw fetchLastError;
            let sequence = 1;
            if (lastInvoiceData && lastInvoiceData.length > 0) {
                const lastNumber = lastInvoiceData[0].invoiceNumber;
                const matches = lastNumber.match(/INV-\d{4}-(\d+)$/);
                if (matches && matches[1]) {
                    sequence = parseInt(matches[1], 10) + 1;
                }
            }
            const newInvoiceNumber = `${serie}/INV-${this.year}-${String(sequence).padStart(5, '0')}`;
            // Ensure uniqueness
            const { data: existingInvoice, error: checkError } = await this.supabase
                .from('invoices')
                .select('invoiceNumber')
                .eq('user_id', userId)
                .eq('serie', serie)
                .eq('invoiceNumber', newInvoiceNumber)
                .maybeSingle();
            if (checkError && checkError.code !== 'PGRST116') throw checkError;
            if (existingInvoice) {
                sequence++;
                return this.getNextNumber(userId, serie);
            }
            return newInvoiceNumber;
        } catch (error) {
            console.error('Error generating invoice number:', error.message || error);
            throw error;
        } finally {
            this.lock = false;
        }
    }
}

// Attach to window for global use (if needed in browser environment)
if (typeof window !== 'undefined') {
    window.InvoiceNumberGenerator = InvoiceNumberGenerator;
}

// --- HOW TO USE ---
// Ensure Supabase is initialized and available on `window.supabase`
// For example:
// import { createClient } from '@supabase/supabase-js';
// const supabaseUrl = 'YOUR_SUPABASE_URL';
// const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';
// window.supabase = createClient(supabaseUrl, supabaseKey);

async function generateAndSaveInvoice() {
    if (!window.supabase) {
        alert('Supabase client not initialized!');
        return;
    }
    const generator = new window.InvoiceNumberGenerator();
    try {
        const newInvNumber = await generator.getNextNumber();
        console.log('Generated Invoice Number:', newInvNumber);

        // Now, when you save the invoice, make sure to include the user_id
        const { data: { user } } = await window.supabase.auth.getUser();
        if (user) {
            // const { data, error } = await window.supabase
            // .from('invoices')
            // .insert([{ invoiceNumber: newInvNumber, user_id: user.id, other_invoice_data: '...' }]);
            //
            // if (error) {
            //     console.error('Error saving invoice:', error);
            // } else {
            //     console.log('Invoice saved successfully:', data);
            // }
            alert(`Generated: ${newInvNumber}. You would now save this with user_id: ${user.id}`);
        } else {
            alert('User not logged in. Cannot save invoice.');
        }

    } catch (error) {
        console.error('Failed to generate invoice number:', error.message);
        alert(`Error: ${error.message}`);
    }
}

// Example:
// Make sure a user is logged in via Supabase Auth, then call:
// generateAndSaveInvoice();