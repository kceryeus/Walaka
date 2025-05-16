// Map template names to file paths 
const TEMPLATE_PATHS = {
    'classic': 'template01.html',
    'modern': 'template02.html',
    'minimal': 'template03.html', 
    'tester': 'template04.html'
};

/**
 * Load a template by name
 * @param {string} templateName - The name of the template to load
 * @returns {Promise<string>} The template HTML content
 */
function loadTemplate(templateName) {
    const templateFile = TEMPLATE_PATHS[templateName] || 'template01.html'; // Default to classic
    
    // Load from templates directory
    return fetch(`templates/${templateFile}`)
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

    // Convert string values to numbers for calculations
    const subtotal = parseFloat(invoiceData.subtotal) || 0;
    const totalVat = parseFloat(invoiceData.totalVat) || 0;
    const discount = parseFloat(invoiceData.discount) || 0;
    const total = parseFloat(invoiceData.total) || 0;

    // Company Information 
    setDataField(doc, 'company-name', invoiceData.company_name);
    setDataField(doc, 'company-address', invoiceData.company_address);
    setDataField(doc, 'company-email', invoiceData.company_email);
    setDataField(doc, 'company-phone', invoiceData.company_phone);
    setDataField(doc, 'company-nuit', invoiceData.company_nuit);

    // Invoice Details
    setDataField(doc, 'invoice-number', invoiceData.invoiceNumber);
    setDataField(doc, 'issue-date', invoiceData.issueDate);
    setDataField(doc, 'due-date', invoiceData.dueDate);
    setDataField(doc, 'project-name', invoiceData.projectName);

    // Client Information
    setDataField(doc, 'client-name', invoiceData.clientName);
    setDataField(doc, 'client-address', invoiceData.clientAddress);
    setDataField(doc, 'client-nuit', invoiceData.clientTaxId);
    setDataField(doc, 'client-email', invoiceData.clientEmail);
    setDataField(doc, 'client-contact', invoiceData.client_contact);

    // Totals with proper number formatting
    setDataField(doc, 'subtotal', `${invoiceData.currency} ${subtotal.toFixed(2)}`);
    setDataField(doc, 'totalVat', `${invoiceData.currency} ${totalVat.toFixed(2)}`);
    setDataField(doc, 'discount', `${invoiceData.currency} ${discount.toFixed(2)}`);
    setDataField(doc, 'total', `${invoiceData.currency} ${total.toFixed(2)}`);

    // Notes
    setDataField(doc, 'notes', invoiceData.notes);

    // Populate Items
    const itemsContainer = doc.getElementById('invoice-items');
    if (itemsContainer && invoiceData.items) {
        itemsContainer.innerHTML = invoiceData.items.map(item => `
            <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${invoiceData.currency} ${parseFloat(item.price).toFixed(2)}</td>
                <td>${parseFloat(item.vat).toFixed(2)}%</td>
                <td>${invoiceData.currency} ${parseFloat(item.total).toFixed(2)}</td>
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
 * @param {Object} invoiceData - The invoice data
 * @returns {Promise<string>} The generated HTML
 */
async function generateInvoiceHTML(invoiceData) {
    try {
        // Get selected template
        const selectedTemplate = localStorage.getItem('selectedInvoiceTemplate') || 'classic';
        const templatePath = TEMPLATE_PATHS[selectedTemplate];

        // Load template
        const response = await fetch(`/templates/${templatePath}`);
        if (!response.ok) throw new Error('Template not found');
        
        const templateContent = await response.text();
        
        // Populate template with data
        return await populateTemplate(templateContent, invoiceData);
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
        // Load template based on selected template or default
        const templateName = invoiceData.template?.name || 'template01';
        const templateContent = await loadTemplate(templateName);
        
        // Create temporary container
        const container = document.createElement('div');
        container.innerHTML = templateContent;
        
        // Populate template with data
        populateTemplate(container, templateContent, invoiceData);
        
        // Insert into preview container
        const previewContainer = document.getElementById('invoicePreviewContent');
        if (previewContainer) {
            previewContainer.innerHTML = '';
            previewContainer.appendChild(container);
        }
        
    } catch (error) {
        console.error('Error previewing invoice:', error);
    }
}

// Export functions for external use
window.invoiceTemplateManager = {
    loadTemplate,
    generateInvoiceHTML,
    populateTemplate,
    previewInvoice
};
