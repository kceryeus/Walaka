// js/invoicescripts/eventListeners.js
// Handles all event listener setup for the invoice module

function setupEventListeners() {
    // Create Invoice Button
    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    if (createInvoiceBtn) {
        createInvoiceBtn.addEventListener('click', async function() {
            await openModal('invoiceModal');
        });
    }

    // Close modal buttons
    const closeButtons = document.querySelectorAll('.close-modal, #closeInvoiceBtn');
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            closeAllModals();
        });
    });

    // Modal overlay click to close
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function() {
            closeAllModals();
        });
    }

    // Prevent closing when clicking inside modal content
    const modalContents = document.querySelectorAll('.modal-content');
    modalContents.forEach(content => {
        content.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });

    // Add item button
    const addItemBtn = document.getElementById('addItemBtn');
    if (addItemBtn && window.invoiceItems) {
        addItemBtn.addEventListener('click', () => window.invoiceItems.addInvoiceItem());
    }

    // View Invoice buttons
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const invoiceNumber = this.getAttribute('data-invoice');
            openViewInvoiceModal(invoiceNumber);
        });
    });

    // Payment terms dropdown
    const paymentTermsSelect = document.getElementById('paymentTerms');
    if (paymentTermsSelect) {
        paymentTermsSelect.addEventListener('change', function() {
            updateDueDate();
        });
    }

    // Issue date field
    const issueDateField = document.getElementById('issueDate');
    if (issueDateField) {
        issueDateField.addEventListener('change', function() {
            updateDueDate();
        });
    }

    // Form submission
    const invoiceForm = document.getElementById('invoiceForm');
    if (invoiceForm) {
        invoiceForm.addEventListener('submit', async function (event) {
            event.preventDefault();

            // Prevent duplicate submissions
            if (invoiceForm.dataset.submitting === 'true') return;
            invoiceForm.dataset.submitting = 'true';

            try {
                const invoiceNumberField = document.getElementById('invoiceNumber');
                if (!invoiceNumberField.value) {
                    throw new Error('Invoice number is missing');
                }
                await saveInvoice();
            } catch (error) {
                console.error('Error submitting form:', error);
                showNotification('Error: ' + error.message);
            } finally {
                invoiceForm.dataset.submitting = 'false'; // Reset the flag
            }
        });
    }

    // Preview button
    const previewBtn = document.getElementById('previewInvoiceBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', async function() {
            try {
                const invoiceData = collectInvoiceData();
                await previewInvoice(invoiceData);
            } catch (error) {
                console.error('Error in preview:', error);
                showNotification('Error: ' + error.message);
            }
        });
    }

    // Template selector
    const templateSelector = document.getElementById('templateSelector');
    if (templateSelector) {
        templateSelector.addEventListener('change', function() {
            updateInvoiceTemplate(this.value);
        });
    }

    // Chart period buttons
    setupChartPeriodControls();
}

// Run setupEventListeners on load
setupEventListeners();

window.openModal = openModal;
