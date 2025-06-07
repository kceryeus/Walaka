// Invoice Preview Management Module

/**
 * Preview invoice in modal
 * @param {Object} invoiceData - The invoice data
 */
async function previewInvoice(invoiceData) {
    try {
        console.log('Preview Invoice - Received Data:', invoiceData);
        
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
                phone: businessProfile.phone || '+258 XX XXX XXXX',
                nuit: businessProfile.tax_id || '0',
                logo: window.companySettings?.logo || '',
                website: businessProfile.website || ''
            },
            // Invoice details - ensure these fields are populated
            invoice: {
                id: invoiceData.id || invoiceData.invoice_id,
                number: invoiceData.invoiceNumber || await getNextInvoiceNumber(),
                issueDate: invoiceData.issueDate || new Date().toISOString().split('T')[0],
                dueDate: invoiceData.dueDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                status: invoiceData.status || 'draft',
                projectName: invoiceData.projectName || '',
                subtotal: subtotal,
                vat: totalVat, // Use calculated VAT amount
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
        
        console.log('Formatted data for preview:', formattedData);
        
        // Get the preview container
        const previewContainer = document.getElementById('invoicePreviewContent');
        if (!previewContainer) {
            console.error('Preview container not found. Available elements:', document.querySelectorAll('[id*="invoice"]'));
            throw new Error('Preview container not found');
        }
        
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
        
        // Clear and update the preview content
        previewContainer.innerHTML = populatedHtml;
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
                downloadPdfBtn.addEventListener('click', async () => {
                    try {
                        // Disable button and show loading state
                        downloadPdfBtn.disabled = true;
                        downloadPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
                        
                        // Get the current invoice data
                        const currentInvoiceData = JSON.parse(previewContainer.dataset.currentInvoice || '{}');
                        if (!currentInvoiceData || !currentInvoiceData.invoice?.number) {
                            throw new Error('No valid invoice data found');
                        }

                        showNotification('Generating PDF...', 'info');
                        
                        // Generate and download the PDF
                        const pdfBlob = await window.generatePDF(currentInvoiceData);
                        
                        // Create download link
                        const downloadLink = document.createElement('a');
                        downloadLink.href = URL.createObjectURL(pdfBlob);
                        downloadLink.download = `Invoice-${currentInvoiceData.invoice.number}.pdf`;
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                        
                        showNotification('PDF downloaded successfully', 'success');
                    } catch (error) {
                        console.error('Error downloading PDF:', error);
                        showNotification('Error generating PDF: ' + error.message, 'error');
                    } finally {
                        // Re-enable button and restore original state
                        downloadPdfBtn.disabled = false;
                        downloadPdfBtn.innerHTML = '<i class="fas fa-download"></i> Download PDF';
                    }
                });
            }

            if (sendInvoiceBtn) {
                sendInvoiceBtn.addEventListener('click', () => {
                    openEmailModal(formattedData);
                });
            }
        }

        // After populating the preview content
        const invoiceDetailsSection = document.querySelector("#invoicePreviewContent > div > div.invoice-header > div.invoice-details");
        if (invoiceDetailsSection) {
            // Update invoice number, issue date, and due date in the preview
            const detailsHtml = `
                <div class="detail-item">
                    <span class="label">Invoice Number:</span>
                    <span class="value">${formattedData.invoice.number}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Issue Date:</span>
                    <span class="value">${new Date(formattedData.invoice.issueDate).toLocaleDateString()}</span>
                </div>
                <div class="detail-item">
                    <span class="label">Due Date:</span>
                    <span class="value">${new Date(formattedData.invoice.dueDate).toLocaleDateString()}</span>
                </div>
            `;
            invoiceDetailsSection.innerHTML = detailsHtml;
        }

        // Update the invoice totals in the preview
        const totalsSection = document.querySelector("#invoicePreviewContent .invoice-totals");
        if (totalsSection) {
            totalsSection.innerHTML = `
                <div class="totals-row">
                    <span>Subtotal:</span>
                    <span>${formattedData.currency} ${formatNumber(formattedData.invoice.subtotal)}</span>
                </div>
                <div class="totals-row">
                    <span>VAT (16%):</span>
                    <span>${formattedData.currency} ${formatNumber(formattedData.invoice.vat)}</span>
                </div>
                <div class="totals-row total">
                    <span>Total:</span>
                    <span>${formattedData.currency} ${formatNumber(formattedData.invoice.total)}</span>
                </div>
            `;
        }

        // Update items table with proper formatting
        const itemsTable = document.querySelector("#invoicePreviewContent table tbody");
        if (itemsTable) {
            itemsTable.innerHTML = formattedItems.map(item => `
                <tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>${formattedData.currency} ${formatNumber(item.price)}</td>
                    <td>${formattedData.currency} ${formatNumber(item.vat)}</td>
                    <td>${formattedData.currency} ${formatNumber(item.total)}</td>
                </tr>
            `).join('');
        }

        // Store the current invoice data for PDF generation
        previewContainer.dataset.currentInvoice = JSON.stringify(formattedData);
    } catch (error) {
        console.error('Error in previewInvoice:', error);
        showNotification('Error generating preview: ' + error.message, 'error');
    }
}

function formatNumber(number) {
    return new Intl.NumberFormat('pt-MZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

/**
 * Download invoice as PDF
 * @param {Object} invoiceData - The invoice data
 */
async function downloadInvoicePdf(invoiceData) {
    try {
        // Use the same PDF generation function that uses the preview content
        await generateInvoicePDF(invoiceData);
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
window.previewInvoice = previewInvoice;
window.downloadInvoicePdf = downloadInvoicePdf;
window.openEmailModal = openEmailModal;

// Event listeners for preview and send buttons
document.getElementById('previewInvoiceBtn')?.addEventListener('click', () => {
    window.modalManager.openModal('viewInvoiceModal');
});

document.getElementById('sendInvoiceBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    const viewModal = document.getElementById('viewInvoiceModal');
    window.modalManager.openModal('emailInvoiceModal', viewModal);
});