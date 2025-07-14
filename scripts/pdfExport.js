/**
 * Generate a PDF from the current invoice
 */
function generatePDF() {
    const invoiceData = collectInvoiceData();
    
    showLoading('Generating PDF from preview...');
    
    // Get the element that contains the invoice preview
    const invoicePreviewElement = document.getElementById('invoicePreviewContent');
    
    if (!invoicePreviewElement) {
        console.error('Invoice preview element not found!');
        hideLoading();
        alert('Could not find invoice preview content to generate PDF.');
        return;
    }
    
    // Configure html2pdf options
    const opt = {
        margin: [10, 10, 10, 10], // Slightly smaller margins to give more space
        filename: generateFilename(invoiceData),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2, // Keep a good scale for quality
            useCORS: true,
            letterRendering: true,
            scrollY: 0,
            // Attempt to fix table rendering issues
            allowTaint: true, // Allow loading images from the same origin without CORS issues
            ignoreElements: (element) => {
                // Ignore elements that are not part of the core invoice content if needed
                // e.g., return element.id === 'ignoreThis';
                return false; // For now, capture everything
            }
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    };
    
    // Generate PDF directly from the preview element
    html2pdf().set(opt).from(invoicePreviewElement).save()
        .then(() => {
            hideLoading();
        })
        .catch(error => {
            console.error('Error generating PDF:', error);
            hideLoading();
            alert('Failed to generate PDF. Please check the console for errors.');
        });
}

/**
 * Generate a filename for the PDF
 * @param {Object} invoiceData - The invoice data
 * @returns {string} The generated filename
 */
function generateFilename(invoiceData) {
    // Check if invoiceData and its properties are defined before accessing them
    const number = invoiceData?.invoice?.number || 'unknown';
    const name = invoiceData?.client?.name || 'client';
    
    // Create a clean client name (no special characters)
    const cleanClientName = name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    
    // Generate filename
    return `Invoice_${number}_${cleanClientName}.pdf`; // Changed extension to pdf
}

/**
 * Show a loading indicator
 * @param {string} message - The loading message to display
 */
function showLoading(message) {
    // Create loading overlay if it doesn't exist
    let loadingOverlay = document.getElementById('loading-overlay');
    
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.style.position = 'fixed';
        loadingOverlay.style.top = '0';
        loadingOverlay.style.left = '0';
        loadingOverlay.style.width = '100%';
        loadingOverlay.style.height = '100%';
        loadingOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        loadingOverlay.style.display = 'flex';
        loadingOverlay.style.justifyContent = 'center';
        loadingOverlay.style.alignItems = 'center';
        loadingOverlay.style.zIndex = '9999';
        
        const loadingContent = document.createElement('div');
        loadingContent.style.backgroundColor = '#fff';
        loadingContent.style.padding = '20px';
        loadingContent.style.borderRadius = '5px';
        loadingContent.style.textAlign = 'center';
        
        const spinner = document.createElement('div');
        spinner.style.border = '5px solid #f3f3f3';
        spinner.style.borderTop = '5px solid #4CAF50';
        spinner.style.borderRadius = '50%';
        spinner.style.width = '50px';
        spinner.style.height = '50px';
        spinner.style.animation = 'spin 2s linear infinite';
        spinner.style.margin = '0 auto 15px';
        
        const style = document.createElement('style');
        style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
        
        const messageElement = document.createElement('p');
        messageElement.id = 'loading-message';
        messageElement.style.margin = '0';
        messageElement.style.fontFamily = "'Inter', sans-serif";
        
        loadingContent.appendChild(spinner);
        loadingContent.appendChild(messageElement);
        loadingOverlay.appendChild(loadingContent);
        document.head.appendChild(style);
        document.body.appendChild(loadingOverlay);
    }
    
    // Update message
    document.getElementById('loading-message').textContent = message;
    
    // Show overlay
    loadingOverlay.style.display = 'flex';
}

/**
 * Hide the loading indicator
 */
function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}