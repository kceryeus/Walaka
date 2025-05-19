// Invoice Preview Management Module

function previewInvoice() {
    // Get invoice modal and set it to keep in background
    const invoiceModal = document.getElementById('invoiceModal');
    if (invoiceModal) {
        invoiceModal.style.display = 'none'; // Hide but don't fully close
    }

    try {
        if (typeof window.collectInvoiceData !== 'function') {
            throw new Error('Invoice data collection function not available');
        }

        const invoiceData = window.collectInvoiceData();
        
        // Update view modal for preview mode
        const timelineSection = document.querySelector('.invoice-view-footer');
        const modalFooter = document.querySelector('#viewInvoiceModal .modal-footer');
        if (timelineSection) timelineSection.style.display = 'none';
        if (modalFooter) modalFooter.style.display = 'none';
        
        // Update modal title and close button behavior
        const modalTitle = document.querySelector('#viewInvoiceModal .modal-header h2');
        const closeBtn = document.querySelector('#viewInvoiceModal .close-modal');
        if (modalTitle) modalTitle.textContent = 'Invoice Preview';
        if (closeBtn) {
            // Remove existing listeners
            closeBtn.replaceWith(closeBtn.cloneNode(true));
            // Add new close behavior
            document.querySelector('#viewInvoiceModal .close-modal').addEventListener('click', function() {
                document.getElementById('viewInvoiceModal').style.display = 'none';
                document.getElementById('invoiceModal').style.display = 'block';
            });
        }
        
        // Generate and display preview
        if (typeof window.generateInvoiceHTML === 'function') {
            window.generateInvoiceHTML(invoiceData).then(invoiceHTML => {
                const previewContainer = document.getElementById('invoicePreviewContent');
                if (previewContainer) {
                    previewContainer.innerHTML = `
                        <div class="invoice-a4">
                            ${invoiceHTML}
                        </div>
                    `;
                    document.getElementById('viewInvoiceModal').style.display = 'block';
                } else {
                    throw new Error('Preview container not found');
                }
            }).catch(error => {
                console.error('Error generating preview:', error);
                showNotification('Error generating preview: ' + error.message);
            });
        } else {
            throw new Error('Invoice preview generation function not available');
        }
    } catch (error) {
        console.error('Error in preview:', error);
        showNotification('Error: ' + error.message);
        // Show the invoice modal again if there was an error
        if (invoiceModal) {
            invoiceModal.style.display = 'block';
        }
    }
}

function openViewInvoiceModal(invoiceNumber) {
    // Show timeline and buttons for view mode
    const timelineSection = document.querySelector('.invoice-view-footer');
    const modalFooter = document.querySelector('#viewInvoiceModal .modal-footer');
    if (timelineSection) timelineSection.style.display = 'block';
    if (modalFooter) modalFooter.style.display = 'block';
    
    // Update modal title for viewing
    const modalTitle = document.querySelector('#viewInvoiceModal .modal-header h2');
    if (modalTitle) modalTitle.textContent = 'Invoice Details';
    
    // Initialize status manager and fetch invoice details
    const statusManager = new window.InvoiceStatusManager();
    statusManager.initialize(invoiceNumber).then(() => {
        fetchInvoiceDetails(invoiceNumber, statusManager);
    }).catch(error => {
        console.error('Error initializing status manager:', error);
        showNotification('Error loading invoice status');
    });
}

async function fetchInvoiceDetails(invoiceNumber, statusManager) {
    try {
        // Show loading state
        const previewContainer = document.getElementById('invoicePreviewContent');
        if (previewContainer) {
            previewContainer.innerHTML = '<div class="loading">Loading invoice...</div>';
        }

        // Fetch invoice data
        const { data: invoice, error } = await window.supabase
            .from('invoices')
            .select('*, clients(*)')
            .eq('invoiceNumber', invoiceNumber)
            .single();

        if (error) throw error;
        if (!invoice) throw new Error('Invoice not found');

        // Update invoice number display
        document.getElementById('viewInvoiceNumber').textContent = invoice.invoiceNumber;

        // Load PDF from storage if available
        if (invoice.pdf_url) {
            const previewContainer = document.getElementById('invoicePreviewContent');
            previewContainer.innerHTML = `
                <iframe src="${invoice.pdf_url}" width="100%" height="600px" frameborder="0"></iframe>
            `;
        }

        // Open the modal
        openModal('viewInvoiceModal');

    } catch (error) {
        console.error('Error fetching invoice:', error);
        showNotification('Error loading invoice: ' + error.message);
    }
}

async function fetchInvoiceTimeline(invoiceNumber) {
    try {
        const { data: timeline, error } = await window.supabase
            .from('invoice_timeline')
            .select('*')
            .eq('invoiceNumber', invoiceNumber)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return timeline || [
            {
                date: new Date().toISOString(),
                title: 'Invoice Created',
                active: true
            }
        ];
    } catch (error) {
        console.error('Error fetching timeline:', error);
        return [];
    }
}

function populateTimeline(timeline) {
    const timelineContainer = document.querySelector('.status-timeline');
    if (!timelineContainer || !timeline.length) return;

    timelineContainer.innerHTML = timeline.map(event => `
        <div class="timeline-item${event.active ? ' active' : ''}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <span class="timeline-date">${formatDate(event.date)}</span>
                <span class="timeline-title">${event.title}</span>
            </div>
        </div>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Export functions
window.previewInvoice = previewInvoice;
window.openViewInvoiceModal = openViewInvoiceModal;
window.fetchInvoiceDetails = fetchInvoiceDetails;
window.fetchInvoiceTimeline = fetchInvoiceTimeline;
window.populateTimeline = populateTimeline; 