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
            .company-header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .company-logo { max-width: 200px; max-height: 100px; }
            .company-details { text-align: right; }
            .invoice-status { margin-top: 10px; padding: 5px 10px; border-radius: 4px; display: inline-block; }
            .status-paid { background-color: #e6f4ea; color: #1e7e34; }
            .status-pending { background-color: #fff3cd; color: #856404; }
            .status-overdue { background-color: #f8d7da; color: #721c24; }
        `,
        layout: `
            <div class="invoice-container">
                <div class="company-header">
                    <div class="company-logo">
                        {{#if company.logo}}
                            <img src="{{company.logo}}" alt="{{company.name}}">
                        {{/if}}
                    </div>
                    <div class="company-details">
                        <h2>{{company.name}}</h2>
                        <p>{{company.address}}</p>
                        <p>NUIT: {{company.nuit}}</p>
                        <p>Tel: {{company.phone}}</p>
                        <p>Email: {{company.email}}</p>
                    </div>
                </div>
                <div class="invoice-header">
                    <h1>Invoice {{invoiceNumber}}</h1>
                    <p>Date: {{issueDate}}</p>
                    <p>Due Date: {{dueDate}}</p>
                    <p>Status: <span class="invoice-status status-{{status}}">{{status}}</span></p>
                </div>
                <div class="invoice-details">
                    <h2>Bill To:</h2>
                    <p><strong>{{client.name}}</strong></p>
                    <p>Tax ID: {{client.taxId}}</p>
                    <p>Email: {{client.email}}</p>
                    <p>Address: {{client.address}}</p>
                    {{#if client.contact}}
                    <p>Contact: {{client.contact}}</p>
                    {{/if}}
                </div>
                <table class="invoice-items">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>VAT (16%)</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {{items}}
                    </tbody>
                </table>
                <div class="invoice-total">
                    <p>Subtotal: {{currency}} {{subtotal}}</p>
                    <p>VAT: {{currency}} {{totalVat}}</p>
                    <p><strong>Total: {{currency}} {{total}}</strong></p>
                </div>
                <div class="invoice-notes">
                    <h3>Notes:</h3>
                    <p>{{notes}}</p>
                </div>
                <div class="payment-terms">
                    <h3>Payment Terms:</h3>
                    <p>{{paymentTerms}}</p>
                </div>
            </div>
        `
    },

    // Get selected template from Supabase
    async getSelectedTemplate() {
        try {
            console.log('Getting selected template...');
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.warn('No active session, using default template');
                return 'classic';
            }

            const { data, error } = await supabase
                .from('invoice_templates')
                .select('id, name')
                .eq('user_id', session.user.id)
                .eq('is_default', true)
                .single();

            if (error) {
                console.error('Error fetching template:', error);
                return 'classic';
            }

            console.log('Selected template:', data?.name || 'classic');
            return data?.id || 'classic';
        } catch (error) {
            console.error('Error in getSelectedTemplate:', error);
            return 'classic';
        }
    },

    // Get template content
    async getTemplate(templateId) {
        try {
            console.log('Getting template content for:', templateId);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                console.warn('No active session, using default template');
                return this.defaultTemplate;
            }

            const { data, error } = await supabase
                .from('invoice_templates')
                .select('content')
                .eq('id', templateId)
                .single();

            if (error) {
                console.error('Error fetching template content:', error);
                return this.defaultTemplate;
            }

            console.log('Raw template content from Supabase:', data?.content);

            // Content is already in JSONB format, no need to parse
            const template = {
                styles: data?.content?.styles || this.defaultTemplate.styles,
                layout: data?.content?.layout || this.defaultTemplate.layout
            };

            console.log('Processed template:', template);
            return template;
        } catch (error) {
            console.error('Error in getTemplate:', error);
            return this.defaultTemplate;
        }
    },

    // Save template selection
    async saveTemplateSelection(templateId) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No active session');
            }

            // First, unset any existing default template
            await supabase
                .from('invoice_templates')
                .update({ is_default: false })
                .eq('user_id', session.user.id)
                .eq('is_default', true);

            // Then set the new default template
            const { error } = await supabase
                .from('invoice_templates')
                .update({ is_default: true })
                .eq('id', templateId)
                .eq('user_id', session.user.id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error saving template:', error);
            throw error;
        }
    },

    // Save new template
    async saveTemplate(templateData) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('No active session');
            }

            const { error } = await supabase
                .from('invoice_templates')
                .insert({
                    user_id: session.user.id,
                    name: templateData.name,
                    content: {
                        styles: templateData.styles,
                        layout: templateData.layout
                    },
                    is_default: templateData.is_default || false
                });

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error saving template:', error);
            throw error;
        }
    },

    // Generate invoice HTML from data
    async generateInvoiceHTML(invoiceData) {
        try {
            console.log('Generating invoice HTML for data:', invoiceData);
            
            // Get selected template
            const selectedTemplate = await this.getSelectedTemplate();
            const template = await this.getTemplate(selectedTemplate);
            
            // Create the full HTML document with styles
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Invoice ${invoiceData.invoiceNumber}</title>
                    <style>
                        ${template.styles}
                    </style>
                </head>
                <body>
                    ${template.layout}
                </body>
                </html>
            `;
            
            // Populate template with data
            const populatedHtml = await this.populateTemplate(html, invoiceData);
            console.log('Generated HTML:', populatedHtml);
            return populatedHtml;
        } catch (error) {
            console.error('Error generating invoice HTML:', error);
            throw error;
        }
    },

    // Populate template with data
    async populateTemplate(template, data) {
        console.log('Populating template with data:', data);
        
        // Replace placeholders with actual data
        let html = template;
        
        // Basic invoice info
        html = html.replace(/{{invoiceNumber}}/g, data.invoiceNumber || '');
        html = html.replace(/{{issueDate}}/g, this.formatDate(data.issue_date || data.issueDate) || '');
        html = html.replace(/{{dueDate}}/g, this.formatDate(data.due_date || data.dueDate) || '');
        html = html.replace(/{{status}}/g, data.status || 'pending');
        
        // Client info - Matching Supabase template placeholders
        html = html.replace(/{{client\.name}}/g, data.client?.name || data.customer_name || '');
        html = html.replace(/{{client\.email}}/g, data.client?.email || data.client_email || '');
        html = html.replace(/{{client\.address}}/g, data.client?.address || data.client_address || '');
        html = html.replace(/{{client\.taxId}}/g, data.client?.taxId || data.client_tax_id || '');
        html = html.replace(/{{client\.contact}}/g, data.client?.contact || data.client_contact || '');

        // Company info - Matching Supabase template placeholders
        const companyData = window.companySettings || {
            name: 'Your Company Name',
            address: 'Your Company Address',
            email: 'info@yourcompany.com',
            phone: '+258 XX XXX XXXX',
            nuit: '123456789',
            logo: ''
        };
        html = html.replace(/{{company\.name}}/g, companyData.name);
        html = html.replace(/{{company\.address}}/g, companyData.address);
        html = html.replace(/{{company\.nuit}}/g, companyData.nuit);
        html = html.replace(/{{company\.phone}}/g, companyData.phone);
        html = html.replace(/{{company\.email}}/g, companyData.email);
        html = html.replace(/{{company\.logo}}/g, companyData.logo);
        
        // Items - handle both array and string format
        let itemsHtml = '';
        const itemsData = Array.isArray(data.items) ? data.items : (typeof data.items === 'string' ? JSON.parse(data.items || '[]') : []);

        if (itemsData && itemsData.length > 0) {
            itemsHtml = itemsData.map(item => `
                <tr>
                    <td>${item.description || ''}</td>
                    <td>${item.quantity || ''}</td>
                    <td>${this.formatCurrency(item.price)}</td>
                    <td>${this.formatCurrency(item.vat)}</td>
                    <td>${this.formatCurrency(item.total)}</td>
                </tr>
            `).join('');
        } else {
             console.warn('No items data found or items data is empty.', data.items);
             itemsHtml = '<tr><td colspan="5">No items available</td></tr>';
        }
        html = html.replace(/{{items}}/g, itemsHtml);
        
        // Totals - handle both direct properties and nested structure
        const subtotal = data.subtotal || data.total_amount - data.vat_amount || 0;
        const totalVat = data.vat_amount || 0;
        const total = data.total_amount || data.total || (parseFloat(subtotal) + parseFloat(totalVat)) || 0;

        html = html.replace(/{{subtotal}}/g, this.formatCurrency(subtotal));
        html = html.replace(/{{totalVat}}/g, this.formatCurrency(totalVat));
        html = html.replace(/{{total}}/g, this.formatCurrency(total));
        html = html.replace(/{{currency}}/g, data.currency || 'MZN');
        
        // Notes and payment terms
        html = html.replace(/{{notes}}/g, data.notes || '');
        html = html.replace(/{{paymentTerms}}/g, data.payment_terms || data.paymentTerms || 'Net 30');
        
        console.log('Template populated successfully');
        return html;
    },

    // Helper function to format dates
    formatDate(date) {
        if (!date) return '';
        const d = new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    },

    // Helper function to format currency
    formatCurrency(amount) {
        if (amount === undefined || amount === null) return '0.00';
        return parseFloat(amount).toFixed(2);
    }
};

// Attach to window for global access
window.invoiceTemplateManager = templateManager; 