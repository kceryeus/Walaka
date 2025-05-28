// Template Manager for Invoice System
const templateManager = {
    // Default template content
    defaultTemplate: `
        <div class="invoice-container">
            <div class="invoice-header">
                <div class="company-info">
                    <div class="company-branding">
                        <div id="company-logo" data-field="company.logo">
                            {{#if company.logo}}
                                <img src="{{company.logo}}" alt="{{company.name}}">
                            {{/if}}
                        </div>
                        <h1 id="display-company-name" data-field="company.name">{{company.name}}</h1>
                    </div>
                    <div class="company-details">
                        <p id="display-company-address" data-field="company.address">{{company.address}}</p>
                        <p>Email: <span id="display-company-email" data-field="company.email">{{company.email}}</span></p>
                        <p>Phone: <span id="display-company-phone" data-field="company.phone">{{company.phone}}</span></p>
                        <p>NUIT: <span id="display-company-nuit" data-field="company.nuit">{{company.nuit}}</span></p>
                    </div>
                </div>
                <div class="invoice-details">
                    <h2>INVOICE</h2>
                    <p>Invoice #: <span id="display-invoice-number" data-field="invoice.number">{{invoice.number}}</span></p>
                    <p>Date: <span id="display-issue-date" data-field="invoice.issueDate">{{invoice.issueDate}}</span></p>
                    <p>Due Date: <span id="display-due-date" data-field="invoice.dueDate">{{invoice.dueDate}}</span></p>
                    <p>Status: <span id="display-invoice-status" data-field="invoice.status">{{invoice.status}}</span></p>
                </div>
            </div>
            
            <div class="client-info">
                <h3>Bill To:</h3>
                <p id="display-client-name" data-field="client.name">{{client.name}}</p>
                <p id="display-client-address" data-field="client.address">{{client.address}}</p>
                <p>NUIT: <span id="display-client-nuit" data-field="client.nuit">{{client.nuit}}</span></p>
                <p>Email: <span id="display-client-email" data-field="client.email">{{client.email}}</span></p>
                <p>Contact: <span id="display-client-contact" data-field="client.contact">{{client.contact}}</span></p>
            </div>
            
            <table class="invoice-items">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>VAT (%)</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody id="display-items" data-field="invoice.items">
                    {{#each items}}
                    <tr>
                        <td>{{description}}</td>
                        <td>{{quantity}}</td>
                        <td>{{currency}} {{price}}</td>
                        <td>{{vat}}</td>
                        <td>{{currency}} {{total}}</td>
                    </tr>
                    {{/each}}
                </tbody>
            </table>
            
            <div class="invoice-totals">
                <div class="total-row">Subtotal: <span id="display-subtotal" data-field="invoice.subtotal">{{currency}} {{invoice.subtotal}}</span></div>
                <div class="total-row">VAT: <span id="display-totalVat" data-field="invoice.vat">{{currency}} {{invoice.vat}}</span></div>
                {{#if invoice.discount}}
                <div class="total-row">Discount: <span id="display-discount" data-field="invoice.discount">{{currency}} {{invoice.discount}}</span></div>
                {{/if}}
                <div class="total-row grand-total">Total: <span id="display-total" data-field="invoice.total">{{currency}} {{invoice.total}}</span></div>
            </div>
            
            <div class="notes">
                <h4>Notes:</h4>
                <p id="display-notes" data-field="invoice.notes">{{invoice.notes}}</p>
            </div>
            
            <div class="payment-terms">
                <h4>Payment Terms:</h4>
                <p id="display-payment-terms" data-field="invoice.paymentTerms">{{invoice.paymentTerms}}</p>
            </div>
        </div>
    `,

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
    async generateInvoiceHTML(data) {
        try {
            console.log('Generating invoice HTML with data:', data);
            
            // Format dates
            if (data.invoice.issueDate) {
                data.invoice.issueDate = this.formatDate(data.invoice.issueDate);
            }
            if (data.invoice.dueDate) {
                data.invoice.dueDate = this.formatDate(data.invoice.dueDate);
            }

            // Format currency values
            data.invoice.subtotal = this.formatCurrency(data.invoice.subtotal);
            data.invoice.vat = this.formatCurrency(data.invoice.vat);
            data.invoice.total = this.formatCurrency(data.invoice.total);
            if (data.invoice.discount) {
                data.invoice.discount = this.formatCurrency(data.invoice.discount);
            }

            // Format item values
            data.items = data.items.map(item => ({
                ...item,
                price: this.formatCurrency(item.price),
                vat: this.formatCurrency(item.vat),
                total: this.formatCurrency(item.total)
            }));

            // Use Handlebars to compile the template
            const template = Handlebars.compile(this.defaultTemplate);
            const html = template(data);
            
            console.log('Generated HTML:', html);
            return html;
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
            month: '2-digit',
            day: '2-digit'
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