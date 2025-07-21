
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
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('pt-PT', { month: 'long' });
    const year = date.getFullYear();
    // Capitalize month and use hyphens
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    return `${day}-${monthCap}-${year}`;
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
            /*
             * IMPORTANT: The .invoice-container width and centering must match the PDF.js logic.
             * If you change max-width or margins here, update PDF.js comments and logic as well.
             * Recommended max-width: 700px for A4 PDF compatibility.
             */
            .invoice-container {
                max-width: 700px; /* Keep in sync with PDF.js for A4 */
                margin-left: auto;
                margin-right: auto;
                margin-top: 20px;
                margin-bottom: 20px;
                padding: 20px;
                font-family: 'Inter', sans-serif;
                color: #000000;
                background: #fff;
                box-sizing: border-box;
            }
            .invoice-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
                border-bottom: 2px solid #eee;
                padding-bottom: 20px;
                font-size: 0.85em;
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
                font-size: 0.85em;
            }
            .invoice-items {
                width: 100%;
                max-width: 100%;
                table-layout: fixed;
                font-size: 0.75em; /* 25% smaller */
            }
            .invoice-items th,
            .invoice-items td {
                padding: 8px;
                border-bottom: 1px solid #eee;
                word-break: break-word;
                font-size: 0.80em; /* 25% smaller */
            }
            .invoice-items th {
                background: #f5f5f5;
                padding: 12px 8px;
                text-align: left;
            }
            .invoice-items td {
                padding: 8px;
            }
            /* Adjust column widths */
            .invoice-items th:nth-child(1),
            .invoice-items td:nth-child(1) { /* Description */
                width: 30%;
            }
            .invoice-items th:nth-child(2),
            .invoice-items td:nth-child(2) { /* Quantity */
                width: 10%;
            }
            .invoice-items th:nth-child(3),
            .invoice-items td:nth-child(3) { /* Unit Price */
                width: 10%;
            }
            .invoice-items th:nth-child(4),
            .invoice-items td:nth-child(4) { /* Discount Type */
                width: 10%;
            }
            .invoice-items th:nth-child(5),
            .invoice-items td:nth-child(5) { /* Discount */
                width: 10%;
            }
            .invoice-items th:nth-child(6),
            .invoice-items td:nth-child(6) { /* Discounted Subtotal */
                width: 10%;
            }
            .invoice-items th:nth-child(7),
            .invoice-items td:nth-child(7) { /* VAT */
                width: 10%;
            }
            .invoice-items th:nth-child(8),
            .invoice-items td:nth-child(8) { /* Total */
                width: 10%;
            }
            .invoice-totals {
                text-align: right;
                margin-top: 30px;
                font-size: 0.85em;
            }
            .total-row {
                margin: 5px 0;
            }
            .grand-total {
                font-weight: bold;
                font-size: 0.90em;
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
                        <h1 id="company-name">Nome da Empresa</h1>
                        <p id="company-address">Endereço da Empresa</p>
                        <p id="company-contact">Email: <span id="company-email"></span> | Telefone: <span id="company-phone"></span></p>
                        <p>NUIT: <span id="company-nuit"></span></p>
                    </div>
                    <div class="invoice-details">
                        <h2>FACTURA</h2>
                        <p>Nº Fatura: <span id="invoice-number">{{invoiceNumber}}</span></p>
                        <p>Data de Emissão: <span id="issue-date"></span></p>
                        <p>Data de Vencimento: <span id="due-date"></span></p>
                        <p id="currency-field"></p> <!-- Moeda: MZN (Currency: MZN) -->
                    </div>
                </div>
                
                <div class="client-info">
                    <h3>Cliente:</h3>
                    <p id="client-name">Nome do Cliente</p>
                    <p id="client-address">Endereço do Cliente</p>
                    <p>NUIT: <span id="client-nuit"></span></p>
                    <p>Email: <span id="client-email"></span></p>
                    <p>Contacto: <span id="client-contact"></span></p>
                </div>
                
                <!-- Items Table Placeholder -->
                <div id="invoice-items-body"></div>
               
                <div class="invoice-totals">
                </div>
                
                <div class="notes">
                    <h4>Observações:</h4>
                    <p id="notes"></p>
                </div>
            </div>
        `
    },
    'modern': {
        name: 'Modern',
        styles: `
            /*
             * IMPORTANT: The .invoice-container width and centering must match the PDF.js logic.
             * If you change max-width or margins here, update PDF.js comments and logic as well.
             * Recommended max-width: 700px for A4 PDF compatibility.
             */
            .invoice-container {
                max-width: 700px; /* Keep in sync with PDF.js for A4 */
                margin-left: auto;
                margin-right: auto;
                margin-top: 20px;
                margin-bottom: 20px;
                padding: 30px;
                font-family: 'Inter', sans-serif;
                background: white;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
                border-radius: 10px;
                box-sizing: border-box;
                color: #000000;
                font-size: 1em; /* Match classic base font size */
            }
            .invoice-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 3px solid {{accentColor}};
                font-size: 0.85em; /* Match classic table font size */
            }
            .company-info {
                flex: 1;
            }
            .invoice-details {
                text-align: right;
                background: {{accentColor}};
                color: white;
                padding: 20px;
                border-radius: 5px;
            }
            .client-info {
                margin-bottom: 30px;
                padding: 25px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid {{accentColor}};
                font-size: 0.80em; /* Match classic table font size */
            }
            .invoice-items {
                width: 100%;
                max-width: 100%;
                margin: 0 auto;
                box-sizing: border-box;
                border-spacing: 0;
                font-size: 0.75em; /* Match classic table font size */
            }
            .invoice-items th,
            .invoice-items td {
                padding: 8px;
                border-bottom: 1px solid #eee;
                word-break: break-word;
                font-size: 0.80em; /* 25% smaller */
            }
            .invoice-items th {
                background: {{accentColor}};
                color: white;
                padding: 12px 8px;
                text-align: left;
            }
            .invoice-items td {
                padding: 8px;
            }
            .invoice-items tr:hover {
                background: #f8f9fa;
            }
            /* Column widths and alignment */
            .invoice-items th:nth-child(1), .invoice-items td:nth-child(1) { width: 25%; text-align: left; } /* Descrição */
            .invoice-items th:nth-child(2), .invoice-items td:nth-child(2) { width: 5%; text-align: right; } /* Qtd. */
            .invoice-items th:nth-child(3), .invoice-items td:nth-child(3) { width: 12%; text-align: right; } /* Preço Unit. */
            .invoice-items th:nth-child(4), .invoice-items td:nth-child(4) { width: 8%; text-align: right; } /* Discount Type */
            .invoice-items th:nth-child(5), .invoice-items td:nth-child(5) { width: 10%; text-align: right; } /* Discount */
            .invoice-items th:nth-child(6), .invoice-items td:nth-child(6) { width: 15%; text-align: right; } /* Subtotal */
            .invoice-items th:nth-child(7), .invoice-items td:nth-child(7) { width: 10%; text-align: right; } /* VAT */
            .invoice-items th:nth-child(8), .invoice-items td:nth-child(8) { width: 15%; text-align: right; } /* Total */
            .invoice-totals {
                text-align: right;
                margin-top: 30px;
                padding: 20px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            .total-row {
                margin: 8px 0;
                font-size: 0.80em; /* Match classic table font size */
            }
            .grand-total {
                font-weight: bold;
                font-size: 1.0em;
                color: {{accentColor}};
                border-top: 2px solid {{accentColor}};
                padding-top: 15px;
                margin-top: 15px;
                font-size: 0.85em; /* Match classic table font size */
            }
            .notes {
                margin-top: 40px;
                padding: 25px;
                background: #f8f9fa;
                border-radius: 8px;
                border-left: 4px solid {{accentColor}};
            }
        `,
        layout: `
            <div class="invoice-container">
                <div class="invoice-header">
                    <div class="company-info">
                        <h1 id="company-name">Nome da Empresa</h1>
                        <p id="company-address">Endereço da Empresa</p>
                        <p id="company-contact">Email: <span id="company-email"></span> | Telefone: <span id="company-phone"></span></p>
                        <p>NUIT: <span id="company-nuit"></span></p>
                    </div>
                    <div class="invoice-details">
                        <h2>FACTURA</h2>
                        <p>Nº Fatura: <span id="invoice-number">{{invoiceNumber}}</span></p>
                        <p>Data de Emissão: <span id="issue-date"></span></p>
                        <p>Data de Vencimento: <span id="due-date"></span></p>
                        <p id="currency-field"></p> <!-- Moeda: MZN (Currency: MZN) -->
                    </div>
                </div>
                
                <div class="client-info">
                    <h3>Cliente:</h3>
                    <p id="client-name">Nome do Cliente</p>
                    <p id="client-address">Endereço do Cliente</p>
                    <p>NUIT: <span id="client-nuit"></span></p>
                    <p>Email: <span id="client-email"></span></p>
                    <p>Contacto: <span id="client-contact"></span></p>
                </div>
                
                <!-- Items Table Placeholder -->
                <div id="invoice-items-body"></div>
                
                <div class="invoice-totals">
                </div>
                
                <div class="notes">
                    <h4>Observações:</h4>
                    <p id="notes"></p>
                </div>
            </div>
        `
    },
    /*
    'standard': {
        name: 'Standard',
        styles: `
            .invoice-container {
                max-width: 900px;
                margin: 32px auto 0 auto;
                background: #fff;
                color: #23272f;
                font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
                border-radius: 14px;
                box-shadow: 0 2px 16px rgba(30,40,90,0.08);
                box-sizing: border-box;
                overflow: hidden;
            }
            .invoice-header-row {
                display: flex;
                align-items: flex-start;
                padding: 32px 36px 0 36px;
                gap: 32px;
            }
            .company-logo {
                max-width: 90px;
                max-height: 60px;
                margin-bottom: 8px;
                border-radius: 7px;
                background: #f6f8fa;
                padding: 4px;
                box-shadow: 0 1px 4px rgba(0,0,0,0.04);
            }
            .company-info h1 {
                font-size: 1.35em;
                font-weight: 700;
                margin: 0 0 4px 0;
            }
            .company-info p {
                margin: 0;
                font-size: 0.98em;
                color: #6b7280;
            }
            .invoice-meta {
                flex: 1;
                text-align: right;
                font-size: 0.98em;
                margin-top: 6px;
            }
            .invoice-meta p {
                margin: 0 0 4px 0;
            }
            .invoice-meta .meta-label {
                color: #6b7280;
                font-size: 0.92em;
            }
            .invoice-bill-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                padding: 0 36px 0 36px;
                margin-top: 10px;
                margin-bottom: 0;
            }
            .bill-to {
                flex: 1;
                font-size: 0.98em;
            }
            .bill-to .bill-label {
                font-weight: 600;
                letter-spacing: 0.5px;
                color: #23272f;
                margin-bottom: 2px;
                font-size: 0.95em;
            }
            .bill-to p {
                margin: 0;
                color: #23272f;
            }
            .invoice-meta-block {
                flex: 1;
                text-align: right;
                font-size: 0.98em;
            }
            .info-bar {
                display: flex;
                width: 100%;
                margin: 24px 0 0 0;
                border-radius: 0 0 8px 8px;
                overflow: hidden;
                font-size: 0.98em;
                font-weight: 500;
                background: #f8fafc;
            }
            .info-bar .info-box {
                flex: 1;
                padding: 12px 0 12px 0;
                text-align: center;
                background: #f8fafc;
                color: #23272f;
                border-right: 1px solid #e5e7eb;
            }
            .info-bar .info-box:last-child {
                border-right: none;
            }
            .info-bar .info-label {
                display: block;
                font-size: 0.92em;
                color: #6b7280;
                margin-bottom: 1px;
            }
            .info-bar .info-value {
                font-size: 1.08em;
                font-weight: 600;
            }
            .info-bar .total-due {
                background: #23272f;
                color: #fff;
                font-size: 1.12em;
                font-weight: 700;
            }
            .invoice-items {
                width: 100%;
                border-collapse: collapse;
                margin: 18px 0 0 0;
                font-size: 0.97em;
            }
            .invoice-items th, .invoice-items td {
                padding: 8px 6px;
                border-bottom: 1px solid #e5e7eb;
                word-break: break-word;
            }
            .invoice-items th {
                background: #f6f8fa;
                color: #23272f;
                text-align: left;
                font-weight: 600;
                letter-spacing: 0.5px;
                font-size: 0.97em;
            }
            .invoice-totals {
                text-align: right;
                margin: 18px 36px 0 0;
                font-size: 1em;
            }
            .invoice-totals .totals-row {
                margin: 0 0 2px 0;
            }
            .invoice-totals .totals-row.italic {
                font-style: italic;
                color: #6b7280;
                font-size: 0.93em;
            }
            .grand-total {
                font-weight: bold;
                font-size: 1.08em;
                border-top: 2px solid #23272f;
                padding-top: 8px;
                color: #23272f;
            }
            .signature-row {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                margin: 32px 36px 0 0;
                min-height: 40px;
            }
            .signature-label {
                font-size: 0.98em;
                font-weight: 600;
                color: #23272f;
                margin-bottom: 2px;
            }
            #issued-by-name {
                font-size: 0.97em;
                color: #23272f;
                font-weight: 400;
                margin-top: 2px;
            }
            .notes {
                margin: 18px 36px 0 36px;
                padding: 10px 16px;
                background: #f6f8fa;
                border-radius: 7px;
                color: #23272f;
                font-size: 0.97em;
            }
            .footer-bar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: #23272f;
                color: #fff;
                padding: 12px 36px;
                font-size: 0.97em;
                border-radius: 0 0 12px 12px;
                position: fixed;
                left: 0;
                bottom: 0;
                width: 100vw;
                z-index: 100;
            }
            .footer-bar .footer-section {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .footer-bar .footer-section i {
                margin-right: 4px;
            }
        `,
        layout: `
            <div class="invoice-container">
                <div class="invoice-header-row">
                    <div class="company-info">
                        <img id="company-logo" class="company-logo" style="display:none;"/>
                        <h1 id="company-name">Nome da Empresa</h1>
                        <p id="company-address">Endereço da Empresa</p>
                        <p id="company-contact">Email: <span id="company-email"></span> | Telefone: <span id="company-phone"></span></p>
                        <p>NUIT: <span id="company-nuit"></span></p>
                    </div>
                    <div class="invoice-meta">
                        <p><span class="meta-label">Tax invoice</span></p>
                    </div>
                </div>
                <div class="invoice-bill-row">
                    <div class="bill-to">
                        <div class="bill-label">BILL TO</div>
                        <p id="client-name">Nome do Cliente</p>
                        <p id="client-address">Endereço do Cliente</p>
                    </div>
                    <div class="invoice-meta-block">
                        <p>Issue date: <span id="issue-date"></span></p>
                        <p>Due date: <span id="due-date"></span></p>
                        <p>Reference: <span id="invoice-number">{{invoiceNumber}}</span></p>
                    </div>
                </div>
                <div class="info-bar">
                    <div class="info-box">
                        <span class="info-label">Invoice No.</span>
                        <span class="info-value" id="invoice-number">{{invoiceNumber}}</span>
                    </div>
                    <div class="info-box">
                        <span class="info-label">Issue date</span>
                        <span class="info-value" id="issue-date"></span>
                    </div>
                    <div class="info-box">
                        <span class="info-label">Due date</span>
                        <span class="info-value" id="due-date"></span>
                    </div>
                    <div class="info-box total-due">
                        <span class="info-label">Total due (<span id="currency-field"></span>)</span>
                        <span class="info-value" id="grand-total"></span>
                    </div>
                </div>
                <div id="invoice-items-body"></div>
                <div class="invoice-totals"></div>
                <div class="signature-row">
                    <span class="signature-label">Issued by:</span>
                    <span id="issued-by-name"></span>
                </div>
                <div class="notes">
                    <h4>Observações:</h4>
                    <p id="notes"></p>
                </div>
            </div>
            <div class="footer-bar">
                <div class="footer-section">
                    <i class="fas fa-phone"></i> <span id="footer-phone">+258 XX XXX XXXX</span>
                </div>
                <div class="footer-section">
                    <i class="fas fa-globe"></i> <span id="footer-website">www.yourbusiness.com</span>
                </div>
                <div class="footer-section">
                    <i class="fas fa-envelope"></i> <span id="footer-email">info@yourbusiness.com</span>
                </div>
            </div>
        `
    },
    'minimalist': {
        name: 'Minimalist',
        styles: `
            .invoice-container {
                max-width: 700px;
                margin: 40px auto;
                padding: 0;
                font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
                background: #fff;
                color: #23272f;
                border-radius: 12px;
                box-shadow: 0 2px 16px rgba(30,40,90,0.07);
                box-sizing: border-box;
                border: 1.5px solid #e5e7eb;
            }
            .invoice-header {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                padding: 32px 32px 0 32px;
                border-bottom: none;
                background: none;
            }
            .company-info {
                margin-bottom: 12px;
            }
            .company-info h1 {
                font-size: 2em;
                font-weight: 700;
                margin: 0 0 4px 0;
            }
            .company-info p {
                margin: 0;
                font-size: 1em;
                color: #6b7280;
            }
            .invoice-details {
                align-self: flex-end;
                text-align: right;
                margin-top: -48px;
                margin-bottom: 12px;
                background: #f3f4f6;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 1.05em;
                box-shadow: 0 1px 4px rgba(30,40,90,0.04);
            }
            .invoice-details h2 {
                margin: 0 0 8px 0;
                font-size: 1.2em;
                color: #23272f;
                letter-spacing: 1px;
            }
            .client-info, #client-info-placeholder {
                margin: 0 32px 0 32px;
                margin-top: 24px;
                padding: 0;
                background: none;
                border-radius: 0;
                font-size: 1em;
                color: #23272f;
            }
            .client-info h3 {
                margin-bottom: 4px;
                font-size: 1.1em;
                font-weight: 600;
            }
            .invoice-items {
                width: 100%;
                border-collapse: collapse;
                margin: 32px 0 0 0;
                font-size: 1em;
            }
            .invoice-items th, .invoice-items td {
                padding: 10px 6px;
                border-bottom: 1px solid #e5e7eb;
                word-break: break-word;
            }
            .invoice-items th {
                background: #f3f4f6;
                color: #23272f;
                text-align: left;
                font-weight: 500;
                letter-spacing: 0.5px;
            }
            .invoice-totals {
                text-align: right;
                margin: 32px 32px 0 0;
                font-size: 1.08em;
            }
            .grand-total {
                font-weight: bold;
                font-size: 1.12em;
                border-top: 2px solid #e5e7eb;
                padding-top: 10px;
                color: #23272f;
            }
            .notes {
                margin: 32px 32px 32px 32px;
                padding: 12px 18px;
                background: #f3f4f6;
                border-radius: 6px;
                color: #23272f;
                font-size: 1em;
            }
        `,
        layout: `
            <div class="invoice-container">
                <div class="invoice-header">
                    <div class="company-info">
                        <h1 id="company-name">Nome da Empresa</h1>
                        <p id="company-address">Endereço da Empresa</p>
                        <p id="company-contact">Email: <span id="company-email"></span> | Telefone: <span id="company-phone"></span></p>
                        <p>NUIT: <span id="company-nuit"></span></p>
                    </div>
                    <div class="invoice-details">
                        <h2>FACTURA</h2>
                        <p>Nº Fatura: <span id="invoice-number">{{invoiceNumber}}</span></p>
                        <p>Data de Emissão: <span id="issue-date"></span></p>
                        <p>Data de Vencimento: <span id="due-date"></span></p>
                        <p id="currency-field"></p>
                    </div>
                </div>
                <div id="client-info-placeholder"></div>
                <div id="invoice-items-body"></div>
                <div class="invoice-totals"></div>
                <div class="notes">
                    <h4>Observações:</h4>
                    <p id="notes"></p>
                </div>
            </div>
        `
    }
    */
};

/**
 * Load a template by name
 * @param {string} templateName - The name of the template to load
 * @returns {Promise<string>} The template HTML content
 */
function loadTemplate(templateName) {
    // First try to get the requested template
    const template = TEMPLATES[templateName];
    
    // If template not found, fallback to classic template
    if (!template) {
        console.warn(`Template ${templateName} not found, using classic template`);
        return Promise.resolve(TEMPLATES['classic']);
    }

    return Promise.resolve(template);
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

    // --- LOGO HANDLING FOR STANDARD TEMPLATE ---
    const isStandard = doc.querySelector('#company-logo') !== null;
    if (isStandard) {
        // Try to get logo from invoiceData or load from settings
        let logoUrl = invoiceData.company?.logo;
        if (!logoUrl) {
            try {
                logoUrl = await loadCompanyLogo();
            } catch {}
        }
        const logoImg = doc.getElementById('company-logo');
        if (logoImg) {
            if (logoUrl) {
                logoImg.src = logoUrl;
                logoImg.style.display = 'block';
            } else {
                logoImg.style.display = 'none';
            }
        }
    }

    // Invoice Details
    let displayInvoiceNumber = invoiceData.invoice?.displayNumber || null;
    if (!displayInvoiceNumber) {
        let serie = invoiceData.invoice?.serie || invoiceData.serie || '';
        let invoiceNumber = invoiceData.invoice?.number || invoiceData.invoice_number || 'Factura Rascunho';
        if (serie && invoiceNumber && !(`${invoiceNumber}`.startsWith(`${serie}/`))) {
            displayInvoiceNumber = `${serie}/${invoiceNumber}`;
        } else {
            displayInvoiceNumber = invoiceNumber || serie || 'Factura Rascunho';
        }
    }
    setDataField(doc, 'invoice-number', displayInvoiceNumber);
    setDataField(doc, 'issue-date', formatDate(invoiceData.invoice?.issueDate || invoiceData.issue_date));
    setDataField(doc, 'due-date', formatDate(invoiceData.invoice?.dueDate || invoiceData.due_date));
    setDataField(doc, 'currency-field', `Moeda: ${invoiceData.currency || 'MZN'}`);

    // --- CLIENT INFO HANDLING ---
    const isMinimalist = doc.getElementById('client-info-placeholder') !== null;
    if (isMinimalist) {
        // Minimalist: only show client info if any client field is present, else show 'Consumidor Final'
        const client = invoiceData.client || {};
        const hasClient = !!(
            client.name || client.address || client.nuit || client.email || client.contact || client.phone
        );
        const placeholder = doc.getElementById('client-info-placeholder');
        if (placeholder) {
            if (hasClient) {
                placeholder.innerHTML = `
                    <div class="client-info">
                        <h3>Cliente:</h3>
                        <p>${client.name || ''}</p>
                        <p>${client.address || ''}</p>
                        <p>NUIT: <span>${client.nuit || ''}</span></p>
                        <p>Email: <span>${client.email || ''}</span></p>
                        <p>Contacto: <span>${client.contact || client.phone || ''}</span></p>
                    </div>
                `;
            } else {
                placeholder.innerHTML = `
                    <div class="client-info">
                        <h3>Cliente:</h3>
                        <p>Consumidor Final</p>
                    </div>
                `;
            }
        }
    } else {
        // All other templates: set client fields as before
        setDataField(doc, 'client-name', invoiceData.client?.name || invoiceData.client_name || '');
        setDataField(doc, 'client-address', invoiceData.client?.address || invoiceData.client_address || '');
        setDataField(doc, 'client-nuit', invoiceData.client?.nuit || invoiceData.client_nuit || '');
        setDataField(doc, 'client-email', invoiceData.client?.email || invoiceData.client_email || '');
        setDataField(doc, 'client-contact', invoiceData.client?.phone || invoiceData.client_contact || '');
    }

    // Calculate totals
    const subtotal = Number(invoiceData.subtotal || 0);
    const discountAmount = Number(invoiceData.discountAmount || 0);
    const discountType = invoiceData.discountType || 'none';
    const discountValue = invoiceData.discountValue || 0;
    // Get all items for PDF generation (including paginated items)
    let allItems = invoiceData.items || [];
    
    // If we have pagination info, get all items from the pagination module
    if (window.invoiceItemsPagination && typeof window.invoiceItemsPagination.getAllItemsForPDF === 'function') {
        const paginatedItems = window.invoiceItemsPagination.getAllItemsForPDF();
        if (paginatedItems.length > 0) {
            // Convert DOM elements to item data
            allItems = paginatedItems.map(row => {
                const description = row.querySelector('.item-description')?.value || '';
                const quantity = parseAmount(row.querySelector('.item-quantity')?.value) || 0;
                const price = parseAmount(row.querySelector('.item-price')?.value) || 0;
                const discountType = row.querySelector('.item-discount-type')?.value || 'none';
                const discountValue = parseAmount(row.querySelector('.item-discount-value')?.value) || 0;
                const discountedSubtotal = parseAmount(row.querySelector('.item-discounted-subtotal')?.textContent) || 0;
                const vat = parseAmount(row.querySelector('.item-vat')?.textContent) || 0;
                const total = parseAmount(row.querySelector('.item-total')?.textContent) || 0;
                
                return {
                    description,
                    quantity,
                    price,
                    discountType,
                    discountValue,
                    discountedSubtotal,
                    vat,
                    total
                };
            }).filter(item => item.description && item.quantity > 0);
        }
    }

    // Always recalculate subtotalAfterDiscount from allItems
    const subtotalAfterDiscount = allItems && allItems.length > 0
        ? allItems.reduce((sum, item) => sum + (item.discountedSubtotal !== undefined ? item.discountedSubtotal : (item.discounted_subtotal !== undefined ? item.discounted_subtotal : ((item.quantity || 1) * (item.unit_price ?? item.price ?? 0)))), 0)
        : 0;
    // Always recalculate grandTotal from allItems
    const grandTotal = allItems && allItems.length > 0
        ? allItems.reduce((sum, item) => sum + (item.total !== undefined ? item.total : 0), 0)
        : 0;
    // Always recalculate totalVat from allItems
    const totalVat = allItems && allItems.length > 0
        ? allItems.reduce((sum, item) => sum + (item.vat !== undefined ? item.vat : (item.vat_amount !== undefined ? item.vat_amount : 0)), 0)
        : 0;
    const total = Number(invoiceData.total || 0);
    let hasExempt = false;

    // Calculate if any item has a discount and if all discounts are the same
    let anyItemHasDiscount = false;
    let allDiscountTypes = new Set();
    let allDiscountValues = new Set();
    let totalDiscountAmount = 0;
    if (allItems && allItems.length > 0) {
        allItems.forEach(item => {
            const type = item.discountType || item.discount_type || 'none';
            const value = item.discountValue !== undefined ? item.discountValue : (item.discount_value !== undefined ? item.discount_value : 0);
            if (type !== 'none' && value > 0) anyItemHasDiscount = true;
            allDiscountTypes.add(type);
            allDiscountValues.add(value);
            // Calculate per-item discount
            let itemDiscount = 0;
            if (type === 'percent') {
                itemDiscount = (item.price || item.unit_price || 0) * (item.quantity || 1) * (value / 100);
            } else if (type === 'fixed') {
                itemDiscount = value;
            }
            totalDiscountAmount += itemDiscount;
        });
    }

    // Populate Items (with VAT asterisk for exempt)
    const itemsContainer = doc.getElementById('invoice-items-body');
    // PDF PAGINATION: Split items into groups of 10, each group is a table with headers, with a page break after each except the last
    let vatExemptionFootnote = '';
    if (itemsContainer && allItems && Array.isArray(allItems)) {
        let paginatedHtml = '';
        const itemsPerPage = 10;
        const totalPages = Math.ceil(allItems.length / itemsPerPage) || 1;
        for (let page = 0; page < totalPages; page++) {
            const i = page * itemsPerPage;
            const pageItems = allItems.slice(i, i + itemsPerPage);
            paginatedHtml += `
                <table class="invoice-items" style="width:100%;border-collapse:collapse;margin-bottom:16px;">
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th>Qtd.</th>
                            <th>Preço Unit.</th>
                            <th style="min-width:60px;">Desconto</th>
                            <th style="min-width:60px;">Subtotal</th>
                            <th>IVA</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pageItems.map(item => {
                            // Discount display: value + unit
                            let discountDisplay = '—';
                            const type = item.discount_type || item.discountType;
                            const value = item.discount_value !== undefined ? item.discount_value : (item.discountValue !== undefined ? item.discountValue : null);
                            if (type === 'percent' && value) discountDisplay = `${value} %`;
                            else if (type === 'fixed' && value) discountDisplay = `${value} MT`;
                            else if (type === 'none' || !value) discountDisplay = '—';

                            // Mark VAT-exempt items with asterisk
                            let isExempt = false;
                            let vatValue = (item.vat_amount !== undefined ? item.vat_amount : (item.vat !== undefined ? item.vat : 0));
                            let vatRate = (item.vat_rate !== undefined ? item.vat_rate : (item.vatRate !== undefined ? item.vatRate : null));
                            // Accept both 0 and '0' as exempt
                            if ((vatRate !== null && Number(vatRate) === 0) || Number(vatValue) === 0) {
                                isExempt = true;
                                hasExempt = true;
                            }
                            let description = item.description || '';
                            if (isExempt && description && !description.trim().endsWith('*')) {
                                description = description.trim() + ' *';
                            }
                            return `
                                <tr>
                                    <td>${description}</td>
                                    <td>${item.quantity || 1}</td>
                                    <td>${formatCurrency(item.unit_price ?? item.price ?? 0, invoiceData.currency).replace('MTn','MT')}</td>
                                    <td>${discountDisplay.replace('MTn','MT')}</td>
                                    <td>${formatCurrency(item.discounted_subtotal !== undefined ? item.discounted_subtotal : (item.discountedSubtotal !== undefined ? item.discountedSubtotal : ((item.quantity || 1) * (item.unit_price ?? item.price ?? 0))), invoiceData.currency).replace('MTn','MT')}</td>
                                    <td>${formatCurrency(vatValue, invoiceData.currency).replace('MTn','MT')}</td>
                                    <td>${formatCurrency(item.total !== undefined ? item.total : (((item.discounted_subtotal !== undefined ? item.discounted_subtotal : (item.discountedSubtotal !== undefined ? item.discountedSubtotal : ((item.quantity || 1) * (item.unit_price ?? item.price ?? 0)))) + vatValue)), invoiceData.currency).replace('MTn','MT')}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            // Add page break after each table except the last
            if (page + 1 < totalPages) {
                paginatedHtml += `<div style="page-break-after: always;"></div>`;
            }
        }
        // Add VAT exemption footnote if needed
        if (hasExempt) {
            vatExemptionFootnote = '<div style="font-size:0.75em;margin-top:4px;color:#444;">Os itens marcados com * estão isentos de IVA nos termos da legislação Moçambicana.</div>';
        }
        itemsContainer.innerHTML = paginatedHtml + vatExemptionFootnote;
        // Footer/page number removed as requested
    }
    // Totals section
    const totalsContainer = doc.querySelector('.invoice-totals');
    if (totalsContainer) {
        let totalsHtml = `<div class='total-row'><span>Subtotal:</span> <span>${formatCurrency(subtotal, invoiceData.currency).replace('MTn','MT')}</span></div>`;
        // Show discount block if any item has a discount
        if (anyItemHasDiscount) {
            let discountLabel = 'Desconto';
            if (allDiscountTypes.size === 1 && allDiscountValues.size === 1) {
                const onlyType = Array.from(allDiscountTypes)[0];
                const onlyValue = Array.from(allDiscountValues)[0];
                if (onlyType === 'percent') {
                    discountLabel = `Desconto (${onlyValue}%)`;
                } else if (onlyType === 'fixed') {
                    discountLabel = `Desconto (${formatCurrency(onlyValue, invoiceData.currency)})`;
                }
            } // else just 'Desconto' for mixed
            totalsHtml += `<div class='total-row' style='font-size:0.90em;'><span>${discountLabel}:</span> <span>- ${formatCurrency(totalDiscountAmount, invoiceData.currency)}</span></div>`;
            totalsHtml += `<div class='total-row'><span>Subtotal após Desconto:</span> <span>${formatCurrency(subtotalAfterDiscount, invoiceData.currency).replace('MTn','MT')}</span></div>`;
        }
        totalsHtml += `<div class='total-row'><span>IVA:</span> <span>${formatCurrency(totalVat, invoiceData.currency).replace('MTn','MT')}</span></div>`;
        totalsHtml += `<div class='grand-total'><span>Total:</span> <span>${formatCurrency(grandTotal, invoiceData.currency).replace('MTn','MT')}</span></div>`;
        totalsContainer.innerHTML = totalsHtml;
        totalsContainer.style.display = 'block'; // Ensure visible
        totalsContainer.style.fontSize = '1.1em';
        totalsContainer.style.fontWeight = '500';
        totalsContainer.style.marginTop = '30px';
    }
    // Remove any extra VAT/TOTAL lines outside the main totals section (if present in template, clear them)
//    const extraVat = doc.getElementById('extra-vat');
//    if (extraVat) extraVat.textContent = '';
//    const extraTotal = doc.getElementById('extra-total');
//    if (extraTotal) extraTotal.textContent = '';

    // Notes section with exemption reason
    let notes = invoiceData.notes || invoiceData.invoice?.notes || '';
    setDataField(doc, 'notes', notes);

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
        const selectedTemplate = await window.invoicetemplatemanager.getSelectedTemplate();
        const template = TEMPLATES[selectedTemplate] || TEMPLATES['classic'];
        
        // Fetch accent color if modern template
        let accentColor = '#007ec7';
        if (selectedTemplate === 'modern') {
            accentColor = await getInvoiceAccentColor();
            formattedData.color = accentColor;
            console.log('[generateInvoiceHTML] Modern template, using accentColor:', accentColor);
        }
        // Create the full HTML document with styles
        let styles = template.styles;
        if (selectedTemplate === 'modern') {
            styles = styles.replace(/{{accentColor}}/g, accentColor);
            console.log('[generateInvoiceHTML] Final styles after color replacement:', styles);
        }
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invoice ${formattedData.invoice.number}</title>
                <style>
                    ${styles}
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
async function previewTemplate() {
    try {
        // Fetch current user session
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session || !session.user) {
            console.warn('[TemplateManager] No user session for preview');
            return;
        }
        // Fetch invoice settings for the user
        const { data: invoiceSettings, error } = await window.supabase
            .from('invoice_settings')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
        if (error) {
            console.error('[TemplateManager] Error fetching invoice settings for preview:', error);
            return;
        }
        // Determine template and color
        const templateName = invoiceSettings.template || 'classic';
        // Robust fallback for color: use #007ec7 if blank, null, or whitespace
        const color = invoiceSettings.color && invoiceSettings.color.trim() ? invoiceSettings.color : '#007ec7';
        console.log('[TemplateManager] previewTemplate: templateName =', templateName, ', color =', color);
        const template = TEMPLATES[templateName] || TEMPLATES['classic'];
        const previewContainer = document.getElementById('template-preview-container');
        if (!previewContainer) return;
        // Create iframe for preview
        const iframe = document.createElement('iframe');
        previewContainer.innerHTML = '';
        previewContainer.appendChild(iframe);
        // Prepare preview data
        const previewData = { ...TEMPLATE_PREVIEW_DATA };
        if (templateName === 'modern') {
            previewData.color = color;
        }
        // Build the HTML string, replacing {{accentColor}} if needed
        let styles = template.styles;
        if (templateName === 'modern') {
            styles = styles.replace(/{{accentColor}}/g, color);
            console.log('[TemplateManager] previewTemplate: final styles after color replacement:', styles);
        }
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Template Preview</title>
                <style>
                    ${styles}
                </style>
            </head>
            <body>
                ${template.layout}
            </body>
            </html>
        `;
        // Write template content to iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
        // Populate template with preview data (no need to replace color again)
        await populateTemplate(iframeDoc, previewData);
        // Adjust iframe height to content
        iframe.style.height = iframeDoc.body.scrollHeight + 'px';
    } catch (error) {
        console.error('[TemplateManager] Error previewing template:', error);
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

// --- PDF CONTAINER CREATION FOR PDF.JS ---
/**
 * Create and return a fully prepared PDF container element for PDF generation.
 * This is the single source of truth for PDF container structure (width, centering, background, etc.).
 * @param {string} populatedHtml - The populated invoice HTML
 * @returns {HTMLElement} - The container element ready for PDF generation
 */
function createPDFContainer(populatedHtml) {
    const container = document.createElement('div');
    container.innerHTML = populatedHtml;
    container.style.width = '700px';
    container.style.marginLeft = 'auto';
    container.style.marginRight = 'auto';
    container.style.background = '#fff';
    container.style.boxSizing = 'border-box';
    return container;
}

// Add a function to fetch the invoice color from invoice_settings
async function getInvoiceAccentColor() {
    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session || !session.user) {
            console.log('[AccentColor] No session or user, using fallback #007ec7');
            return '#007ec7';
        }
        const { data: invoiceData, error } = await window.supabase
            .from('invoice_settings')
            .select('color')
            .eq('user_id', session.user.id)
            .single();
        console.log('[AccentColor] DB response:', invoiceData, 'Error:', error);
        if (invoiceData && invoiceData.color) {
            console.log('[AccentColor] Using DB color:', invoiceData.color);
            return invoiceData.color;
        } else {
            console.log('[AccentColor] No color in DB, using fallback #007ec7');
            return '#007ec7';
        }
    } catch (error) {
        console.error('[AccentColor] Error getting invoice accent color:', error);
        return '#007ec7';
    }
}

