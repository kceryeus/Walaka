// Template Manager for Invoice System
const templateManager = {
    // Default template content
    defaultTemplate: {
        styles: `
            .invoice-container { padding: 20px; max-width: 800px; margin: 0 auto; }
            .invoice-header { margin-bottom: 20px; }
            .invoice-details { margin-bottom: 20px; }
            .invoice-items { width: 100%; border-collapse: collapse; }
            .invoice-items th, .invoice-items td { padding: 8px; border: 1px solid #ddd; }
            .invoice-total { margin-top: 20px; text-align: right; }
        `,
        layout: `
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
        `
    },

    // Get selected template from Supabase
    async getSelectedTemplate() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.warn('No active session, using default template');
                return 'classic';
            }

            const { data, error } = await supabase
                .from('invoice_settings')
                .select('template')
                .eq('user_id', session.user.id)
                .single();

            if (error) {
                console.error('Error fetching template:', error);
                return 'classic';
            }

            return data?.template || 'classic';
        } catch (error) {
            console.error('Error in getSelectedTemplate:', error);
            return 'classic';
        }
    },

    // Get template content
    async getTemplate(templateName) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.warn('No active session, using default template');
                return this.defaultTemplate;
            }

            const { data, error } = await supabase
                .from('invoice_settings')
                .select('content')
                .eq('user_id', session.user.id)
                .single();

            if (error) {
                console.error('Error fetching template content:', error);
                return this.defaultTemplate;
            }

            return {
                styles: data?.content?.styles || this.defaultTemplate.styles,
                layout: data?.content?.layout || this.defaultTemplate.layout
            };
        } catch (error) {
            console.error('Error in getTemplate:', error);
            return this.defaultTemplate;
        }
    },

    // Save template selection
    async saveTemplateSelection(template) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No active session');
            }

            const { error } = await supabase
                .from('invoice_settings')
                .upsert({
                    user_id: session.user.id,
                    template: template,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error saving template:', error);
            throw error;
        }
    }
};

// Attach to window for global access
window.invoiceTemplateManager = templateManager; 