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
            // Get the authenticated user
            const { data: { user }, error: authError } = await this.supabase.auth.getUser();

            if (authError) {
                console.error('Error fetching authenticated user:', authError);
                throw authError;
            }
            if (!user) {
                throw new Error('User not authenticated. Cannot generate invoice number.');
            }
            const userId = user.id;

            // Get the latest invoice number for the current year AND the authenticated user
            const { data: lastInvoiceData, error: fetchLastError } = await this.supabase
                .from('invoices')
                .select('invoiceNumber')
                .eq('user_id', userId) // Filter by the authenticated user's ID
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

            let newInvoiceNumber;
            let isUniqueForUser = false;
            let attemptCount = 0; // To prevent infinite loops in unforeseen circumstances

            // Loop to ensure uniqueness for the current user
            while (!isUniqueForUser && attemptCount < 10) { // Added attemptCount for safety
                newInvoiceNumber = `${this.prefix}-${this.year}-${String(sequence).padStart(5, '0')}`;

                // Check if this invoice number already exists for THIS user
                const { data: existingInvoice, error: checkError } = await this.supabase
                    .from('invoices')
                    .select('invoiceNumber')
                    .eq('user_id', userId) // Check only for the current user
                    .eq('invoiceNumber', newInvoiceNumber)
                    .maybeSingle(); // Use maybeSingle to handle 0 or 1 row

                // Handle potential errors during the check, except for PGRST116 (0 rows)
                if (checkError && checkError.code !== 'PGRST116') {
                    console.error('Error checking invoice uniqueness:', checkError);
                    throw checkError;
                }

                if (!existingInvoice) { // If existingInvoice is null (no match found for this user)
                    isUniqueForUser = true;
                } else {
                    // Invoice number exists for this user, increment sequence and try again
                    console.warn(`Invoice number ${newInvoiceNumber} already exists for user ${userId}. Incrementing sequence.`);
                    sequence++;
                    attemptCount++;
                }
            }

            if (!isUniqueForUser) {
                // This should ideally not be reached if logic is correct and DB is consistent
                throw new Error(`Failed to generate a unique invoice number for user ${userId} after ${attemptCount} attempts.`);
            }

            return newInvoiceNumber;

        } catch (error) {
            console.error('Error generating invoice number:', error.message || error);
            // Re-throw the error so the calling function can handle it
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