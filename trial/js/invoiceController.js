import invoiceNumberService from './invoiceNumberService.js';

// ...existing code...

async function initializeForm() {
    try {
        // Get next invoice number
        const invoiceNumber = await invoiceNumberService.getNextInvoiceNumber();
        
        // Set invoice number and make readonly
        const invoiceNumberInput = document.getElementById('invoice-number');
        invoiceNumberInput.value = invoiceNumber;
        invoiceNumberInput.readOnly = true;
        invoiceNumberInput.style.backgroundColor = '#f5f5f5';
        
    } catch (error) {
        console.error('Error initializing form:', error);
        alert('Error generating invoice number. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', initializeForm);

// ...existing code...