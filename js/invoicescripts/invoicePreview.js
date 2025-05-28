// Invoice Preview Management Module

/**
 * Preview invoice in modal
 * @param {Object} invoiceData - The invoice data
 */
async function previewInvoice(invoiceData) {
    try {
        console.log('Preview Invoice - Received Data:', invoiceData);
        
        // Format the data for the template
        const formattedData = {
            // Company info
            company: {
                name: window.companySettings?.name || 'Your Company Name',
                address: window.companySettings?.address || 'Your Company Address',
                email: window.companySettings?.email || 'info@yourcompany.com',
                phone: window.companySettings?.phone || '+258 XX XXX XXXX',
                nuit: window.companySettings?.nuit || '123456789',
                logo: window.companySettings?.logo || ''
            },
            // Invoice details
            invoice: {
                number: invoiceData.invoiceNumber || 'Draft Invoice',
                issueDate: invoiceData.issueDate || new Date().toISOString().split('T')[0],
                dueDate: invoiceData.dueDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                status: invoiceData.status || 'draft',
                projectName: invoiceData.projectName || '',
                subtotal: invoiceData.subtotal || 0,
                vat: invoiceData.totalVat || 0,
                total: invoiceData.total || 0,
                discount: invoiceData.discount || 0,
                notes: invoiceData.notes || '',
                paymentTerms: invoiceData.paymentTerms || 'net30'
            },
            // Client info
            client: {
                name: invoiceData.client?.customer_name || 'Client Name',
                address: invoiceData.client?.billing_address || '',
                nuit: invoiceData.client?.customer_tax_id || '',
                email: invoiceData.client?.email || '',
                contact: invoiceData.client?.contact || '',
                phone: invoiceData.client?.telephone || '',
                city: invoiceData.client?.city || '',
                postal_code: invoiceData.client?.postal_code || '',
                province: invoiceData.client?.province || '',
                country: invoiceData.client?.country || ''
            },
            // Items
            items: invoiceData.items?.map(item => ({
                description: item.description || '',
                quantity: item.quantity || 0,
                price: item.price || 0,
                vat: item.vat || 0,
                total: item.total || 0
            })) || [],
            // Currency
            currency: invoiceData.currency || 'MZN'
        };
        
        console.log('Formatted data for preview:', formattedData);
        
        // Generate HTML using the template manager
        const html = await window.invoiceTemplateManager.generateInvoiceHTML(formattedData);
        console.log('Generated HTML:', html);
        
        // Get the preview container
        const previewContainer = document.getElementById('invoicePreviewContent');
        if (!previewContainer) {
            console.error('Preview container not found. Available elements:', document.querySelectorAll('[id*="invoice"]'));
            throw new Error('Preview container not found');
        }
        
        // Clear and update the preview content
        previewContainer.innerHTML = html;
        console.log('Updated preview content');
        
        // Show the preview modal
        const viewInvoiceModal = document.getElementById('viewInvoiceModal');
        if (viewInvoiceModal) {
            console.log('View invoice modal element found.');
            viewInvoiceModal.style.display = 'block';
            document.body.classList.add('modal-open');
            console.log('Modal activated');
        } else {
            console.error('View invoice modal not found');
        }

        // Update the invoice number and status in the modal header
        const invoiceNumberElement = document.getElementById('viewInvoiceNumber');
        const invoiceStatusElement = document.getElementById('viewInvoiceStatus');
        
        if (invoiceNumberElement) {
            invoiceNumberElement.textContent = formattedData.invoice.number;
            console.log('Updated invoice number:', formattedData.invoice.number);
        }
        
        if (invoiceStatusElement) {
            invoiceStatusElement.textContent = formattedData.invoice.status;
            invoiceStatusElement.className = `status ${formattedData.invoice.status.toLowerCase()}`;
            console.log('Updated invoice status:', formattedData.invoice.status);
        }

        // Add action buttons to the modal header
        const actionsContainer = document.querySelector('.invoice-view-actions');
        if (actionsContainer) {
            actionsContainer.innerHTML = `
                <button class="btn secondary-btn" id="downloadPdfBtn">
                    <i class="fas fa-download"></i> Download PDF
                </button>
                <button class="btn primary-btn" id="sendInvoiceBtn">
                    <i class="fas fa-paper-plane"></i> Send
                </button>
            `;

            // Add event listeners for the action buttons
            const downloadPdfBtn = document.getElementById('downloadPdfBtn');
            const sendInvoiceBtn = document.getElementById('sendInvoiceBtn');

            if (downloadPdfBtn) {
                downloadPdfBtn.addEventListener('click', () => {
                    downloadInvoicePdf(formattedData);
                });
            }

            if (sendInvoiceBtn) {
                sendInvoiceBtn.addEventListener('click', () => {
                    openEmailModal(formattedData);
                });
            }
        }
    } catch (error) {
        console.error('Error in previewInvoice:', error);
        showNotification('Error generating preview: ' + error.message, 'error');
    }
}

/**
 * Download invoice as PDF
 * @param {Object} invoiceData - The invoice data
 */
async function downloadInvoicePdf(invoiceData) {
    try {
        const html = await window.invoiceTemplateManager.generateInvoiceHTML(invoiceData);
        
        // Create a temporary container
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
        
        // Generate PDF using html2pdf
        const opt = {
            margin: 10,
            filename: `${invoiceData.invoice.number}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        await html2pdf().from(container).set(opt).save();
        document.body.removeChild(container);
        
        showNotification('PDF downloaded successfully', 'success');
    } catch (error) {
        console.error('Error generating PDF:', error);
        showNotification('Error generating PDF: ' + error.message, 'error');
    }
}

/**
 * Open email modal for sending invoice
 * @param {Object} invoiceData - The invoice data
 */
function openEmailModal(invoiceData) {
    const emailModal = document.getElementById('emailInvoiceModal');
    if (!emailModal) return;

    // Pre-fill email form
    const emailTo = document.getElementById('emailTo');
    const emailSubject = document.getElementById('emailSubject');
    const emailMessage = document.getElementById('emailMessage');

    if (emailTo) emailTo.value = invoiceData.client.email || '';
    if (emailSubject) emailSubject.value = `Invoice ${invoiceData.invoice.number} from ${invoiceData.company.name}`;
    if (emailMessage) {
        emailMessage.value = `Dear ${invoiceData.client.name},\n\nPlease find attached invoice ${invoiceData.invoice.number} for ${invoiceData.currency} ${invoiceData.total}.\n\nPayment is due by ${new Date(invoiceData.dueDate).toLocaleDateString()}.\n\nThank you for your business.\n\nBest regards,\n${invoiceData.company.name}`;
    }

    // Show modal
    emailModal.classList.add('active');
    document.body.classList.add('modal-open');
}

// Attach to window for global access
window.previewInvoice = previewInvoice;
window.downloadInvoicePdf = downloadInvoicePdf;
window.openEmailModal = openEmailModal; 