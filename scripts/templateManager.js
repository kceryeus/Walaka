// Map template names to file paths 
const TEMPLATE_PATHS = {
    'template01': 'template01.html',
    'template02': 'template02.html',
    'template03': 'template03.html',
    'template04': 'template04.html'
};

// Template preview data
const TEMPLATE_PREVIEW_DATA = {
    company_name: 'Your Company Name',
    company_address: '123 Business Street\nCity, Country',
    company_email: 'contact@yourcompany.com',
    company_phone: '+123 456 7890',
    company_nuit: '123456789',
    invoice_number: 'INV-2024-001',
    issue_date: '2024-03-20',
    due_date: '2024-04-20',
    client_name: 'Sample Client',
    client_address: '456 Client Avenue\nClient City, Country',
    client_nuit: '987654321',
    client_email: 'client@example.com',
    client_contact: '+123 456 7891',
    currency: 'MZN',
    subtotal: '1000.00',
    totalVat: '160.00',
    discount: '0.00',
    total: '1160.00',
    notes: 'Thank you for your business!',
    items: [
        {
            description: 'Sample Product 1',
            quantity: '2',
            price: '500.00',
            vat: '16',
            total: '1160.00'
        }
    ]
};

// Supabase data fetching function
async function fetchInvoiceData(invoiceId) {
    try {
        // First fetch the invoice with client and business profile info
        const { data: invoice, error: invoiceError } = await supabase
            .from('invoices')
            .select(`
                *,
                client:clients(*),
                business:business_profiles(*)
            `)
            .eq('id', invoiceId)
            .single();

        if (invoiceError) throw invoiceError;

        // Then fetch the products
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('user_id', invoice.user_id);

        if (productsError) throw productsError;

        // Format the products data to match the expected structure
        const formattedItems = products.map(product => ({
            description: product.description,
            quantity: 1, // Default quantity, should be updated based on actual invoice data
            unit_price: product.price,
            vat_rate: product.tax_rate,
            vat_amount: (product.price * product.tax_rate) / 100,
            total: product.price + ((product.price * product.tax_rate) / 100)
        }));

        // Combine the data
        return {
            ...invoice,
            items: formattedItems || []
        };
    } catch (error) {
        console.error('Error fetching invoice data:', error);
        throw error;
    }
}

// Helper functions for data formatting
function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
}

function formatCurrency(amount, currency = 'MZN') {
    return new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: currency
    }).format(amount || 0);
}

function calculateSubtotal(items) {
    return items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
}

function calculateVAT(subtotal, vatRate = 16) {
    return (subtotal * vatRate) / 100;
}

