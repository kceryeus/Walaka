// pdf.js
// PDF and Invoice HTML generation utilities for the invoice module

const TEMPLATE_PATHS = {
    classic: 'classic.html',
    modern: 'modern.html',
    minimal: 'minimal.html'
};

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
    // Generate invoice HTML
    const invoiceHTML = await generateInvoiceHTML(invoiceData);
    
    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = invoiceHTML;
    container.style.width = '210mm';
    container.style.padding = '10mm';
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

async function generateInvoiceHTML(invoiceData) {
    try {
        const selectedTemplate = localStorage.getItem('selectedInvoiceTemplate') || 'classic';
        const templatePath = `templates/${TEMPLATE_PATHS[selectedTemplate]}`;
        
        const response = await fetch(templatePath);
        if (!response.ok) throw new Error('Template not found');
        
        const templateContent = await response.text();
        return await populateTemplate(templateContent, invoiceData);
    } catch (error) {
        console.error('Error generating invoice HTML:', error);
        throw error;
    }
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.generatePDF = generatePDF;
    window.generateInvoiceHTML = generateInvoiceHTML;
}
