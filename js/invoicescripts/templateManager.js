/*
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
                        <p>NUIT: <span id="display-company-nuit" data-field="company.nuit">{{#if company.nuit}}{{company.nuit}}{{else}}0{{/if}}</span></p>
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
                <p>NUIT: <span id="display-client-nuit" data-field="client.nuit">{{#if client.nuit}}{{client.nuit}}{{else}}0{{/if}}</span></p>
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
            const { data: { session } } = await supabase.auth.getSession();

            // Check if session and user exist and user.id is available
            if (!session || !session.user || !session.user.id) {
                console.warn('No active session or user ID, using default template');
                return 'classic'; // Or handle as appropriate for no logged-in user
            }

            // First get user's settings to know which template they selected
            const { data: settings, error: settingsError } = await supabase
                .from('invoice_settings')
                .select('template')
                .eq('user_id', session.user.id)
                .single();

            if (settingsError) {
                console.error('Error fetching settings:', settingsError);
                return 'classic';
            }

            // Then get the actual template content
            const { data: template, error: templateError } = await supabase
                .from('invoice_templates')
                .select('content')
                .eq('name', settings.template)
                .single();

            if (templateError) {
                console.error('Error fetching template:', templateError);
                return this.defaultTemplate;
            }

            return template.content;
        } catch (error) {
            console.error('Error in getSelectedTemplate:', error);
            return this.defaultTemplate;
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
    async generateInvoiceHTML(invoiceId) {
        try {
            // Ensure we have a valid invoice ID
            if (!invoiceId || (typeof invoiceId !== 'number' && typeof invoiceId !== 'string')) {
                throw new Error('Invalid invoice ID provided');
            }

            // Fetch invoice data from Supabase
            const { data: invoiceData, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    client:clients(*),
                    business:business_profiles(*)
                `)
                .eq('id', invoiceId)
                .single();

            if (error) throw error;
            if (!invoiceData) {
                throw new Error('No invoice data found');
            }

            // Format the data for the template
            const formattedData = {
                // Business profile info
                company: {
                    name: invoiceData.business?.company_name || 'Your Company Name',
                    address: invoiceData.business?.address || 'Your Company Address',
                    email: invoiceData.business?.email || 'info@yourcompany.com',
                    phone: invoiceData.business?.phone || '+258 XX XXX XXXX',
                    nuit: invoiceData.business?.tax_id || '123456789',
                    website: invoiceData.business?.website || '',
                    logo: '' // Add logo field if needed
                },
                // Invoice details
                invoice: {
                    id: invoiceData.id, // Include the invoice ID
                    number: invoiceData.invoice_number || 'Draft Invoice',
                    issueDate: invoiceData.issue_date || new Date().toISOString().split('T')[0],
                    dueDate: invoiceData.due_date || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                    status: invoiceData.status || 'draft',
                    projectName: invoiceData.project_name || '',
                    subtotal: invoiceData.subtotal || 0,
                    vat: invoiceData.vat_amount || 0,
                    total: invoiceData.total_amount || 0,
                    discount: invoiceData.discount || 0,
                    notes: invoiceData.notes || '',
                    paymentTerms: invoiceData.payment_terms || 'net30'
                },
                client: {
                    name: invoiceData.client?.name || invoiceData.client?.customer_name || 'Client Name',
                    address: invoiceData.client?.address || invoiceData.client?.billing_address || '',
                    nuit: Number(invoiceData.client?.nuit || invoiceData.client?.customer_tax_id) || 0,
                    email: invoiceData.client?.email || '',
                    contact: invoiceData.client?.contact || '',
                    phone: invoiceData.client?.phone || invoiceData.client?.telephone || '',
                    city: invoiceData.client?.city || '',
                    postal_code: invoiceData.client?.postal_code || '',
                    province: invoiceData.client?.province || '',
                    country: invoiceData.client?.country || ''
                },
                items: (invoiceData.items || []).map(item => ({
                    description: item.description || '',
                    quantity: item.quantity || 0,
                    price: this.formatCurrency(item.price || 0),
                    vat: this.formatCurrency(item.vat || 0),
                    total: this.formatCurrency(item.total || 0)
                })),
                currency: invoiceData.currency || 'MZN'
            };

            // Use Handlebars to compile the template
            const template = Handlebars.compile(this.defaultTemplate);
            const html = template(formattedData);
            
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
        
        // Use Handlebars to compile the template
        const compiledTemplate = Handlebars.compile(template);
        
        // Format the data to match the expected structure
        const formattedData = {
            company: {
                name: data.company?.name || window.companySettings?.name || 'Your Company Name',
                address: data.company?.address || window.companySettings?.address || 'Your Company Address',
                email: data.company?.email || window.companySettings?.email || 'info@yourcompany.com',
                phone: data.company?.phone || window.companySettings?.phone || '+258 XX XXX XXXX',
                nuit: Number(data.company?.nuit || window.companySettings?.nuit) || 0,
                logo: data.company?.logo || window.companySettings?.logo || ''
            },
            invoice: {
                number: data.invoice?.number || data.invoiceNumber || 'Draft Invoice',
                issueDate: this.formatDate(data.invoice?.issueDate || data.issueDate),
                dueDate: this.formatDate(data.invoice?.dueDate || data.dueDate),
                status: data.invoice?.status || data.status || 'draft',
                projectName: data.invoice?.projectName || '',
                subtotal: this.formatCurrency(data.invoice?.subtotal || data.subtotal || 0),
                vat: this.formatCurrency(data.invoice?.vat || data.totalVat || 0),
                total: this.formatCurrency(data.invoice?.total || data.total || 0),
                discount: this.formatCurrency(data.invoice?.discount || data.discount || 0),
                notes: data.invoice?.notes || data.notes || '',
                paymentTerms: data.invoice?.paymentTerms || data.paymentTerms || 'net30'
            },
            client: {
                name: data.client?.name || data.client?.customer_name || 'Client Name',
                address: data.client?.address || data.client?.billing_address || '',
                nuit: Number(data.client?.nuit || data.client?.customer_tax_id) || 0,
                email: data.client?.email || '',
                contact: data.client?.contact || '',
                phone: data.client?.phone || data.client?.telephone || '',
                city: data.client?.city || '',
                postal_code: data.client?.postal_code || '',
                province: data.client?.province || '',
                country: data.client?.country || ''
            },
            items: (data.items || []).map(item => ({
                description: item.description || '',
                quantity: item.quantity || 0,
                price: this.formatCurrency(item.price || 0),
                vat: this.formatCurrency(item.vat || 0),
                total: this.formatCurrency(item.total || 0)
            })),
            currency: data.currency || 'MZN'
        };

        console.log('Formatted data for template:', formattedData);
        const html = compiledTemplate(formattedData);
        console.log('Generated HTML:', html);
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
    },

    async fetchInvoiceData(invoiceData) {
        try {
            // If invoiceData is already an object with the required data, return it
            if (invoiceData && typeof invoiceData === 'object' && invoiceData.invoice) {
                return invoiceData;
            }

            // If invoiceData is a numeric ID, fetch from database
            if (typeof invoiceData === 'number' || typeof invoiceData === 'string') {
                const { data, error } = await supabase
                    .from('invoices')
                    .select('*')
                    .eq('id', invoiceData)
                    .single();

                if (error) throw error;
                return data;
            }

            throw new Error('Invalid invoice data format');
        } catch (error) {
            console.error('Error fetching invoice data:', error);
            throw error;
        }
    }
};

// Attach to window for global access
window.invoiceTemplateManager = templateManager; 

*/