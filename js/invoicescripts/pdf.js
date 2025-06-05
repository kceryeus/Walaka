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
        // If we have an invoice number, fetch the full data from Supabase
        if (invoiceData.invoiceNumber) {
            const { data: fullInvoiceData, error } = await window.supabase
                .from('invoices')
                .select('*, clients(*)')
                .eq('invoiceNumber', invoiceData.invoiceNumber);

            if (error) throw error;
            if (fullInvoiceData && fullInvoiceData.length > 0) {
                // Use the fetched data, which includes client details
                invoiceData = fullInvoiceData[0];
            } else {
                // If fetching by invoiceNumber didn't return data,
                // assume invoiceData already contains the necessary details from the form
                console.warn("Invoice data not found by invoiceNumber, using provided data.");
            }
        }

        // Format the data for the template
        // Ensure client data is correctly accessed whether fetched from DB or from form
        const formattedData = {
            invoiceNumber: invoiceData.invoice_number || invoiceData.invoiceNumber,
            issueDate: invoiceData.issue_date || invoiceData.issueDate,
            dueDate: invoiceData.due_date || invoiceData.dueDate,
            status: invoiceData.status || 'pending',
            currency: invoiceData.currency || 'MZN',
            // Prioritize fetched client data if available, otherwise use form data structure
            client: invoiceData.clients || invoiceData.client || invoiceData.client_data || {},
            company: invoiceData.company || {},
            items: invoiceData.items || [],
            // Accessing totals might vary based on source, cover common structures
            subtotal: invoiceData.totals?.subtotal || invoiceData.subtotal || 0,
            totalVat: invoiceData.totals?.vat || invoiceData.totalVat || 0,
            total: invoiceData.totals?.total || invoiceData.total || 0,
            notes: invoiceData.notes || '',
            paymentTerms: invoiceData.payment_terms || invoiceData.paymentTerms || 'net30'
        };

        // Get the default template
        const { data: templates, error: templateError } = await window.supabase
            .from('invoice_templates')
            .select('content') // Only select the content column
            .eq('is_default', true)
            .limit(1);

        if (templateError) throw templateError;
        if (!templates || templates.length === 0 || !templates[0].content) {
            throw new Error('No default invoice template found or template content is empty');
        }

        const templateContent = templates[0].content;

        // Generate HTML using the template content and formatted data
        const html = await populateTemplate(templateContent, formattedData);

        // Create a temporary container for the PDF generation
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);

        // Configure PDF options
        const opt = {
            margin: 1,
            filename: `Invoice-${formattedData.invoiceNumber || 'Draft'}.pdf`,
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
        return await populateTemplate(template.content, invoiceData);
    } catch (error) {
        console.error('Error generating invoice HTML:', error);
        throw error;
    }
}

async function generateInvoicePDF(invoiceData) {
    try {
        // Get the current preview container structure
        const previewContainer = document.querySelector('.invoice-preview-container');
        if (!previewContainer) {
            throw new Error('Preview container not found');
        }

        // Get selected template and styles
        const selectedTemplate = await window.invoiceTemplateManager.getSelectedTemplate();
        const template = window.invoiceTemplateManager.TEMPLATES[selectedTemplate] || window.invoiceTemplateManager.TEMPLATES['classic'];

        // Format the data structure
        const formattedData = {
            invoice: {
            number: invoiceData.invoice?.number || '',
            issueDate: invoiceData.invoice?.issueDate || '',
            dueDate: invoiceData.invoice?.dueDate || '',
            notes: invoiceData.invoice?.notes || '',
            paymentTerms: invoiceData.invoice?.paymentTerms || '',
            subtotal: invoiceData.invoice?.subtotal || 0,
            vat: invoiceData.invoice?.vat || 0,
            total: invoiceData.invoice?.total || 0
            },
            company: invoiceData.company || {},
            client: invoiceData.client || {},
            items: invoiceData.items || [],
            currency: invoiceData.currency || 'MZN'
        };

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

        // Create PDF container and set content
        const pdfContainer = document.createElement('div');
        pdfContainer.innerHTML = html;
        document.body.appendChild(pdfContainer);

        // PDF Options
        const opt = {
            margin: 10,
            filename: `Invoice-${invoiceData.invoice?.number || 'draft'}.pdf`,
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

        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}

function formatNumber(number) {
    return new Intl.NumberFormat('pt-MZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number || 0);
}

// PDF Generator class
class PDFGenerator {
    constructor() {
        this.templateManager = window.templateManager;
    }

    async generatePDF(invoiceData) {
        try {
            // Create a container for PDF content
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.left = '-9999px';
            document.body.appendChild(container);

            // Get and process template
            const template = await this.templateManager.getTemplate('invoice');
            const processedHTML = this.templateManager.processTemplate(template, invoiceData);
            
            // Add the processed HTML to container
            container.innerHTML = processedHTML;

            // Wait for images and fonts to load
            await this.waitForResources(container);

            // Configure PDF options
            const opt = {
                margin: 10,
                filename: `invoice-${invoiceData.invoice_number}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    logging: false
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            // Generate PDF
            await html2pdf().set(opt).from(container).save();

            // Cleanup
            document.body.removeChild(container);

        } catch (error) {
            console.error('PDF Generation Error:', error);
            throw new Error('Failed to generate PDF');
        }
    }

    async waitForResources(container) {
        const images = Array.from(container.getElementsByTagName('img'));
        const fonts = document.fonts;

        const imagePromises = images.map(img => {
            return new Promise((resolve) => {
                if (img.complete) {
                    resolve();
                } else {
                    img.onload = resolve;
                    img.onerror = resolve;
                }
            });
        });

        await Promise.all([
            ...imagePromises,
            fonts.ready,
            new Promise(resolve => setTimeout(resolve, 1000)) // Safety timeout
        ]);
    }
}

// Initialize PDF Generator
window.pdfGenerator = new PDFGenerator();

// Attach to window for global access
if (typeof window !== 'undefined') {
    // window.generatePDF = generatePDF; // Keep this if generatePDF is only in this file
    // window.generateInvoiceHTML = generateInvoiceHTML; // Remove if now in templateManager
    window.generateInvoicePDF = generateInvoicePDF;
}
