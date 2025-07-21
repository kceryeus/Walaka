// Invoice Preview Management Module

/**
 * Preview invoice in modal
 * @param {Object} invoiceData - The invoice data
 */
async function previewInvoice(invoiceData) {
    try {
        console.log('Preview Invoice - Received Data:', invoiceData);
        
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
        // Support both {items: [{description, quantity, price, ...}]} and {items: [{unit_price, vat_amount, ...}]}
        let items = (invoiceData.items || []).map(item => ({
            description: item.description || '',
            quantity: item.quantity || 0,
            price: item.price !== undefined ? item.price : (item.unit_price !== undefined ? item.unit_price : 0),
            vat: item.vat !== undefined ? item.vat : (item.vat_amount !== undefined ? item.vat_amount : 0),
            total: item.total !== undefined ? item.total : 0
        }));
        // Recalculate totals
        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
        const totalVat = items.reduce((sum, item) => sum + item.vat, 0);
        const total = subtotal + totalVat;

        // Get business profile
        const businessProfile = await getBusinessProfile();
        // Get logo from appearance settings
        const logoUrl = await getAppearanceLogoUrl();
        
        // --- Invoice number with series/letter ---
        const serie = invoiceData.serie || invoiceData.invoiceSerie || '';
        let invoiceNumber = invoiceData.invoiceNumber || invoiceData.invoice_number || '';
        if (!invoiceNumber) invoiceNumber = await getNextInvoiceNumber();
        let displayInvoiceNumber = invoiceNumber;
        if (serie && invoiceNumber && !(`${invoiceNumber}`.startsWith(`${serie}/`))) {
            displayInvoiceNumber = `${serie}/${invoiceNumber}`;
        } else {
            displayInvoiceNumber = invoiceNumber || serie || 'Factura Rascunho';
        }
        console.log('[Preview] displayInvoiceNumber before template:', displayInvoiceNumber, 'invoiceNumber:', invoiceNumber);
        // Format the data for the template
        const formattedData = {
            company: {
                name: businessProfile.company_name || 'Your Company Name',
                address: businessProfile.address || 'Your Company Address',
                email: businessProfile.email || 'info@yourcompany.com',
                phone: businessProfile.phone || '+258 XX XXX XXXX',
                nuit: businessProfile.tax_id || '0',
                logo: logoUrl, // Use logo from appearance_settings
                website: businessProfile.website || ''
            },
            invoice: {
                id: invoiceData.id || invoiceData.invoice_id,
                number: invoiceNumber,
                displayNumber: displayInvoiceNumber,
                issueDate: invoiceData.issueDate || invoiceData.issue_date || new Date().toISOString().split('T')[0],
                dueDate: invoiceData.dueDate || invoiceData.due_date || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
                status: invoiceData.status || 'draft',
                projectName: invoiceData.projectName || '',
                subtotal: subtotal,
                vat: totalVat,
                total: total,
                discount: invoiceData.discount || 0,
                notes: invoiceData.notes || '',
                paymentTerms: invoiceData.paymentTerms || invoiceData.payment_terms || 'net30'
            },
            client: client,
            items: items,
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
        let selectedTemplate = await window.invoicetemplatemanager.getSelectedTemplate();
        let template = window.invoicetemplatemanager.TEMPLATES?.[selectedTemplate] || window.invoicetemplatemanager.defaultTemplate;
        // Fallback to default if template is missing or incomplete
        if (!template || !template.layout || !template.styles) {
            template = window.invoicetemplatemanager.defaultTemplate;
        }
        // Fetch accent color from invoice_settings if modern template
        let color = '#007ec7';
        if (selectedTemplate === 'modern') {
            try {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session && session.user) {
                    const { data: invoiceSettings, error } = await window.supabase
                        .from('invoice_settings')
                        .select('color')
                        .eq('user_id', session.user.id)
                        .single();
                    if (!error && invoiceSettings && invoiceSettings.color && invoiceSettings.color.trim()) {
                        color = invoiceSettings.color;
                    }
                }
            } catch (err) {
                console.error('[InvoicePreview] Error fetching accent color:', err);
            }
            // Replace {{accentColor}} in styles
            template = { ...template, styles: template.styles.replace(/{{accentColor}}/g, color) };
            console.log('[InvoicePreview] Using accent color for modern template:', color);
        }
        // Create the full HTML document with styles
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Invoice ${formattedData.invoice.number}</title>
                <style>
                    ${template.styles || ''}
                </style>
            </head>
            <body>
                ${template.layout || template}
            </body>
            </html>
        `;
        
        // Populate template with data (ensure all fields are present)
        const safeData = {
            ...formattedData,
            invoice: {
                ...formattedData.invoice,
                displayNumber: displayInvoiceNumber
            },
            invoiceNumber: displayInvoiceNumber // for template compatibility
        };
        const populatedHtml = await window.invoicetemplatemanager.populateTemplate(html, safeData);
        
        // Clear and update the preview content
        previewContainer.innerHTML = populatedHtml;
        console.log('Updated preview content');
        
        // Show the preview modal
        const viewInvoiceModal = document.getElementById('viewInvoiceModal');
        if (viewInvoiceModal) {
            console.log('View invoice modal element found.');
            window.modalManager.openModal('viewInvoiceModal');
            document.body.classList.add('modal-open');
            console.log('Modal activated');
        } else {
            console.error('View invoice modal not found');
        }

        // Update the invoice number and status in the modal header
        const invoiceNumberElement = document.getElementById('viewInvoiceNumber');
        const invoiceStatusElement = document.getElementById('viewInvoiceStatus');
        
        if (invoiceNumberElement) {
            invoiceNumberElement.textContent = displayInvoiceNumber;
            console.log('Updated invoice number:', displayInvoiceNumber);
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
                <button class="btn primary-btn" id="sendInvoiceBtn" type="button">
                    <i class="fas fa-paper-plane"></i> Send
                </button>
            `;
            // Add event listeners for the action buttons
            const downloadPdfBtn = document.getElementById('downloadPdfBtn');
            const sendInvoiceBtn = document.getElementById('sendInvoiceBtn');
            if (downloadPdfBtn) {
                downloadPdfBtn.disabled = false;
                downloadPdfBtn.addEventListener('click', async () => {
                    try {
                        downloadPdfBtn.disabled = true;
                        downloadPdfBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
                        const currentInvoiceData = JSON.parse(previewContainer.dataset.currentInvoice || '{}');
                        if (!currentInvoiceData || !currentInvoiceData.invoice?.number) {
                            throw new Error('No valid invoice data found');
                        }
                        // Ensure correct invoice number is passed to PDF.js
                        currentInvoiceData.invoiceNumber = currentInvoiceData.invoice?.displayNumber || currentInvoiceData.invoice?.number;
                        currentInvoiceData.invoice_number = currentInvoiceData.invoice?.displayNumber || currentInvoiceData.invoice?.number;
                        console.log('[Preview] Download PDF for displayInvoiceNumber:', currentInvoiceData.invoice.displayNumber, 'invoiceNumber:', currentInvoiceData.invoice.number);
                        showNotification('Generating PDF...', 'info');
                        // Pass watermark for preview
                        const pdfBlob = await window.generatePDF(currentInvoiceData, { watermark: 'DRAFT' });
                        const downloadLink = document.createElement('a');
                        downloadLink.href = URL.createObjectURL(pdfBlob);
                        downloadLink.download = `Invoice-${currentInvoiceData.invoice.number}.pdf`;
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                        showNotification('PDF downloaded successfully', 'success');
                        console.log('[Preview] PDF download success for displayInvoiceNumber:', currentInvoiceData.invoice.displayNumber, 'invoiceNumber:', currentInvoiceData.invoice.number);
                    } catch (error) {
                        console.error('Error downloading PDF:', error);
                        showNotification('Error generating PDF: ' + error.message, 'error');
                        console.error('[Preview] PDF download error');
                    } finally {
                        downloadPdfBtn.disabled = false;
                        downloadPdfBtn.innerHTML = '<i class="fas fa-download"></i> Download PDF';
                    }
                });
            }
            if (sendInvoiceBtn) {
                sendInvoiceBtn.disabled = false;
                sendInvoiceBtn.addEventListener('click', () => {
                    openEmailModal(safeData);
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
                    <span class="value">${displayInvoiceNumber}</span>
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

        // Determine if conversion is needed
        let showConversion = false;
        let rate = 1;
        let currency = formattedData.currency || 'MZN';
        if (window.invoiceForm && currency !== 'MZN' && window.invoiceForm.currentRate && !isNaN(window.invoiceForm.currentRate)) {
            showConversion = true;
            rate = window.invoiceForm.currentRate;
        }
        // Update the invoice totals in the preview
        const totalsSection = document.querySelector("#invoicePreviewContent .invoice-totals");
        if (totalsSection) {
            let discount = formattedData.invoice.discount || 0;
            let subtotal = formattedData.invoice.subtotal || 0;
            let discountAmount = 0;
            let subtotalAfterDiscount = subtotal;
            if (discount > 0) {
                discountAmount = discount;
                subtotalAfterDiscount = subtotal - discountAmount;
            }
            let totalsHtml = `
                <div class="totals-row">
                    <span>Subtotal:</span>
                    <span>MZN ${formatNumber(subtotal)}</span>
                </div>
                <div class="totals-row">
                    <span>Desconto:</span>
                    <span>- MZN ${formatNumber(discountAmount)}</span>
                </div>
                <div class="totals-row">
                    <span>Subtotal após Desconto:</span>
                    <span>MZN ${formatNumber(subtotalAfterDiscount)}</span>
                </div>
                <div class="totals-row">
                    <span>IVA (16%):</span>
                    <span>MZN ${formatNumber(formattedData.invoice.vat)}</span>
                </div>
                <div class="totals-row total">
                    <span>Total:</span>
                    <span>MZN ${formatNumber(formattedData.invoice.total)}</span>
                </div>
            `;
            if (showConversion) {
                const convertedSubtotal = window.invoiceForm.getConvertedAmount(subtotal);
                const convertedDiscount = window.invoiceForm.getConvertedAmount(discountAmount);
                const convertedSubtotalAfterDiscount = window.invoiceForm.getConvertedAmount(subtotalAfterDiscount);
                const convertedVat = window.invoiceForm.getConvertedAmount(formattedData.invoice.vat);
                const convertedTotal = window.invoiceForm.getConvertedAmount(formattedData.invoice.total);
                totalsHtml += `
                <div class=\"totals-row\">
                    <span>Subtotal:</span>
                    <span>${currency} ${formatNumber(convertedSubtotal)}</span>
                </div>
                <div class=\"totals-row\">
                    <span>Desconto:</span>
                    <span>- ${currency} ${formatNumber(convertedDiscount)}</span>
                </div>
                <div class=\"totals-row\">
                    <span>Subtotal após Desconto:</span>
                    <span>${currency} ${formatNumber(convertedSubtotalAfterDiscount)}</span>
                </div>
                <div class=\"totals-row\">
                    <span>IVA (16%):</span>
                    <span>${currency} ${formatNumber(convertedVat)}</span>
                </div>
                <div class=\"totals-row total\">
                    <span>Total:</span>
                    <span>${currency} ${formatNumber(convertedTotal)}</span>
                </div>
                <div class=\"totals-row\" style=\"font-size:0.95em;color:#555;\">
                    <span></span>
                    <span>1 MZN ≈ ${rate.toFixed(4)} ${currency}</span>
                </div>
                `;
            }
            totalsSection.innerHTML = totalsHtml;
        }
        // Update items table with proper formatting
        const itemsTable = document.querySelector("#invoicePreviewContent table tbody");
        if (itemsTable) {
            let itemsHtml = formattedData.items.map(item => {
                let row = `<tr>
                    <td>${item.description}</td>
                    <td>${item.quantity}</td>
                    <td>MZN ${formatNumber(item.price)}</td>
                    <td>MZN ${formatNumber(item.vat)}</td>
                    <td>MZN ${formatNumber(item.total)}</td>
                </tr>`;
                if (showConversion) {
                    row += `<tr style=\"font-size:0.95em;color:#555;\">
                        <td></td>
                        <td></td>
                        <td>${currency} ${formatNumber(window.invoiceForm.getConvertedAmount(item.price))}</td>
                        <td>${currency} ${formatNumber(window.invoiceForm.getConvertedAmount(item.vat))}</td>
                        <td>${currency} ${formatNumber(window.invoiceForm.getConvertedAmount(item.total))}</td>
                    </tr>`;
                }
                return row;
            }).join('');
            itemsTable.innerHTML = itemsHtml;
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

/**
 * Fetch the logo_url from appearance_settings for the current user
 * @returns {Promise<string>} The logo URL or empty string
 */
async function getAppearanceLogoUrl() {
    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session || !session.user) return '';
        const { data: appearanceData, error } = await window.supabase
            .from('appearance_settings')
            .select('logo_url')
            .eq('user_id', session.user.id)
            .single();
        if (error || !appearanceData) return '';
        return appearanceData.logo_url || '';
    } catch (e) {
        return '';
    }
}

// Attach to window for global access
window.previewInvoice = previewInvoice;
window.downloadInvoicePdf = downloadInvoicePdf;
window.openEmailModal = openEmailModal;

// --- EMAIL SENDING LOGIC FOR EMAIL MODAL ---
document.addEventListener('DOMContentLoaded', function() {
    const emailForm = document.getElementById('emailInvoiceForm');
    if (emailForm) {
        emailForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const loading = emailForm.querySelector('.loading-indicator');
            if (loading) loading.style.display = '';
            const to = document.getElementById('emailTo').value;
            const subject = document.getElementById('emailSubject').value;
            const message = document.getElementById('emailMessage').value;
            const attachPdf = document.getElementById('emailAttachPdf').checked;
            try {
                let sendResult = false;
                let body = { to, subject, message };
                if (attachPdf) {
                    // Get invoice data from preview
                    const previewContainer = document.getElementById('invoicePreviewContent');
                    let invoiceData = null;
                    try {
                        invoiceData = JSON.parse(previewContainer.dataset.currentInvoice || '{}');
                    } catch {}
                    if (!invoiceData) throw new Error('No invoice data available for PDF attachment');
                    if (typeof window.generatePDF === 'function') {
                        const pdfBlob = await window.generatePDF(invoiceData);
                        // Convert PDF Blob to base64
                        const pdfBase64 = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                                const base64 = reader.result.split(',')[1];
                                resolve(base64);
                            };
                            reader.onerror = reject;
                            reader.readAsDataURL(pdfBlob);
                        });
                        body.attachment = {
                            filename: `Invoice-${invoiceData.invoice?.number || invoiceData.invoiceNumber || 'invoice'}.pdf`,
                            content: pdfBase64,
                            contentType: 'application/pdf'
                        };
                    } else {
                        throw new Error('PDF generation not available');
                    }
                }
                // Send to backend (directly, not using sendNotificationEmail)
                const apiUrl = window.getMailApiUrl ? window.getMailApiUrl() : '/sendmail';
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                let data = {};
                try { data = await response.json(); } catch {}
                sendResult = response.ok && data.success;
                if (sendResult) {
                    window.showNotification('Email sent successfully!', 'success');
                    // Close modal
                    const emailModal = document.getElementById('emailInvoiceModal');
                    if (emailModal) emailModal.classList.remove('active');
                    document.body.classList.remove('modal-open');
                } else {
                    window.showNotification('Failed to send email. Please try again.', 'error');
                }
            } catch (err) {
                window.showNotification('Error sending email: ' + (err.message || err), 'error');
            } finally {
                if (loading) loading.style.display = 'none';
            }
        });
    }
});

// Provide a window.invoicePreview object for compatibility
window.invoicePreview = {
    showPreview: previewInvoice,
    openPreview: async function() {
        // Try to get form data from the form if available
        if (typeof getCurrentFormData === 'function') {
            const data = getCurrentFormData();
            if (data) {
                await previewInvoice(data);
                return;
            }
        }
        showNotification('No invoice data available for preview', 'error');
    }
};

// Event listeners for preview and send buttons

document.getElementById('previewInvoiceBtn')?.addEventListener('click', () => {
    window.modalManager.openModal('viewInvoiceModal');
});

document.getElementById('sendInvoiceBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    // Get invoice data from preview
    const previewContainer = document.getElementById('invoicePreviewContent');
    let invoiceData = null;
    try {
        invoiceData = JSON.parse(previewContainer.dataset.currentInvoice || '{}');
    } catch {}
    if (invoiceData) {
        openEmailModal(invoiceData);
    } else {
        window.showNotification('No invoice data available for email', 'error');
    }
});