// Invoice Preview Management Module

/**
 * Preview invoice in modal
 * @param {Object} invoiceData - The invoice data
 */
async function previewInvoice(invoiceData) {
    try {
        console.log('Preview Invoice - Received Data:', invoiceData);
        
        // Ensure we have the required data structure
        const formattedData = {
            invoiceNumber: invoiceData.invoice_number || invoiceData.invoiceNumber,
            issueDate: invoiceData.issue_date || invoiceData.issueDate,
            dueDate: invoiceData.due_date || invoiceData.dueDate,
            status: invoiceData.status || 'pending',
            currency: invoiceData.currency || 'MZN',
            client: {
                name: invoiceData.client_data?.name || invoiceData.client?.name,
                email: invoiceData.client_data?.email || invoiceData.client?.email,
                address: invoiceData.client_data?.address || invoiceData.client?.address,
                taxId: invoiceData.client_data?.taxId || invoiceData.client?.taxId,
                contact: invoiceData.client_data?.contact || invoiceData.client?.contact
            },
            company: invoiceData.company || {},
            items: invoiceData.items || [],
            subtotal: invoiceData.totals?.subtotal || invoiceData.subtotal || 0,
            totalVat: invoiceData.totals?.vat || invoiceData.totalVat || 0,
            total: invoiceData.totals?.total || invoiceData.total || 0,
            notes: invoiceData.notes || '',
            paymentTerms: invoiceData.payment_terms || invoiceData.paymentTerms || 'net30'
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
            console.log('View invoice modal element found.', viewInvoiceModal);
            console.log('Attempting to activate modal...');
            viewInvoiceModal.classList.add('active');
            document.body.classList.add('modal-open');
            console.log('Modal activated. Current classList:', viewInvoiceModal.classList);
            // Optional: Check computed style, though class might not apply inline style
            // console.log('Modal computed display style:', window.getComputedStyle(viewInvoiceModal).display);

            console.log('Body classList after modal-open:', document.body.classList);
            console.log('Modal activated'); // Keep original log
        } else {
            console.error('View invoice modal not found');
        }

        // Update the invoice number and status in the modal header
        const invoiceNumberElement = document.getElementById('viewInvoiceNumber');
        const invoiceStatusElement = document.getElementById('viewInvoiceStatus');
        
        if (invoiceNumberElement) {
            invoiceNumberElement.textContent = formattedData.invoiceNumber;
            console.log('Updated invoice number:', formattedData.invoiceNumber);
        } else {
            console.error('Invoice number element not found');
        }
        
        if (invoiceStatusElement) {
            invoiceStatusElement.textContent = formattedData.status;
            invoiceStatusElement.className = `status ${formattedData.status.toLowerCase()}`;
            console.log('Updated invoice status:', formattedData.status);
        } else {
            console.error('Invoice status element not found');
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
            console.log('Added action buttons');

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
        } else {
            console.error('Actions container not found');
        }
    } catch (error) {
        console.error('Error generating preview:', error);
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
            filename: `${invoiceData.invoiceNumber}.pdf`,
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
    if (emailSubject) emailSubject.value = `Invoice ${invoiceData.invoiceNumber} from ${invoiceData.company.name}`;
    if (emailMessage) {
        emailMessage.value = `Dear ${invoiceData.client.name},\n\nPlease find attached invoice ${invoiceData.invoiceNumber} for ${invoiceData.currency} ${invoiceData.total}.\n\nPayment is due by ${new Date(invoiceData.dueDate).toLocaleDateString()}.\n\nThank you for your business.\n\nBest regards,\n${invoiceData.company.name}`;
    }

    // Show modal
    emailModal.classList.add('active');
    document.body.classList.add('modal-open');
}

// Attach to window for global access
window.previewInvoice = previewInvoice;
window.downloadInvoicePdf = downloadInvoicePdf;
window.openEmailModal = openEmailModal; 