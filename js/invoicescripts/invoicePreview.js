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

// Export functions
window.previewInvoice = previewInvoice; 