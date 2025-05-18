// pdf.js
// PDF and Invoice HTML generation utilities for the invoice module

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
