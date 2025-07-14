/**
 * Generate a hash code for invoice verification
 * @param {Object} invoiceData - The invoice data
 * @returns {string} The hash code
 */
function generateInvoiceHash(invoiceData) {
    // Create a string from the important invoice data
    const hashInput = `${invoiceData.invoice.number}|${invoiceData.invoice.issueDate}|${invoiceData.client.nuit}|${invoiceData.company.nuit}|${invoiceData.invoice.totals.total}`;
    
    // Simple hash function for demonstration purposes
    // In a real application, use a cryptographic hash function
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
        const char = hashInput.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    
    // Convert to hexadecimal string and ensure it's 8 characters
    const hashHex = Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8).toUpperCase();
    
    return hashHex;
}

/**
 * Format a date string to the Mozambican format
 * @param {string} dateString - The date string in any format
 * @returns {string} Formatted date string (e.g., "31/12/2023")
 */
function formatDate(dateString) {
    if (!dateString) return '';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            // If the date is not valid, just return the original string
            return dateString;
        }
        
        // Format as DD/MM/YYYY
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
    } catch (e) {
        console.error('Error formatting date:', e);
        return dateString;
    }
}