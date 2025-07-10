// js/invoicescripts/eventListeners.js
// Handles all event listener setup for the invoice module

class InvoiceEventListeners {
    constructor() {
        // Ensure ModalManager is available
        if (!window.openModal) {
            console.error('ModalManager not initialized');
            return;
        }
        this.setupViewInvoiceEvents();
        this.setupDownloadEvents();
    }

    setupEventListeners() {
        // Create Invoice Button
        const createInvoiceBtn = document.getElementById('createInvoiceBtn');
        if (createInvoiceBtn) {
            createInvoiceBtn.addEventListener('click', async function(e) {
                if (createInvoiceBtn.disabled || createInvoiceBtn.classList.contains('trial-restricted')) {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                await window.openModal('invoiceModal');
                // --- Ensure form is reset and invoice number is generated ---
                if (window.invoiceForm && typeof window.invoiceForm.resetInvoiceForm === 'function') {
                    console.log('[EventListeners] Calling resetInvoiceForm after opening invoiceModal');
                    await window.invoiceForm.resetInvoiceForm();
                    console.log('[EventListeners] resetInvoiceForm completed');
                } else {
                    console.warn('[EventListeners] window.invoiceForm.resetInvoiceForm not found');
                }
            });
        }

        // Close modal buttons
        const closeButtons = document.querySelectorAll('.close-modal, #closeInvoiceBtn');
        closeButtons.forEach(button => {
            button.addEventListener('click', function() {
                window.modalManager.closeModal('viewInvoiceModal');
                window.modalManager.closeModal('emailInvoiceModal');
                window.modalManager.closeModal('invoiceModal');
                window.modalManager.closeModal('newClientModal');
            });
        });

        // Prevent closing when clicking inside modal content
        const modalContents = document.querySelectorAll('.modal-content');
        modalContents.forEach(content => {
            content.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        });

        // Payment terms dropdown
        const paymentTermsSelect = document.getElementById('paymentTerms');
        if (paymentTermsSelect) {
            paymentTermsSelect.addEventListener('change', function() {
                updateDueDate();
            });
        }

        // Issue date field
        const issueDateField = document.getElementById('issueDate');
        if (issueDateField) {
            issueDateField.addEventListener('change', function() {
                updateDueDate();
            });
        }

        // Preview button
        const previewBtn = document.getElementById('previewInvoiceBtn');
        if (previewBtn) {
            previewBtn.addEventListener('click', async function() {
                try {
                    // Get current form data
                    const invoiceData = await this.getCurrentFormData();
                    await window.previewInvoice(invoiceData);
                    
                    // Update download button handler
                    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
                    if (downloadPdfBtn) {
                        // Use the correct PDF generation function
                        downloadPdfBtn.onclick = () => window.generatePDF(invoiceData);
                    }
                } catch (error) {
                    console.error('Error in preview:', error);
                    showNotification('Error: ' + error.message);
                }
            }.bind(this));
        }

        // Template selector
        const templateSelector = document.getElementById('templateSelector');
        if (templateSelector) {
            templateSelector.addEventListener('change', function() {
                updateInvoiceTemplate(this.value);
            });
        }

        // Chart period buttons
        setupChartPeriodControls();
    }

    setupViewInvoiceEvents() {
        document.addEventListener('click', async (e) => {
            if (e.target.matches('.view-invoice-btn')) {
                const invoiceId = e.target.dataset.invoiceId;
                try {
                    const invoiceData = await this.fetchInvoiceData(invoiceId);
                    if (invoiceData) {
                        await window.invoicePreview.showPreview(invoiceData);
                    }
                } catch (error) {
                    console.error('Error viewing invoice:', error);
                    showNotification('Error loading invoice preview', 'error');
                }
            }
        });
    }

    setupDownloadEvents() {
        document.addEventListener('click', async (e) => {
            if (e.target.matches('#downloadPdfBtn')) {
                try {
                    // Get the current invoice data from the preview container
                    const previewContainer = document.getElementById('invoicePreviewContent');
                    if (!previewContainer) {
                        throw new Error('Preview container not found');
                    }

                    // Get the invoice data from the data attribute
                    const invoiceData = JSON.parse(previewContainer.dataset.currentInvoice || '{}');
                    if (!invoiceData || !invoiceData.invoiceNumber) {
                        throw new Error('No valid invoice data found');
                    }

                    showNotification('Generating PDF...', 'info');
                    
                    // Disable the download button while generating
                    const downloadBtn = document.getElementById('downloadPdfBtn');
                    if (downloadBtn) {
                        downloadBtn.disabled = true;
                        downloadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
                    }
                    
                    try {
                        // Generate and download the PDF
                        const pdfBlob = await window.generatePDF(invoiceData);
                        
                        // Create download link
                        const downloadLink = document.createElement('a');
                        downloadLink.href = URL.createObjectURL(pdfBlob);
                        downloadLink.download = `Invoice-${invoiceData.invoiceNumber}.pdf`;
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                        
                        showNotification('PDF downloaded successfully', 'success');
                    } finally {
                        // Re-enable the download button
                        if (downloadBtn) {
                            downloadBtn.disabled = false;
                            downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download PDF';
                        }
                    }
                } catch (error) {
                    console.error('Error downloading PDF:', error);
                    showNotification('Error generating PDF: ' + error.message, 'error');
                }
            }
        });
    }

    setupClientHandlers() {
        // Add Client Button
        const addClientBtn = document.getElementById('addClientBtn');
        const newClientModal = document.getElementById('newClientModal');
        if (addClientBtn) {
            addClientBtn.addEventListener('click', function() {
                if (newClientModal) {
                    const clientNameInput = document.getElementById('new-client-name');
                    if (clientNameInput) {
                        clientNameInput.value = document.getElementById('client-list').value;
                    }
                    window.openModal('newClientModal'); // Use the global function
                }
            });
        }

        // Client list change
        const clientList = document.getElementById('client-list');
        if (clientList) {
            clientList.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                const clientId = selectedOption.value;

                // Fetch and display client details
                if (clientId) {
                    const client = window.clients.find(c => c.id === clientId);
                    if (client) {
                        document.getElementById('clientEmail').value = client.email || '';
                        document.getElementById('clientAddress').value = client.billing_address || '';
                        document.getElementById('clientTaxId').value = client.customer_tax_id || '';
                    }
                } else {
                    // Clear fields if no client is selected
                    document.getElementById('clientEmail').value = '';
                    document.getElementById('clientAddress').value = '';
                    document.getElementById('clientTaxId').value = '';
                }
            });
        }
    }

    async fetchInvoiceData(invoiceId) {
        try {
            // Fetch invoice details
            const { data: invoice, error } = await window.supabase
                .from('invoices')
                .select(`
                    *,
                    clients:client_id (*),
                    invoice_items:invoice_items (*)
                `)
                .eq('id', invoiceId)
                .single();

            if (error) throw error;
            if (!invoice) throw new Error('Invoice not found');

            // Get business profile
            const businessProfile = await getBusinessProfile();

            // Format the data
            return {
                invoiceNumber: invoice.invoiceNumber,
                issue_date: invoice.issue_date,
                due_date: invoice.due_date,
                company_name: businessProfile.company_name || 'Your Company Name',
                company_address: businessProfile.address || 'Your Company Address',
                client_name: invoice.clients.customer_name,
                client_address: invoice.clients.billing_address,
                client_tax_id: invoice.clients.customer_tax_id,
                items: invoice.invoice_items.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    vat: item.vat,
                    total: item.total
                })),
                subtotal: invoice.subtotal,
                vat: invoice.vat,
                total: invoice.total,
                notes: invoice.notes || ''
            };
        } catch (error) {
            console.error('Error fetching invoice data:', error);
            showNotification('Error fetching invoice data', 'error');
            throw error;
        }
    }

    // Helper function to get current form data
    async getCurrentFormData() {
        const form = document.getElementById('invoiceForm');
        if (!form) return null;

        // Get all the necessary form fields
        return {
            invoiceNumber: document.getElementById('invoiceNumber')?.value,
            issueDate: document.getElementById('issueDate')?.value,
            dueDate: document.getElementById('dueDate')?.value,
            currency: document.getElementById('currency')?.value || 'MZN',
            client: {
                customer_name: document.getElementById('client-list')?.value,
                email: document.getElementById('clientEmail')?.value,
                billing_address: document.getElementById('clientAddress')?.value,
                customer_tax_id: document.getElementById('clientTaxId')?.value
            },
            items: Array.from(document.querySelectorAll('#itemsTable tbody tr')).map(row => ({
                description: row.querySelector('.item-description')?.value,
                quantity: parseFloat(row.querySelector('.item-quantity')?.value) || 0,
                price: parseFloat(row.querySelector('.item-price')?.value) || 0,
                vat: parseFloat(row.querySelector('.item-vat')?.textContent) || 0,
                total: parseFloat(row.querySelector('.item-total')?.textContent) || 0
            })),
            subtotal: parseFloat(document.getElementById('subtotal')?.textContent) || 0,
            totalVat: parseFloat(document.getElementById('totalVat')?.textContent) || 0,
            total: parseFloat(document.getElementById('invoiceTotal')?.textContent) || 0,
            notes: document.getElementById('notes')?.value,
            paymentTerms: document.getElementById('paymentTerms')?.value
        };
    }

    // Run setupEventListeners on load
    static init() {
        const instance = new InvoiceEventListeners();
        instance.setupEventListeners();
    }
}

// Initialize event listeners on window load
window.addEventListener('load', () => {
    InvoiceEventListeners.init();
});

window.openModal = openModal;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof window.setupCharts === 'function') {
        window.setupCharts();
        // Set default to last 30 days
        if (typeof window.updateInvoiceDistributionChart === 'function') {
            window.updateInvoiceDistributionChart('last30');
        }
        // Setup new period controls
        if (typeof window.setupChartPeriodControls === 'function') {
            window.setupChartPeriodControls();
        }
    }
    // ... rest of your event listeners ...
});
