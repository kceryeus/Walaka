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

/**
 * Generate PDF from invoice data
 * @param {Object} invoiceData - The invoice data
 * @returns {Promise<Blob>} - The generated PDF blob
 */
async function generatePDF(invoiceData) {
    try {
        // Format the items with proper calculations
        const formattedItems = invoiceData.items?.map(item => {
            const quantity = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.price) || 0;
            const subtotal = quantity * price;
            const vatAmount = subtotal * 0.16; // 16% VAT
            
            return {
                description: item.description || '',
                quantity: quantity,
                price: price,
                vat: vatAmount, // Store actual amount, not percentage
                total: subtotal + vatAmount
            };
        }) || [];

        // Calculate totals
        const subtotal = formattedItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const totalVat = formattedItems.reduce((sum, item) => sum + item.vat, 0);
        const total = subtotal + totalVat;

        // Get business profile
        const businessProfile = await getBusinessProfile();
        
        // Format the data for the template
        const formattedData = {
            // Company info
            company: {
                name: businessProfile.company_name || 'Your Company Name',
                address: businessProfile.address || 'Your Company Address',
                email: businessProfile.email || 'info@yourcompany.com',
                phone: window.companySettings?.phone || '+258 XX XXX XXXX',
                nuit: businessProfile.tax_id || '0',
                logo: window.companySettings?.logo || '',
                website: businessProfile.website || ''
            },
            // Invoice details
            invoice: {
                id: invoiceData.id || invoiceData.invoice_id,
                number: invoiceData.invoiceNumber || await getNextInvoiceNumber(),
                issueDate: invoiceData.issueDate || new Date().toISOString().split('T')[0],
                dueDate: invoiceData.dueDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                status: invoiceData.status || 'draft',
                projectName: invoiceData.projectName || '',
                subtotal: subtotal,
                vat: totalVat,
                total: total,
                discount: invoiceData.discount || 0,
                notes: invoiceData.notes || '',
                paymentTerms: invoiceData.paymentTerms || 'net30'
            },
            // Client info
            client: {
                name: invoiceData.client?.customer_name || 'Client Name',
                address: invoiceData.client?.billing_address || '',
                nuit: Number(invoiceData.client?.customer_tax_id) || 0,
                email: invoiceData.client?.email || '',
                contact: invoiceData.client?.contact || '',
                phone: invoiceData.client?.telephone || '',
                city: invoiceData.client?.city || '',
                postal_code: invoiceData.client?.postal_code || '',
                province: invoiceData.client?.province || '',
                country: invoiceData.client?.country || ''
            },
            // Items
            items: formattedItems,
            // Currency
            currency: invoiceData.currency || 'MZN'
        };

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
        const populatedHtml = await window.invoiceTemplateManager.populateTemplate(html, formattedData);
        
        // Create PDF container
        const pdfContainer = document.createElement('div');
        pdfContainer.innerHTML = populatedHtml;
        document.body.appendChild(pdfContainer);

        // PDF Options
        const opt = {
            margin: 10,
            filename: `Invoice-${formattedData.invoice.number}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { 
                scale: 2,
                useCORS: true,
                letterRendering: true
            },
            jsPDF: { 
                unit: 'mm', 
                format: 'a4', 
                orientation: 'portrait'
            }
        };

        // Generate PDF
        await html2pdf().from(pdfContainer).set(opt).save();

        // Cleanup
        document.body.removeChild(pdfContainer);

        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
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

// Attach to window for global access
window.generatePDF = generatePDF;