// Modal Management Module

let modalState = {
    isPreviewMode: false
};

function openModal(modalId) {
    console.log('Opening modal:', modalId);
    const modal = document.getElementById(modalId);
    const overlay = document.querySelector('.modal-overlay');
    
    if (!modal) {
        console.error('Modal not found:', modalId);
        return;
    }
    
    if (!overlay) {
        console.error('Modal overlay not found');
        return;
    }
    
    try {
        modal.style.display = 'block';
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        // Initialize or reset form if it's the invoice creation modal
        if (modalId === 'invoiceModal' && typeof resetInvoiceForm === 'function') {
            resetInvoiceForm();
        }
        
        console.log('Modal opened successfully:', modalId);
    } catch (error) {
        console.error('Error opening modal:', error);
    }
}

function closeAllModals() {
    console.log('Closing all modals');
    try {
        const viewInvoiceModal = document.getElementById('viewInvoiceModal');
        const invoiceModal = document.getElementById('invoiceModal');
        const overlay = document.querySelector('.modal-overlay');
        
        // If we're in preview mode, just close the preview
        if (viewInvoiceModal && viewInvoiceModal.style.display === 'block' 
            && invoiceModal && invoiceModal.style.display === 'none') {
            viewInvoiceModal.style.display = 'none';
            invoiceModal.style.display = 'block';
            console.log('Closed preview mode');
            return;
        }
        
        // Otherwise close everything
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        
        if (overlay) {
            overlay.style.display = 'none';
        }
        
        document.body.style.overflow = ''; // Re-enable scrolling
        console.log('All modals closed successfully');
    } catch (error) {
        console.error('Error closing modals:', error);
    }
}

function setPreviewMode(isPreview) {
    console.log('Setting preview mode:', isPreview);
    modalState.isPreviewMode = isPreview;
}

function isInPreviewMode() {
    return modalState.isPreviewMode;
}

// Export functions
window.openModal = openModal;
window.closeAllModals = closeAllModals;
window.setPreviewMode = setPreviewMode;
window.isInPreviewMode = isInPreviewMode; 