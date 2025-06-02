/**
 * Calculate price for a single invoice item
 * @param {number} quantity - The quantity of items
 * @param {number} price - The unit price
 * @param {number} vatRate - The VAT rate in percentage
 * @returns {number} The total price including VAT
 */
function calculateItemPrice(quantity, price, vatRate) {
    const subtotal = quantity * price;
    const vatAmount = subtotal * (vatRate / 100);
    return subtotal + vatAmount;
}

/**
 * Calculate subtotal (without VAT) for all invoice items
 * @param {Array} items - Array of invoice items
 * @returns {number} The subtotal amount
 */
function calculateSubtotal(items) {
    return items.reduce((sum, item) => {
        return sum + (item.quantity * item.price);
    }, 0);
}

/**
 * Calculate total VAT for all invoice items
 * @param {Array} items - Array of invoice items
 * @returns {number} The total VAT amount
 */
function calculateVAT(items) {
    return items.reduce((sum, item) => {
        const subtotal = item.quantity * item.price;
        const vatAmount = subtotal * (item.vat / 100);
        return sum + vatAmount;
    }, 0);
}

/**
 * Calculate the final total including VAT and discount
 * @param {number} subtotal - The subtotal amount
 * @param {number} vatAmount - The VAT amount
 * @param {number} discount - The discount amount
 * @returns {number} The final total
 */
function calculateTotal(subtotal, vatAmount, discount) {
    return subtotal + vatAmount - discount;
}

/**
 * Check if an invoice is valid according to Mozambican requirements
 * @param {Object} invoiceData - The invoice data
 * @returns {Object} Validation result {valid: boolean, errors: string[]}
 */
function validateMozambicanInvoice(invoiceData) {
    const errors = [];
    
    // Check required fields according to Mozambican law
    if (!invoiceData.invoice.number) {
        errors.push('Invoice number is required');
    }
    
    if (!invoiceData.invoice.issueDate) {
        errors.push('Issue date is required');
    }
    
    if (!invoiceData.company.name) {
        errors.push('Company name is required');
    }
    
    if (!invoiceData.company.nuit) {
        errors.push('Company NUIT (Tax ID) is required');
    }
    
    if (!invoiceData.client.name) {
        errors.push('Client name is required');
    }
    
    if (!invoiceData.client.nuit) {
        errors.push('Client NUIT (Tax ID) is required');
    }
    
    if (!invoiceData.invoice.items || invoiceData.invoice.items.length === 0) {
        errors.push('Invoice must contain at least one item');
    }
    
    // More specific Mozambican validations can be added here
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}