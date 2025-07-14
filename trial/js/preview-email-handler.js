class PreviewEmailHandler {
    constructor() {
        this.previewEmailBtn = document.getElementById('emailInvoiceBtn');
        this.initialize();
    }

    initialize() {
        if (this.previewEmailBtn) {
            this.previewEmailBtn.addEventListener('click', () => this.handlePreviewEmailClick());
        }
    }

    handlePreviewEmailClick() {
        try {
            const invoiceNumber = document.getElementById('viewInvoiceNumber').textContent;
            const clientName = document.querySelector(`[data-invoice="${invoiceNumber}"]`)?.getAttribute('data-client');
            
            // If we have the client name from the DOM, use it directly
            if (clientName) {
                window.emailHandler.openEmailModal(invoiceNumber, clientName);
                return;
            }

            // Otherwise fall back to database lookup
            this.getClientDetailsFromInvoice(invoiceNumber).then(clientDetails => {
                if (clientDetails) {
                    window.emailHandler.openEmailModal(invoiceNumber, clientDetails.name);
                } else {
                    throw new Error('Could not find client details');
                }
            }).catch(error => {
                console.error('Error preparing email:', error);
                alert('Could not prepare email. Please try again.');
            });

        } catch (error) {
            console.error('Error preparing email:', error);
            alert('Could not prepare email. Please try again.');
        }
    }

    async getClientDetailsFromInvoice(invoiceNumber) {
        try {
            // Simplified query - first get the invoice
            const { data: invoice, error: invoiceError } = await window.supabase
                .from('invoices')
                .select('client_id, client_name')
                .eq('number', invoiceNumber)
                .maybeSingle();

            if (invoiceError) throw invoiceError;
            
            if (!invoice) {
                console.warn('Invoice not found:', invoiceNumber);
                return null;
            }

            // Then get the client details
            const { data: client, error: clientError } = await window.supabase
                .from('clients')
                .select('name, email')
                .eq('id', invoice.client_id)
                .maybeSingle();

            if (clientError) throw clientError;

            if (!client) {
                // Fallback to client name from invoice if available
                return invoice.client_name ? {
                    name: invoice.client_name,
                    email: ''
                } : null;
            }

            return client;

        } catch (error) {
            console.error('Error fetching client details:', error);
            // Return a default object if we have invoice client name
            const invoiceRow = document.querySelector(`[data-invoice="${invoiceNumber}"]`);
            if (invoiceRow) {
                const clientName = invoiceRow.getAttribute('data-client');
                if (clientName) {
                    return {
                        name: clientName,
                        email: ''
                    };
                }
            }
            return null;
        }
    }
}

// Initialize the preview email handler when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.previewEmailHandler = new PreviewEmailHandler();
});
