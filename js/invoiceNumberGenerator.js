class InvoiceNumberGenerator {
    constructor() {
        this.supabase = window.supabase; // Ensure Supabase client is available globally
        this.prefix = 'INV';
        this.year = new Date().getFullYear();
        this.lock = false; // Prevent concurrent calls for the same instance
    }

    async getNextNumber() {
        if (!this.supabase) {
            console.error('Supabase client is not initialized on window.');
            throw new Error('Supabase client not found.');
        }

        if (this.lock) {
            throw new Error('Invoice number generation is already in progress for this instance.');
        }
        this.lock = true;

        try {
            // Get the current environment_id
            if (!window.getCurrentEnvironmentId) {
                throw new Error('getCurrentEnvironmentId is not available on window.');
            }
            const environment_id = await window.getCurrentEnvironmentId();
            if (!environment_id) {
                throw new Error('Environment ID not found. Cannot generate invoice number.');
            }

            // Get the latest invoice number for the current year AND the environment_id
            const { data: lastInvoiceData, error: fetchLastError } = await this.supabase
                .from('invoices')
                .select('invoiceNumber')
                .eq('environment_id', environment_id) // Filter by environment_id
                .ilike('invoiceNumber', `${this.prefix}-${this.year}-%`) // Filter by prefix and year
                .order('invoiceNumber', { ascending: false })
                .limit(1);

            if (fetchLastError) {
                console.error('Error fetching last invoice number:', fetchLastError);
                throw fetchLastError;
            }

            let sequence = 1;
            if (lastInvoiceData && lastInvoiceData.length > 0) {
                const lastNumber = lastInvoiceData[0].invoiceNumber;
                const matches = lastNumber.match(/-(\d+)$/); // Extracts the sequence part
                if (matches && matches[1]) {
                    sequence = parseInt(matches[1], 10) + 1;
                }
            }

            // Generate the new invoice number
            const newInvoiceNumber = `${this.prefix}-${this.year}-${String(sequence).padStart(5, '0')}`;

            // Verify this number is unique for the current environment
            const { data: existingInvoice, error: checkError } = await this.supabase
                .from('invoices')
                .select('invoiceNumber')
                .eq('environment_id', environment_id) // Only check for the current environment
                .eq('invoiceNumber', newInvoiceNumber)
                .maybeSingle();

            if (checkError && checkError.code !== 'PGRST116') {
                console.error('Error checking invoice uniqueness:', checkError);
                throw checkError;
            }

            if (existingInvoice) {
                // If the number exists for this environment, increment and try again
                console.warn(`Invoice number ${newInvoiceNumber} already exists for environment_id ${environment_id}. Incrementing sequence.`);
                sequence++;
                // Recursively try with next sequence
                // To avoid infinite recursion, pass sequence as an argument (optional improvement)
                return this.getNextNumber();
            }

            return newInvoiceNumber;

        } catch (error) {
            console.error('Error generating invoice number:', error.message || error);
            throw error;
        } finally {
            this.lock = false; // Always release the lock
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