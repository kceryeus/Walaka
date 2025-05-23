// Invoice Preview Management Module

/**
 * Preview invoice in modal
 * @param {Object} invoiceData - The invoice data
 */
async function previewInvoice(invoiceData) {
    try {
        // Generate HTML
        const html = await generateInvoiceHTML(invoiceData);
        
        // Create iframe for preview
        const previewContainer = document.getElementById('invoicePreviewContainer');
        previewContainer.innerHTML = '';
        
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = '600px';
        iframe.style.border = 'none';
        previewContainer.appendChild(iframe);
        
        // Write content to iframe
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        iframeDoc.open();
        iframeDoc.write(html);
        iframeDoc.close();
        
        // Show preview modal
        const previewModal = document.getElementById('invoicePreviewModal');
        previewModal.classList.remove('hidden');
    } catch (error) {
        console.error('Error generating preview:', error);
        alert('Error generating preview: ' + error.message);
    }
}

// Export functions
window.previewInvoice = previewInvoice; 