// Template definitions with styles and layout
const TEMPLATES = {
    'classic': {
        name: 'Classic',
        styles: `
            .invoice-container {
                max-width: 800px;
                margin: 20px auto;
                padding: 20px;
                font-family: 'Inter', sans-serif;
                color: #000000;
            }
            .invoice-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
                border-bottom: 2px solid #eee;
                padding-bottom: 20px;
            }
            .company-info {
                flex: 1;
            }
            .invoice-details {
                text-align: right;
            }
            .client-info {
                margin-bottom: 30px;
                padding: 20px;
                background: #f9f9f9;
                border-radius: 5px;
            }
            .invoice-items {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }
            .invoice-items th {
                background: #f5f5f5;
                padding: 12px;
                text-align: left;
            }
            .invoice-items td {
                padding: 12px;
                border-bottom: 1px solid #eee;
            }
            .invoice-totals {
                text-align: right;
                margin-top: 30px;
            }
            .total-row {
                margin: 5px 0;
            }
            .grand-total {
                font-weight: bold;
                font-size: 1.2em;
                border-top: 2px solid #eee;
                padding-top: 10px;
            }
            .notes {
                margin-top: 40px;
                padding: 20px;
                background: #f9f9f9;
                border-radius: 5px;
            }
        `,
        layout: `
            <div class="invoice-container">
                <div class="invoice-header">
                    <div class="company-info">
                        <h1 id="company-name">Company Name</h1>
                        <p id="company-address">Company Address</p>
                        <p id="company-contact">Email: <span id="company-email"></span> | Phone: <span id="company-phone"></span></p>
                        <p>NUIT: <span id="company-nuit"></span></p>
                    </div>
                    <div class="invoice-details">
                        <h2>INVOICE</h2>
                        <p>Invoice #: <span id="invoice-number"></span></p>
                        <p>Date: <span id="issue-date"></span></p>
                        <p>Due Date: <span id="due-date"></span></p>
                    </div>
                </div>
                
                <div class="client-info">
                    <h3>Bill To:</h3>
                    <p id="client-name">Client Name</p>
                    <p id="client-address">Client Address</p>
                    <p>NUIT: <span id="client-nuit"></span></p>
                    <p>Email: <span id="client-email"></span></p>
                    <p>Contact: <span id="client-contact"></span></p>
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
                    <tbody id="invoice-items-body">
                        <!-- Items will be inserted here -->
                    </tbody>
                </table>
                
                <div class="invoice-totals">
                    <div class="total-row">Subtotal: <span id="subtotal"></span></div>
                    <div class="total-row">VAT: <span id="total-vat"></span></div>
                    <div class="total-row">Discount: <span id="discount"></span></div>
                    <div class="total-row grand-total">Total: <span id="total"></span></div>
                </div>
                
                <div class="notes">
                    <h4>Notes:</h4>
                    <p id="notes"></p>
                </div>
            </div>
        `
    },
    'modern': {
        name: 'Modern',
        styles: `
            .invoice-container {
                max-width: 800px;
                margin: 20px auto;
                padding: 30px;
                font-family: 'Inter', sans-serif;
                background: white;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
                border-radius: 10px;
            }
            .invoice-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 3px solid #007ec7;
            }
            .company-info {
                flex: 1;
            }
            .invoice-details {
                text-align: right;
                background: #007ec7;
                color: white;
                padding: 20px;
                border-radius: 5px;
            }
            .client-info {
                margin-bottom: 30px;
                padding: 25px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #007ec7;
            }
            .invoice-items {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                margin: 20px 0;
            }
            .invoice-items th {
                background: #007ec7;
                color: white;
                padding: 15px;
                text-align: left;
            }
            .invoice-items td {
                padding: 15px;
                border-bottom: 1px solid #eee;
            }
            .invoice-items tr:hover {
                background: #f8f9fa;
            }
            .invoice-totals {
                text-align: right;
                margin-top: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            .total-row {
                margin: 8px 0;
            }
            .grand-total {
                font-weight: bold;
                font-size: 1.3em;
                color: #007ec7;
                border-top: 2px solid #007ec7;
                padding-top: 15px;
                margin-top: 15px;
            }
            .notes {
                margin-top: 40px;
                padding: 25px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid #007ec7;
            }
        `,
        layout: `
            <div class="invoice-container">
                <div class="invoice-header">
                    <div class="company-info">
                        <h1 id="company-name">Company Name</h1>
                        <p id="company-address">Company Address</p>
                        <p id="company-contact">Email: <span id="company-email"></span> | Phone: <span id="company-phone"></span></p>
                        <p>NUIT: <span id="company-nuit"></span></p>
                    </div>
                    <div class="invoice-details">
                        <h2>INVOICE</h2>
                        <p>Invoice #: <span id="invoice-number"></span></p>
                        <p>Date: <span id="issue-date"></span></p>
                        <p>Due Date: <span id="due-date"></span></p>
                    </div>
                </div>
                
                <div class="client-info">
                    <h3>Bill To:</h3>
                    <p id="client-name">Client Name</p>
                    <p id="client-address">Client Address</p>
                    <p>NUIT: <span id="client-nuit"></span></p>
                    <p>Email: <span id="client-email"></span></p>
                    <p>Contact: <span id="client-contact"></span></p>
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
                    <tbody id="invoice-items-body">
                        <!-- Items will be inserted here -->
                    </tbody>
                </table>
                
                <div class="invoice-totals">
                    <div class="total-row">Subtotal: <span id="subtotal"></span></div>
                    <div class="total-row">VAT: <span id="total-vat"></span></div>
                    <div class="total-row">Discount: <span id="discount"></span></div>
                    <div class="total-row grand-total">Total: <span id="total"></span></div>
                </div>
                
                <div class="notes">
                    <h4>Notes:</h4>
                    <p id="notes"></p>
                </div>
            </div>
        `
    }
};

