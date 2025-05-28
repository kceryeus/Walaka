// pdf.js
// PDF and Invoice HTML generation utilities for the invoice module

async function populateTemplate(template, data) {
    // Replace placeholders with actual data
    let html = template;
    
    // Basic invoice info
    html = html.replace(/{{invoiceNumber}}/g, data.invoiceNumber || '');
    html = html.replace(/{{issueDate}}/g, formatDate(data.issueDate) || '');
    html = html.replace(/{{dueDate}}/g, formatDate(data.dueDate) || '');
    html = html.replace(/{{currency}}/g, data.currency || 'MZN');
    
    // Client info
    html = html.replace(/{{clientName}}/g, data.client.customer_name || '');
    html = html.replace(/{{clientEmail}}/g, data.client.email || '');
    html = html.replace(/{{clientAddress}}/g, data.client.address || '');
    html = html.replace(/{{clientTaxId}}/g, data.client.taxId || '');
    
    // Items
    const itemsHtml = data.items.map(item => `
        <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
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
        // If we have an invoice number, fetch the full data from Supabase
        if (invoiceData.invoiceNumber) {
            const { data: fullInvoiceData, error } = await window.supabase
                .from('invoices')
                .select('*, clients(*)')
                .eq('invoiceNumber', invoiceData.invoiceNumber)
                .single();

            if (error) throw error;
            if (fullInvoiceData) {
                invoiceData = fullInvoiceData;
            }
        }

        // Format the data for the template
        const formattedData = {
            invoiceNumber: invoiceData.invoice_number || invoiceData.invoiceNumber,
            issueDate: invoiceData.issue_date || invoiceData.issueDate,
            dueDate: invoiceData.due_date || invoiceData.dueDate,
            status: invoiceData.status || 'pending',
            currency: invoiceData.currency || 'MZN',
            client: {
                name: invoiceData.client_data?.name || invoiceData.client?.name || invoiceData.clients?.customer_name,
                email: invoiceData.client_data?.email || invoiceData.client?.email || invoiceData.clients?.email,
                address: invoiceData.client_data?.address || invoiceData.client?.address || invoiceData.clients?.address,
                taxId: invoiceData.client_data?.taxId || invoiceData.client?.taxId || invoiceData.clients?.nuit,
                contact: invoiceData.client_data?.contact || invoiceData.client?.contact || invoiceData.clients?.contact
            },
            company: invoiceData.company || {},
            items: invoiceData.items || [],
            subtotal: invoiceData.totals?.subtotal || invoiceData.subtotal || 0,
            totalVat: invoiceData.totals?.vat || invoiceData.totalVat || 0,
            total: invoiceData.totals?.total || invoiceData.total || 0,
            notes: invoiceData.notes || '',
            paymentTerms: invoiceData.payment_terms || invoiceData.paymentTerms || 'net30'
        };

        // Generate HTML using the template manager
        const html = await window.invoiceTemplateManager.generateInvoiceHTML(formattedData);

        // Create a temporary container for the PDF generation
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);

        // Configure PDF options
        const opt = {
            margin: 1,
            filename: `Invoice-${formattedData.invoiceNumber}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        // Generate PDF
        const pdf = await html2pdf().set(opt).from(container).outputPdf('blob');

        // Clean up
        document.body.removeChild(container);

        return pdf;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
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
        const selectedTemplate = await window.invoiceTemplateManager.getSelectedTemplate();
        const template = await window.invoiceTemplateManager.getTemplate(selectedTemplate);
        
        // Create the full HTML document with styles
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invoice</title>
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
        return await populateTemplate(html, invoiceData);
    } catch (error) {
        console.error('Error generating invoice HTML:', error);
        throw error;
    }
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    // window.generatePDF = generatePDF; // Keep this if generatePDF is only in this file
    // window.generateInvoiceHTML = generateInvoiceHTML; // Remove if now in templateManager
}
