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

async function generatePDF(invoiceData) {
    // Generate invoice HTML using the function from templateManager
    const invoiceHTML = await window.invoiceTemplateManager.generateInvoiceHTML(invoiceData);
    
    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = invoiceHTML;
    document.body.appendChild(container);
    
    // Generate PDF using html2pdf
    const opt = {
        margin: 10,
        filename: `${invoiceData.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    try {
        const pdf = await html2pdf().from(container).set(opt).outputPdf('blob');
        document.body.removeChild(container);
        return pdf;
    } catch (error) {
        document.body.removeChild(container);
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