/**
 * Load a template by name
 * @param {string} templateName - The name of the template to load
 * @returns {Promise<string>} The template HTML content
 */
function loadTemplate(templateName) {
    const templateFile = TEMPLATE_PATHS[templateName] || 'template01.html'; // Default to classic
    
    // Load from root directory
    return fetch(templateFile)
        .then(response => {
            if (!response.ok) throw new Error('Template not found');
            return response.text();
        })
        .catch(error => {
            console.error('Error loading template:', error);
            return fallbackTemplate();
        });
}

/**
 * Fallback template in case loading fails
 * @returns {string} The fallback template HTML
 */
function fallbackTemplate() {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice</title>
            <style>
                body { font-family: 'Inter', sans-serif; line-height: 1.6; }
                .invoice-container { max-width: 800px; margin: 20px auto; padding: 20px; }
                .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
                .company-info { flex: 1; }
                .invoice-details { text-align: right; }
                .client-info { margin-bottom: 30px; }
                .invoice-items { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .invoice-items th, .invoice-items td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                .invoice-totals { text-align: right; margin-top: 30px; }
                .total-row { margin: 5px 0; }
                .grand-total { font-weight: bold; font-size: 1.2em; }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <div class="invoice-header">
                    <div class="company-info">
                        <h1 id="company-name">Company Name</h1>
                        <p id="company-address">Company Address</p>
                        <p id="company-contact">Email: <span id="company-email"></span> | Phone: <span id="company-phone"></span></p>
                        <p>NUIT: <span id="company-nuit"></span></p>
                    </div>
                    <div class="invoice-details">
                        <h2>INVOICE</h2>
                        <p>Invoice #: <span id="invoice-number"></span></p>
                        <p>Date: <span id="issue-date"></span></p>
                        <p>Due Date: <span id="due-date"></span></p>
                    </div>
                </div>
                
                <div class="client-info">
                    <h3>Bill To:</h3>
                    <p id="client-name">Client Name</p>
                    <p id="client-address">Client Address</p>
                    <p>NUIT: <span id="client-nuit"></span></p>
                    <p>Email: <span id="client-email"></span></p>
                    <p>Contact: <span id="client-contact"></span></p>
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
                    <tbody id="invoice-items-body">
                        <!-- Items will be inserted here -->
                    </tbody>
                </table>
                
                <div class="invoice-totals">
                    <div class="total-row">Subtotal: <span id="subtotal"></span></div>
                    <div class="total-row">VAT: <span id="total-vat"></span></div>
                    <div class="total-row">Discount: <span id="discount"></span></div>
                    <div class="total-row grand-total">Total: <span id="total"></span></div>
                </div>
                
                <div class="notes">
                    <h4>Notes:</h4>
                    <p id="notes"></p>
                </div>
                
                <div class="invoice-footer" style="margin-top: 40px; font-size: 0.9em; color: #666;">
                    <p>This invoice was generated using WALAKA Invoice Generator</p>
                    <p>Software Certification Number: <span id="software-cert-no"></span></p>
                    <p>Document Control Hash: <span id="invoice-hash"></span></p>
                </div>
            </div>
        </body>
        </html>
    `;
}

/**
 * Load company logo from settings
 * @returns {Promise<string>} The logo URL
 */
async function loadCompanyLogo() {
    try {
        const { data, error } = await supabase
            .from('settings')
            .select('company_logo')
            .single();
            
        if (error) throw error;
        return data.company_logo || '';
    } catch (error) {
        console.error('Error loading company logo:', error);
        return '';
    }
}

/**
 * Populate a template with invoice data
 * @param {Document} doc - The document to populate
 * @param {string} templateContent - The template HTML content
 * @param {Object} invoiceData - The invoice data to populate with
 */
async function populateTemplate(templateContent, invoiceData) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(templateContent, 'text/html');

    // Business Profile Information 
    setDataField(doc, 'company-name', invoiceData.company?.name || '');
    setDataField(doc, 'company-address', invoiceData.company?.address || '');
    setDataField(doc, 'company-email', invoiceData.company?.email || '');
    setDataField(doc, 'company-phone', invoiceData.company?.phone || '');
    setDataField(doc, 'company-nuit', invoiceData.company?.nuit || '');
    setDataField(doc, 'company-website', invoiceData.company?.website || '');

    // Invoice Details
    setDataField(doc, 'invoice-number', invoiceData.invoice_number || '');
    setDataField(doc, 'issue-date', formatDate(invoiceData.issue_date));
    setDataField(doc, 'due-date', formatDate(invoiceData.due_date));

    // Client Information
    setDataField(doc, 'client-name', invoiceData.client?.name || '');
    setDataField(doc, 'client-address', invoiceData.client?.address || '');
    setDataField(doc, 'client-nuit', invoiceData.client?.nuit || '');
    setDataField(doc, 'client-email', invoiceData.client?.email || '');
    setDataField(doc, 'client-contact', invoiceData.client?.phone || '');

    // Calculate totals
    const subtotal = calculateSubtotal(invoiceData.items || []);
    const totalVat = calculateVAT(subtotal);
    const total = subtotal + totalVat;

    // Totals with proper number formatting
    setDataField(doc, 'subtotal', formatCurrency(subtotal, invoiceData.currency));
    setDataField(doc, 'total-vat', formatCurrency(totalVat, invoiceData.currency));
    setDataField(doc, 'total', formatCurrency(total, invoiceData.currency));

    // Notes
    setDataField(doc, 'notes', invoiceData.notes || '');

    // Populate Items
    const itemsContainer = doc.getElementById('invoice-items-body');
    if (itemsContainer && invoiceData.items && Array.isArray(invoiceData.items)) {
        itemsContainer.innerHTML = invoiceData.items.map(item => `
            <tr>
                <td>${item.description || ''}</td>
                <td>${item.quantity || 1}</td>
                <td>${formatCurrency(item.price, invoiceData.currency)}</td>
                <td>${item.vat}%</td>
                <td>${formatCurrency(item.total, invoiceData.currency)}</td>
            </tr>
        `).join('');
    }

    return doc.documentElement.outerHTML;
}

function setDataField(doc, id, value) {
    const element = doc.getElementById(id);
    if (element) {
        element.textContent = value || '';
    }
}

/**
 * Generate invoice HTML from data
 * @param {string} invoiceId - The ID of the invoice
 * @returns {Promise<string>} The generated HTML
 */
async function generateInvoiceHTML(invoiceId) {
    try {
        // Fetch invoice data from Supabase
        const invoiceData = await fetchInvoiceData(invoiceId);
        
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
            // Client info
            client: {
                name: invoiceData.client?.customer_name || 'Client Name',
                address: invoiceData.client?.address || '',
                nuit: invoiceData.client?.customer_tax_id || '',
                email: invoiceData.client?.email || '',
                contact: invoiceData.client?.contact || '',
                phone: invoiceData.client?.telephone || '',
                city: invoiceData.client?.city || '',
                postal_code: invoiceData.client?.postal_code || '',
                province: invoiceData.client?.province || '',
                country: invoiceData.client?.country || ''
            },
            // Items - now using product data structure
            items: (invoiceData.items || []).map(item => ({
                description: item.description || '',
                quantity: item.quantity || 1,
                price: item.unit_price || 0,
                vat: item.vat_rate || 0,
                total: item.total || (item.unit_price * (1 + (item.vat_rate / 100)))
            })),
            // Currency
            currency: invoiceData.currency || 'MZN'
        };
        
        // Get selected template
        const selectedTemplate = await window.invoiceTemplateManager.getSelectedTemplate();
        const template = TEMPLATES[selectedTemplate] || TEMPLATES['classic'];
        
        // Create the full HTML document with styles
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invoice ${formattedData.invoice.number}</title>
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
        return await populateTemplate(html, formattedData);
    } catch (error) {
        console.error('Error generating invoice HTML:', error);
        throw error;
    }
}

/**
 * Preview invoice in modal
 * @param {Object} invoiceData - The invoice data to preview
 * @returns {Promise<void>}
 */
async function previewInvoice(invoiceData) {
    try {
        // Ensure we have a numeric ID
        const invoiceId = typeof invoiceData === 'object' ? invoiceData.id : invoiceData;
        if (!invoiceId || typeof invoiceId !== 'number') {
            throw new Error('Invalid invoice ID provided');
        }
        const html = await generateInvoiceHTML(invoiceId);
        const previewContainer = document.getElementById('invoicePreviewContent');
        if (previewContainer) {
            previewContainer.innerHTML = html;
        }
    } catch (error) {
        console.error('Error previewing invoice:', error);
        throw error;
    }
}

/**
 * Preview a template
 * @param {string} templateName - The name of the template to preview
 * @returns {Promise<void>}
 */
async function previewTemplate(templateName) {
    try {
        const template = TEMPLATES[templateName] || TEMPLATES['classic'];
        const previewContainer = document.getElementById('template-preview-container');
        
        if (!previewContainer) return;
        
        // Create iframe for preview
        const iframe = document.createElement('iframe');
        previewContainer.innerHTML = '';
        previewContainer.appendChild(iframe);
        
        // Write template content to iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Template Preview</title>
                <style>
                    ${template.styles}
                </style>
            </head>
            <body>
                ${template.layout}
            </body>
            </html>
        `);
        iframeDoc.close();
        
        // Populate template with preview data
        await populateTemplate(iframeDoc, TEMPLATE_PREVIEW_DATA);
        
        // Adjust iframe height to content
        iframe.style.height = iframeDoc.body.scrollHeight + 'px';
    } catch (error) {
        console.error('Error previewing template:', error);
    }
}

/**
 * Save template selection
 * @param {string} templateName - The name of the selected template
 */
function saveTemplateSelection(templateName) {
    localStorage.setItem('selectedInvoiceTemplate', templateName);
}

/**
 * Get selected template
 * @returns {string} The name of the selected template
 */
function getSelectedTemplate() {
    return localStorage.getItem('selectedInvoiceTemplate') || 'classic';
}

// Export functions for external use
window.invoiceTemplateManager = {
    TEMPLATES,
    generateInvoiceHTML,
    populateTemplate,
    previewInvoice,
    previewTemplate,
    getSelectedTemplate: async function() {
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session || !session.user) return 'classic';

            const { data: invoiceData } = await window.supabase
                .from('invoice_settings')
                .select('template')
                .eq('user_id', session.user.id)
                .single();

            return invoiceData?.template || 'classic';
        } catch (error) {
            console.error('Error getting template:', error);
            return 'classic';
        }
    },
    saveTemplateSelection: async function(template) {
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session || !session.user) return;

            await window.supabase
                .from('invoice_settings')
                .upsert({
                    user_id: session.user.id,
                    template: template
                }, { onConflict: 'user_id' });
        } catch (error) {
            console.error('Error saving template:', error);
        }
    }
};
