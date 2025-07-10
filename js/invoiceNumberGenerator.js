class InvoiceNumberGenerator {
    constructor() {
        this.supabase = window.supabase; // Ensure Supabase client is available globally
        this.prefix = 'INV';
        this.year = new Date().getFullYear();
        this.lock = false; // Prevent concurrent calls for the same instance
        console.log('[InvoiceNumberGenerator] Initialized with year:', this.year, 'prefix:', this.prefix, 'supabase:', !!this.supabase);
    }

    /**
     * Get the next invoice number for a user and serie
     * @param {string} userId - The user ID
     * @param {string} serie - The invoice series (e.g., 'A', 'B')
     * @returns {Promise<string>} - The next invoice number
     */
    async getNextNumber(userId, serie) {
        console.log('[InvoiceNumberGenerator] getNextNumber called with userId:', userId, 'serie:', serie);
        if (!this.supabase) throw new Error('Supabase client not found.');
        if (this.lock) throw new Error('Invoice number generation is already in progress for this instance.');
        this.lock = true;
        try {
            if (!userId) throw new Error('User ID is required for invoice number generation.');
            if (!serie) serie = 'A';
            console.log('[InvoiceNumberGenerator] Querying latest invoice for user:', userId, 'year:', this.year, 'serie:', serie);
            // Query latest invoice for this user, year, and serie
            const { data: lastInvoiceData, error: fetchLastError } = await this.supabase
                .from('invoices')
                .select('invoiceNumber')
                .eq('user_id', userId)
                .eq('serie', serie)
                .ilike('invoiceNumber', `${serie}/INV-${this.year}-%`)
                .order('invoiceNumber', { ascending: false })
                .limit(1);
            console.log('[InvoiceNumberGenerator] Supabase query result:', { lastInvoiceData, fetchLastError });
            let sequence = 1;
            if (fetchLastError) {
                console.error('[InvoiceNumberGenerator] Error fetching last invoice:', fetchLastError);
                throw fetchLastError;
            }
            if (lastInvoiceData && lastInvoiceData.length > 0) {
                const lastNumber = lastInvoiceData[0].invoiceNumber;
                console.log('[InvoiceNumberGenerator] Last invoice number found:', lastNumber);
                const matches = lastNumber.match(/INV-\d{4}-(\d+)$/);
                if (matches && matches[1]) {
                    sequence = parseInt(matches[1], 10) + 1;
                    console.log('[InvoiceNumberGenerator] Extracted sequence from last invoice:', matches[1], 'Next sequence:', sequence);
                } else {
                    console.warn('[InvoiceNumberGenerator] Could not extract sequence from last invoice number:', lastNumber);
                }
            } else {
                console.log('[InvoiceNumberGenerator] No previous invoice found. Starting sequence at 1.');
            }
            const newInvoiceNumber = `${serie}/INV-${this.year}-${String(sequence).padStart(5, '0')}`;
            console.log('[InvoiceNumberGenerator] Generated new invoice number:', newInvoiceNumber);
            // Ensure uniqueness
            const { data: existingInvoice, error: checkError } = await this.supabase
                .from('invoices')
                .select('invoiceNumber')
                .eq('user_id', userId)
                .eq('serie', serie)
                .eq('invoiceNumber', newInvoiceNumber)
                .maybeSingle();
            console.log('[InvoiceNumberGenerator] Uniqueness check result:', { existingInvoice, checkError });
            if (checkError && checkError.code !== 'PGRST116') {
                console.error('[InvoiceNumberGenerator] Error checking uniqueness:', checkError);
                throw checkError;
            }
            if (existingInvoice) {
                console.warn('[InvoiceNumberGenerator] Invoice number already exists, incrementing sequence and retrying.');
                sequence++;
                // Log recursive call
                console.log('[InvoiceNumberGenerator] Recursively calling getNextNumber with sequence:', sequence);
                this.lock = false; // Release lock before recursion
                return this.getNextNumber(userId, serie);
            }
            console.log('[InvoiceNumberGenerator] Returning new unique invoice number:', newInvoiceNumber);
            return newInvoiceNumber;
        } catch (error) {
            console.error('[InvoiceNumberGenerator] Error generating invoice number:', error.message || error);
            throw error;
        } finally {
            this.lock = false;
            console.log('[InvoiceNumberGenerator] Lock released.');
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