// Export functions for external use
window.invoicetemplatemanager = {
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
    },
    createPDFContainer: createPDFContainer,
    getInvoiceAccentColor: getInvoiceAccentColor
};
// --- BEGIN: Uncomment legacy TemplateManager class (for compatibility) ---
class templatemanager {
    constructor() {
        this.templates = new Map();
        this.defaultTemplate = `
            <div class="invoice-template">
                <div class="invoice-header">
                    <div class="company-info">
                        <h2 id="company-name"></h2>
                        <p id="company-address"></p>
                    </div>
                    <div class="invoice-info">
                        <h1>INVOICE</h1>
                        <p>Invoice #: <span id="invoice-number"></span></p>
                        <p>Date: <span id="issue-date"></span></p>
                        <p>Due Date: <span id="due-date"></span></p>
                    </div>
                </div>
                <div class="client-info">
                    <h3>Bill To:</h3>
                    <p id="client-name"></p>
                    <p id="client-address"></p>
                    <p>Tax ID: <span id="client-tax-id"></span></p>
                </div>
                <div class="invoice-items">
                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Quantity</th>
                                <th>Unit Price</th>
                                <th>VAT</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody id="invoice-items-body"></tbody>
                    </table>
                </div>
                <div class="invoice-summary invoice-totals">
                    <!-- Totals will be populated by JS -->
                </div>
                <div class="invoice-notes">
                    <p id="notes"></p>
                </div>
            </div>`;
    }
    async getTemplate(name) {
        try {
            if (this.templates.has(name)) {
                return this.templates.get(name);
            }
            const response = await fetch(`templates/${name}.html`);
            if (!response.ok) {
                console.warn(`Template ${name} not found, using default template`);
                return this.defaultTemplate;
            }
            const template = await response.text();
            this.templates.set(name, template);
            return template;
        } catch (error) {
            console.error('Error loading template:', error);
            return this.defaultTemplate;
        }
    }
    processTemplate(template, data) {
        return template.replace(/\${(.*?)}/g, (match, key) => {
            return data[key.trim()] ?? '';
        });
    }
}
window.templatemanager = new templatemanager();
// --- END: Uncomment legacy TemplateManager class ---
