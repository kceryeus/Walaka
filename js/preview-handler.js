document.addEventListener('DOMContentLoaded', function() {
    const previewBtn = document.getElementById('previewInvoiceBtn');
    const viewInvoiceModal = document.getElementById('viewInvoiceModal');
    
    if (previewBtn) {
        previewBtn.addEventListener('click', handlePreviewClick);
    }
    
    async function handlePreviewClick() {
        // Gather form data
        const invoiceData = {
            company: {
                name: document.getElementById('company-name')?.textContent,
                address: document.getElementById('company-address')?.textContent,
                email: document.getElementById('company-email')?.textContent,
                phone: document.getElementById('company-phone')?.textContent,
                nuit: document.getElementById('company-nuit')?.textContent,
                softwareCertNo: document.getElementById('software-cert-no')?.textContent
            },
            client: {
                name: document.getElementById('client-list')?.value,
                address: document.getElementById('clientAddress')?.value,
                email: document.getElementById('clientEmail')?.value,
                nuit: document.getElementById('clientTaxId')?.value
            },
            invoice: {
                number: document.getElementById('invoiceNumber')?.value,
                issueDate: document.getElementById('issueDate')?.value,
                dueDate: document.getElementById('dueDate')?.value,
                currency: document.getElementById('currency')?.value,
                items: getInvoiceItems(),
                totals: {
                    subtotal: parseFloat(document.getElementById('subtotal')?.textContent || '0'),
                    vat: parseFloat(document.getElementById('totalVat')?.textContent || '0'),
                    total: parseFloat(document.getElementById('invoiceTotal')?.textContent || '0')
                },
                notes: document.getElementById('notes')?.value
            },
            template: {
                name: 'template01', // Default template
                color: getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim()
            }
        };
        
        // Show preview modal
        if (viewInvoiceModal) {
            // Preview invoice - this function now handles showing the modal
            await window.invoiceTemplateManager.previewInvoice(invoiceData);
        }
    }
    
    function getInvoiceItems() {
        const items = [];
        const rows = document.querySelectorAll('.item-row');
        
        rows.forEach(row => {
            items.push({
                description: row.querySelector('.item-description')?.value,
                quantity: parseFloat(row.querySelector('.item-quantity')?.value || '0'),
                price: parseFloat(row.querySelector('.item-price')?.value || '0'),
                vat: 16, // Fixed VAT rate
                total: parseFloat(row.querySelector('.item-total')?.textContent || '0')
            });
        });
        
        return items;
    }
    
    // Close modal handler
    const closeButtons = document.querySelectorAll('.close-modal, #closeInvoiceBtn');
    closeButtons.forEach(button => {
        button.addEventListener('click', () => {
            viewInvoiceModal.classList.remove('active');
            document.body.classList.remove('modal-open');
            const modalOverlay = document.querySelector('.modal-overlay');
            if (modalOverlay) {
                 modalOverlay.classList.remove('active'); // Assuming overlay also uses active class
            }
        });
    });
});
