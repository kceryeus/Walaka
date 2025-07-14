/**
 * Generate a PDF from the current invoice
 */
function generatePDF() {
    const invoiceData = collectInvoiceData();
    
    showLoading('Generating PDF...');
    
    // Get the template
    const templateName = getSelectedTemplate();
    
    loadTemplate(templateName)
        .then(templateContent => {
            // Create a document parser
            const parser = new DOMParser();
            const doc = parser.parseFromString(templateContent, 'text/html');
            
            // Populate template
            populateTemplate(doc, templateContent, invoiceData);
            
            // Get the updated HTML
            const serializer = new XMLSerializer();
            const updatedHTML = serializer.serializeToString(doc);
            
            // Generate PDF using jsPDF and html2canvas 
            // Note: In a production environment, you would include these libraries
            // Here we'll simulate the PDF generation with a timeout
            
            setTimeout(() => {
                // This is where jsPDF would create the PDF
                console.log('PDF would be generated here with contents:', updatedHTML);
                
                // Create a download link for demonstration purposes
                const blob = new Blob([updatedHTML], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = generateFilename(invoiceData);
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                hideLoading();
                
                alert('In a production environment, this would generate a PDF. For demonstration, an HTML file has been downloaded.');
            }, 1000);
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
    const { number } = invoiceData.invoice;
    const { name } = invoiceData.client;
    
    // Create a clean client name (no special characters)
    const cleanClientName = name.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_');
    
    // Generate filename
    return `Invoice_${number}_${cleanClientName}.html`;
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