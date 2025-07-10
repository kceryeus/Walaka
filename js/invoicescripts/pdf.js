// pdf.js
// PDF and Invoice HTML generation utilities for the invoice module

async function populateTemplate(templateContent, data) {
    console.log('Populating template with data:', data);
    console.log('Template content object:', templateContent);

    // Ensure layout and styles are strings
    const layout = typeof templateContent.layout === 'string' ? templateContent.layout : '';
    const styles = typeof templateContent.styles === 'string' ? templateContent.styles : '';

    console.log('Template Layout String Length:', layout.length);
    console.log('Template Layout String (first 100 chars):', layout.substring(0, 100));
    console.log('Template Styles String Length:', styles.length);
    console.log('Template Styles String (first 100 chars):', styles.substring(0, 100));

    // Construct the full HTML document with styles and layout from the template content
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice</title>
            <style>
                ${styles}
            </style>
        </head>
        <body>
            ${layout}
        </body>
        </html>
    `;

    console.log('HTML after template literal (before replacements):', html);

    // Replace placeholders with actual data within the layout
    // Basic invoice info
    html = html.replace(/{{invoiceNumber}}/g, data.invoiceNumber || '');
    html = html.replace(/{{issueDate}}/g, formatDate(data.issueDate) || '');
    html = html.replace(/{{dueDate}}/g, formatDate(data.dueDate) || '');
    html = html.replace(/{{currency}}/g, data.currency || 'MZN');
    
    // Client info
    // Check if data.client and its properties exist before accessing them
    html = html.replace(/{{clientName}}/g, data.client?.name || data.client?.customer_name || '');
    html = html.replace(/{{clientEmail}}/g, data.client?.email || '');
    html = html.replace(/{{clientAddress}}/g, data.client?.address || '');
    html = html.replace(/{{clientTaxId}}/g, data.client?.taxId || data.client?.nuit || '');
    
    // Items
    const itemsHtml = (data.items || []).map(item => `
        <tr>
            <td>${item.description || ''}</td>
            <td>${item.quantity || 0}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${formatCurrency(item.vat)}</td>
            <td>${formatCurrency(item.total)}</td>
        </tr>
    `).join('');
    html = html.replace(/{{items}}/g, itemsHtml);
    
    // Totals
    html = html.replace(/{{subtotal}}/g, formatCurrency(data.subtotal));
    html = html.replace(/{{totalVat}}/g, formatCurrency(data.totalVat));
    html = html.replace(/{{total}}/g, formatCurrency(data.total));
    
    // Notes
    html = html.replace(/{{notes}}/g, data.notes || '');
    
    console.log('HTML after replacement:', html);

    return html;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: 'MZN'
    }).format(amount || 0);
}

// Add this helper for consistent number formatting
function formatNumber(amount) {
    if (typeof amount !== 'number') amount = parseFloat(amount) || 0;
    return amount.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Helper: Calculate invoice totals (copied from invoicePreview.js)
function calculateInvoiceTotals(items, discount = 0) {
    let subtotal = 0;
    let totalVat = 0;
    items.forEach(item => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unit_price) || 0;
        const vat = parseFloat(item.vat_rate || 0.16); // Default 16%
        const lineTotal = qty * price;
        subtotal += lineTotal;
        totalVat += lineTotal * vat;
    });
    subtotal = parseFloat(subtotal.toFixed(2));
    totalVat = parseFloat(totalVat.toFixed(2));
    let total = subtotal + totalVat;
    let discountAmount = 0;
    if (discount) {
        discountAmount = subtotal * (parseFloat(discount) / 100);
        total -= discountAmount;
    }
    return {
        subtotal,
        totalVat,
        discountAmount: parseFloat(discountAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2))
    };
}

// Helper: Format client info (copied from invoicePreview.js)
function formatClientInfo(client) {
    if (!client) return {};
    return {
        name: client.customer_name || '',
        email: client.email || '',
        taxId: client.customer_tax_id || client.nuit || '',
        address: [
            client.building_number,
            client.street_name,
            client.address_detail,
            client.city,
            client.province,
            client.postal_code,
            client.country
        ].filter(Boolean).join(', ')
    };
}

/**
 * Generate PDF from invoice data
 * @param {Object} invoiceData - The invoice data
 * @returns {Promise<Blob>} - The generated PDF blob
 */
async function generatePDF(invoiceData) {
    try {
        console.log('Generating PDF with data:', invoiceData);

        // --- Fetch full client record from DB if client name is present ---
        let client = null;
        let clientName = '';
        if (invoiceData.client && (invoiceData.client.customer_name || invoiceData.client.name)) {
            clientName = invoiceData.client.customer_name || invoiceData.client.name;
        } else if (invoiceData.client_name) {
            clientName = invoiceData.client_name;
        }
        if (clientName) {
            // Try to fetch client from DB
            const { data: clientData, error } = await window.supabase
                .from('clients')
                .select('*')
                .eq('customer_name', clientName)
                .maybeSingle();
            if (!error && clientData) {
                client = {
                    name: clientData.customer_name || '',
                    address: clientData.billing_address || '',
                    nuit: clientData.customer_tax_id || clientData.nuit || '',
                    email: clientData.email || '',
                    contact: clientData.contact || '',
                    phone: clientData.telephone || '',
                    city: clientData.city || '',
                    postal_code: clientData.postal_code || '',
                    province: clientData.province || '',
                    country: clientData.country || ''
                };
            }
        }
        // Fallback to form data if not found
        if (!client) {
            if (invoiceData.client) {
                client = {
                    name: invoiceData.client.name || invoiceData.client.customer_name || invoiceData.client_name || 'Client Name',
                    address: invoiceData.client.address || invoiceData.client.billing_address || invoiceData.client_address || '',
                    nuit: invoiceData.client.nuit || invoiceData.client.customer_tax_id || invoiceData.client_tax_id || '',
                    email: invoiceData.client.email || invoiceData.client_email || '',
                    contact: invoiceData.client.contact || invoiceData.client_contact || '',
                    phone: invoiceData.client.phone || invoiceData.client.telephone || invoiceData.client_phone || '',
                    city: invoiceData.client.city || '',
                    postal_code: invoiceData.client.postal_code || '',
                    province: invoiceData.client.province || '',
                    country: invoiceData.client.country || ''
                };
            } else {
                client = {
                    name: invoiceData.client_name || 'Client Name',
                    address: invoiceData.client_address || '',
                    nuit: invoiceData.client_tax_id || '',
                    email: invoiceData.client_email || '',
                    contact: invoiceData.client_contact || '',
                    phone: invoiceData.client_phone || '',
                    city: '',
                    postal_code: '',
                    province: '',
                    country: ''
                };
            }
        }

        // Format the items with proper calculations
        const formattedItems = invoiceData.items?.map(item => {
            const quantity = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            // Only use vatRate or vat_rate as the VAT rate (never item.vat, which is the amount)
            let vatRate = (typeof item.vatRate !== 'undefined') ? item.vatRate : (typeof item.vat_rate !== 'undefined' ? item.vat_rate : 0.16);
            if (typeof vatRate === 'string') vatRate = parseFloat(vatRate);
            if (vatRate > 1) vatRate = vatRate / 100;
            const subtotal = quantity * price;
            const vatAmount = subtotal * vatRate; // Calculate VAT based on item's VAT rate
            return {
                description: item.description || '',
                quantity: quantity,
                price: price,
                vatRate: vatRate, // Pass as decimal for template
                vat: vatAmount,
                total: subtotal + vatAmount
            };
        }) || [];

        // Calculate discount
        let discountType = invoiceData.discountType || 'none';
        let discountValue = invoiceData.discountValue || 0;
        let discountAmount = 0;
        let subtotal = formattedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        if (discountType === 'percent') {
            discountAmount = subtotal * (discountValue / 100);
        } else if (discountType === 'fixed') {
            discountAmount = discountValue;
        }
        const subtotalAfterDiscount = Math.max(subtotal - discountAmount, 0);
        // Calculate VAT for each item based on discounted price (match form logic)
        let totalVat = 0;
        const discountedItems = formattedItems.map(item => {
            let itemDiscount = 0;
            if (discountType === 'percent') {
                itemDiscount = item.price * item.quantity * (discountValue / 100);
            } else if (discountType === 'fixed' && subtotal > 0) {
                itemDiscount = discountAmount * ((item.price * item.quantity) / subtotal);
            }
            const discountedSubtotal = Math.max(item.price * item.quantity - itemDiscount, 0);
            // --- Match form logic: VAT is (discountedSubtotal) * item.vatRate ---
            const vatAmount = discountedSubtotal * item.vatRate;
            totalVat += vatAmount;
            return {
                ...item,
                discountedSubtotal,
                vat: vatAmount,
                total: discountedSubtotal + vatAmount
            };
        });
        const total = subtotalAfterDiscount + totalVat;
        // Get business profile
        const businessProfile = await getBusinessProfile();
        // Format the data for the template (flattened, not nested under 'invoice')
        const formattedData = {
            // Company info
            company: {
                name: businessProfile.company_name || 'Your Company Name',
                address: businessProfile.address || 'Your Company Address',
                email: businessProfile.email || 'info@yourcompany.com',
                phone: window.companySettings?.phone || '+258 XX XXX XXXX',
                nuit: businessProfile.tax_id || '0',
                logo: businessProfile.logo || '',
                website: businessProfile.website || ''
            },
            // Invoice details (flattened)
            invoiceNumber: invoiceData.invoiceNumber || await getNextInvoiceNumber(),
                issueDate: invoiceData.issueDate || invoiceData.issue_date || new Date().toISOString().split('T')[0],
                dueDate: invoiceData.dueDate || invoiceData.due_date || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                status: invoiceData.status || 'draft',
                projectName: invoiceData.projectName || '',
            subtotal,
            discountType,
            discountValue,
            discountAmount,
            subtotalAfterDiscount,
            totalVat,
            total,
                notes: invoiceData.notes || '',
            paymentTerms: invoiceData.paymentTerms || 'net30',
            // Client info
            client: client,
            // Items
            items: discountedItems,
            // Currency
            currency: invoiceData.currency || 'MZN'
        };

        console.log('Formatted data for PDF:', formattedData);

        // Get selected template
        const selectedTemplate = await window.invoiceTemplateManager.getSelectedTemplate();
        const template = window.invoiceTemplateManager.TEMPLATES[selectedTemplate] || window.invoiceTemplateManager.TEMPLATES['classic'];
        
        // Create the full HTML document with styles
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invoice ${formattedData.invoiceNumber}</title>
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
        let populatedHtml = await window.invoiceTemplateManager.populateTemplate(html, formattedData);

        // Determine if conversion is needed
        let showConversion = false;
        let rate = 1;
        let currency = formattedData.currency || 'MZN';
        if (window.invoiceForm && currency !== 'MZN' && window.invoiceForm.currentRate && !isNaN(window.invoiceForm.currentRate)) {
            showConversion = true;
            rate = window.invoiceForm.currentRate;
        }
        /*
        // Replace the totals section if present
        let totalsHtml = `
            <div class="invoice-totals">
                <div class="totals-row">
                    <span>Subtotal:</span>
                    <span>MZN ${formatNumber(formattedData.invoice.subtotal)}</span>
                </div>
                <div class="totals-row">
                    <span>VAT (16%):</span>
                    <span>MZN ${formatNumber(formattedData.invoice.vat)}</span>
                </div>
                <div class="totals-row total">
                    <span>Total:</span>
                    <span>MZN ${formatNumber(formattedData.invoice.total)}</span>
                </div>
        `;
        if (showConversion) {
            const convertedSubtotal = window.invoiceForm.getConvertedAmount(formattedData.invoice.subtotal);
            const convertedVat = window.invoiceForm.getConvertedAmount(formattedData.invoice.vat);
            const convertedTotal = window.invoiceForm.getConvertedAmount(formattedData.invoice.total);
            totalsHtml += `
                <div class=\"totals-row\">\n                    <span>Subtotal:</span>\n                    <span>${currency} ${formatNumber(convertedSubtotal)}</span>\n                </div>\n                <div class=\"totals-row\">\n                    <span>VAT (16%):</span>\n                    <span>${currency} ${formatNumber(convertedVat)}</span>\n                </div>\n                <div class=\"totals-row total\">\n                    <span>Total:</span>\n                    <span>${currency} ${formatNumber(convertedTotal)}</span>\n                </div>\n                <div class=\"totals-row\" style=\"font-size:0.95em;color:#555;\">\n                    <span></span>\n                    <span>1 MZN ≈ ${rate.toFixed(4)} ${currency}</span>\n                </div>\n            `;
        }
        totalsHtml += '</div>';
        populatedHtml = populatedHtml.replace(
            /<div class="invoice-totals">[\s\S]*?<\/div>/,
            totalsHtml
        );
        */

        // Create PDF container
        const pdfContainer = document.createElement('div');
        pdfContainer.innerHTML = populatedHtml;
        document.body.appendChild(pdfContainer);

        // PDF Options
        const opt = {
            margin: 10,
            filename: `Invoice-${formattedData.invoiceNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                letterRendering: true,
                willReadFrequently: true,
                logging: true,
                allowTaint: true
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait'
            }
        };

        console.log('Generating PDF with options:', opt);

        // Generate PDF
        try {
            const pdfBlob = await html2pdf()
                .set(opt)
                .from(pdfContainer)
                .outputPdf('blob');
            
            console.log('PDF generated successfully');
            
            // Cleanup
            document.body.removeChild(pdfContainer);
            
            return pdfBlob;
        } catch (error) {
            // Cleanup in case of error
            if (document.body.contains(pdfContainer)) {
                document.body.removeChild(pdfContainer);
            }
            throw error;
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}

/**
 * Generate PDF from invoice data and upload to Supabase Storage
 * @param {Object} invoiceData - The invoice data
 * @returns {Promise<string>} - The public URL of the uploaded PDF
 */
async function generateAndUploadPDF(invoiceData) {
    // Generate the PDF blob
    const pdfBlob = await generatePDF(invoiceData);
    // Get user session
    const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
    if (sessionError || !session) {
        throw new Error('Authentication required');
    }
    // Generate a safe filename
    const pdfFileName = `${invoiceData.invoiceNumber.replace(/\s+/g, '_')}_${session.user.id}.pdf`;
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await window.supabase.storage
        .from('invoice_pdfs')
        .upload(pdfFileName, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true,
            cacheControl: '3600',
        });
    if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error('Failed to upload PDF');
    }
    // Get public URL
    const { data: { publicUrl } } = window.supabase.storage
        .from('invoice_pdfs')
        .getPublicUrl(pdfFileName);
    return publicUrl;
}

/**
 * Get business profile from Supabase
 */
async function getBusinessProfile() {
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');

        const { data: profile, error } = await window.supabase
            .from('business_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error) throw error;
        return profile || {};
    } catch (error) {
        console.error('Error fetching business profile:', error);
        return {};
    }
}

/**
 * Get the next invoice number from the sequence
 */
async function getNextInvoiceNumber() {
    try {
        // Get the current year
        const currentYear = new Date().getFullYear();
        
        // Query the latest invoice for this year
        const { data, error } = await window.supabase
            .from('invoices')
            .select('invoiceNumber')
            .ilike('invoiceNumber', `INV-${currentYear}-%`)
            .order('invoiceNumber', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            // Extract the sequence number from the last invoice
            const lastNumber = parseInt(data[0].invoice_number.split('-')[2]);
            // Generate next number with padding
            return `INV-${currentYear}-${String(lastNumber + 1).padStart(4, '0')}`;
        } else {
            // First invoice of the year
            return `INV-${currentYear}-0001`;
        }
    } catch (error) {
        console.error('Error generating invoice number:', error);
        return `INV-${new Date().getFullYear()}-0001`;
    }
}

// Update the PDF/Preview table generation logic to include all per-item fields
function generateInvoiceTableHTML(invoice) {
    let itemsHtml = '';
    invoice.items.forEach(item => {
        let discountDisplay = '';
        if (item.discountType === 'percent') discountDisplay = `${item.discountValue}%`;
        else if (item.discountType === 'fixed') discountDisplay = `${item.discountValue}`;
        else discountDisplay = '—';
        itemsHtml += `
            <tr>
                <td>${item.description}</td>
                <td>${item.quantity}</td>
                <td>${item.price}</td>
                <td>${item.discountType || '—'}</td>
                <td>${discountDisplay}</td>
                <td>${item.discountedSubtotal?.toFixed(2) ?? '0.00'}</td>
                <td>${item.vat?.toFixed(2) ?? '0.00'}</td>
                <td>${item.total?.toFixed(2) ?? '0.00'}</td>
            </tr>
        `;
    });
    return `
        <table style="width:100%;border-collapse:collapse;">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Discount Type</th>
                    <th>Discount</th>
                    <th>Discounted Subtotal</th>
                    <th>VAT</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>
    `;
}

// Attach to window for global access
window.generatePDF = generatePDF;
window.generateAndUploadPDF = generateAndUploadPDF;