// Helper to robustly parse amounts in European/Portuguese format (e.g., '29 000,00' -> 29000.00)
function parseAmount(str) {
    if (typeof str !== 'string') str = String(str);
    // Remove all spaces (thousands separator)
    str = str.replace(/\s/g, '');
    // Replace the last comma with a dot (decimal separator)
    const lastComma = str.lastIndexOf(',');
    if (lastComma !== -1) {
        str = str.slice(0, lastComma).replace(/,/g, '') + '.' + str.slice(lastComma + 1);
    }
    return parseFloat(str);
}
// Invoice Management Module JavaScript

// Add module state tracking
let invoiceModuleInitialized = false;
let invoiceDistributionChartInstance = null;
let revenueByStatusChartInstance = null;

// Add robust global getCurrentEnvironmentId for invoice environment logic (fetch from users table)
window.getCurrentEnvironmentId = async function() {
    let envId = localStorage.getItem('currentEnvironmentId');
    if (envId) return envId;
    try {
        const userRes = await window.supabase.auth.getUser();
        const user_id = userRes?.data?.user?.id;
        if (!user_id) return null;
        const { data: userRow, error } = await window.supabase
            .from('users')
            .select('environment_id')
            .eq('id', user_id)
            .single();
        if (!error && userRow && userRow.environment_id) {
            envId = userRow.environment_id;
            localStorage.setItem('currentEnvironmentId', envId);
            return envId;
        }
    } catch (e) {
        // fallback
    }
    return null;
};

function initializeInvoiceModule() {
    if (invoiceModuleInitialized) {
        console.warn('Attempted to initialize invoice module multiple times!');
        return;
    }
    
    console.log('Invoice Management Module initialized');
    invoiceModuleInitialized = true;
    
    initializeDateFields();
}

function openModal(modalId) {
    window.modalManager.openModal(modalId);
}

function closeAllModals() {
    const viewInvoiceModal = document.getElementById('viewInvoiceModal');
    const invoiceModal = document.getElementById('invoiceModal');
    const overlay = document.querySelector('.modal-overlay');
    
    // If we're in preview mode, just close the preview
    if (viewInvoiceModal && viewInvoiceModal.style.display === 'block' 
        && invoiceModal.style.display === 'none') {
        viewInvoiceModal.style.display = 'none';
        invoiceModal.style.display = 'block';
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
}

function setupItemCalculations() {
    // Add event listeners for quantity and price changes
    // Removed global listeners as they are handled by InvoiceItems class
    // document.addEventListener('input', function(e) {
    //     if (e.target.classList.contains('item-description')) {
    //         const searchTerm = e.target.value.toLowerCase().trim();
    //         const row = e.target.closest('.item-row');
            
    //         if (searchTerm.length < 2) {
    //             hideProductSuggestions(row);
    //             hideNewProductForm(row);
    //             return;
    //         }

    //         handleProductSearch(searchTerm, row);
    //     }

    //     if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-price')) {
    //         const row = e.target.closest('.item-row');
    //         if (row) {
    //             calculateRowTotal(row);
    //             updateInvoiceTotals();
    //         }
    //     }
    // });
}

function handleProductSearch(searchTerm, row) {
    (async function() {
        try {
            const { data: products, error } = await window.supabase
                .from('products')
                .select('*')
                .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
                .limit(5);

            if (error) throw error;

            if (products && products.length > 0) {
                showProductSuggestions(row, products);
                hideNewProductForm(row);
            } else {
                hideProductSuggestions(row);
                showNewProductForm(row);
            }
        } catch (err) {
            console.error('Error searching products:', err);
        }
    })();
}

function showProductSuggestions(row, products) {
    const input = row.querySelector('.item-description');
    if (!input) return;
    
    let suggestionsBox = row.querySelector('.product-suggestions');
    if (!suggestionsBox) {
        suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'product-suggestions';
        input.parentNode.appendChild(suggestionsBox);
    }

    suggestionsBox.innerHTML = products.map(product => `
        <div class="suggestion-item" data-product='${JSON.stringify(product)}'>
            <div class="suggestion-content">
                <strong>${product.name || ''}</strong>
                <small>${product.description || ''}</small>
            </div>
            <div class="suggestion-price">${formatCurrency(product.price)}</div>
        </div>
    `).join('');

    suggestionsBox.style.display = 'block';

    // Add click handlers
    suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            const product = JSON.parse(this.dataset.product);
            fillProductDetails(row, product);
            hideProductSuggestions(row);
        });
    });
}

function fillProductDetails(row, product) {
    if (!row || !product) return;

    const descriptionInput = row.querySelector('.item-description');
    const priceInput = row.querySelector('.item-price');
    const quantityInput = row.querySelector('.item-quantity');
    
    // Fill in the product details
    if (descriptionInput) descriptionInput.value = product.name || product.description || '';
    if (priceInput) priceInput.value = product.price || 0;
    if (quantityInput) quantityInput.value = 1; // Default quantity
    
    // Set VAT rate based on product tax_rate or default to 16%
    const vatRate = product.tax_rate || 0.16;
    
    // Calculate totals
    calculateRowTotal(row);
    updateInvoiceTotals();
}

function showNewProductForm(row) {
    let newProductForm = row.querySelector('.new-product-form');
    if (!newProductForm) {
        newProductForm = document.createElement('div');
        newProductForm.className = 'new-product-form';
        newProductForm.innerHTML = `
            <h4>Add New Product</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>Price</label>
                    <input type="number" class="new-product-price" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label>VAT Rate</label>
                    <select class="new-product-vat">
                        <option value="0.16">16%</option>
                        <option value="0.05">5%</option>
                        <option value="0">Exempt</option>
                    </select>
                </div>
                <button type="button" class="save-product-btn">Save & Use</button>
            </div>
        `;
        row.querySelector('td:first-child').appendChild(newProductForm);

        // Add save handler
        newProductForm.querySelector('.save-product-btn').addEventListener('click', async () => {
            await saveNewProduct(row);
        });
    }
    newProductForm.style.display = 'block'; // Ensure the form is visible
    newProductForm.querySelector('.new-product-price').focus(); // Focus the input field
}

function hideProductSuggestions(row) {
    const suggestionsBox = row.querySelector('.product-suggestions');
    if (suggestionsBox) {
        suggestionsBox.style.display = 'none';
    }
}

function hideNewProductForm(row) {
    const newProductForm = row.querySelector('.new-product-form');
    if (newProductForm) {
        newProductForm.style.display = 'none';
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: 'MZN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function calculateRowTotal(row) {
    const quantity = parseAmount(row.querySelector('.item-quantity').value) || 0;
    const price = parseAmount(row.querySelector('.item-price').value) || 0;
    
    const subtotal = quantity * price;
    const vat = subtotal * 0.16; // 16% VAT
    
    row.querySelector('.item-vat').textContent = formatCurrency(vat);
    row.querySelector('.item-total').textContent = formatCurrency(subtotal + vat);
}

function updateInvoiceTotals() {
    const rows = document.querySelectorAll('.item-row');
    let subtotal = 0;
    let totalVat = 0;
    
    rows.forEach(row => {
        const quantity = parseAmount(row.querySelector('.item-quantity').value) || 0;
        const price = parseAmount(row.querySelector('.item-price').value) || 0;
        
        const rowSubtotal = quantity * price;
        const rowVat = rowSubtotal * 0.16;
        
        subtotal += rowSubtotal;
        totalVat += rowVat;
    });
    
    const grandTotal = subtotal + totalVat;
    
    document.getElementById('subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('totalVat').textContent = formatCurrency(totalVat);
    document.getElementById('invoiceTotal').textContent = formatCurrency(grandTotal);
}

function addInvoiceItem() {
    const itemsTableBody = document.querySelector('#itemsTable tbody');
    const newRowHTML = `
        <tr class="item-row">
            <td>
                <input type="text" class="item-description" placeholder="Enter item description">
            </td>
            <td>
                <input type="number" class="item-quantity" value="1" min="1" step="1">
            </td>
            <td>
                <input type="number" class="item-price" value="0.00" min="0" step="0.01">
            </td>
            <td>
                <span class="item-vat">0.00</span>
            </td>
            <td>
                <span class="item-total">0.00</span>
            </td>
            <td>
                <button type="button" class="remove-item-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
    
    itemsTableBody.insertAdjacentHTML('beforeend', newRowHTML);
    
    // Initialize the new row and set up event listeners
    const newRow = itemsTableBody.lastElementChild;
    if (window.invoiceItems && typeof window.invoiceItems.setupRowEventListeners === 'function') {
        window.invoiceItems.setupRowEventListeners(newRow);
    } else {
        console.error('InvoiceItems module or setupRowEventListeners not available.');
        // Fallback: Manually add listeners if the module is not available
        setupRowEventListeners(newRow); // Assuming a local fallback function exists
    }
    
    calculateRowTotal(newRow);
    updateInvoiceTotals();
}

function initializeDateFields() {
    const issueDate = document.getElementById('issueDate');
    const dueDate = document.getElementById('dueDate');
    
    if (issueDate && dueDate) {
        // Set issue date to today's date if not already set
        if (!issueDate.value) {
            const today = new Date();
            const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
            issueDate.value = formattedDate;
        }
        
        // Set due date based on payment terms
        updateDueDate();
    }
}

function updateDueDate() {
    const issueDate = document.getElementById('issueDate');
    const dueDate = document.getElementById('dueDate');
    const paymentTerms = document.getElementById('paymentTerms');
    
    if (issueDate && dueDate && paymentTerms) {
        const selectedDate = new Date(issueDate.value);
        
        if (isNaN(selectedDate.getTime())) {
            return; // Invalid date
        }
        
        let daysToAdd = 30; // Default to Net-30
        
        switch (paymentTerms.value) {
            case 'net15':
                daysToAdd = 15;
                break;
            case 'net30':
                daysToAdd = 30;
                break;
            case 'net60':
                daysToAdd = 60;
                break;
            // For 'custom', let the user enter manually
            case 'custom':
                return;
        }
        
        const newDueDate = new Date(selectedDate);
        newDueDate.setDate(newDueDate.getDate() + daysToAdd);
        
        const formattedDueDate = newDueDate.toISOString().split('T')[0]; // YYYY-MM-DD format
        dueDate.value = formattedDueDate;
    }
}

// Import InvoiceNumberGenerator if not already imported
// (for non-module, attach to window if needed)
if (!window.InvoiceNumberGenerator) {
    // Dynamically load if not present
    const script = document.createElement('script');
    script.src = 'js/invoiceNumberGenerator.js';
    document.head.appendChild(script);
}

async function resetInvoiceForm() {
    const form = document.getElementById('invoiceForm');
    if (form) {
        form.reset();
        // Set currency to MZN by default
        const currencySelect = document.getElementById('currency');
        if (currencySelect) {
            currencySelect.value = 'MZN';
        }
        // Clear all invoice items except the first row
        const itemsTableBody = document.querySelector('#itemsTable tbody');
        const rows = itemsTableBody.querySelectorAll('.item-row');
        for (let i = 1; i < rows.length; i++) {
            rows[i].remove();
        }
        // Reset the first row
        const firstRow = itemsTableBody.querySelector('.item-row');
        if (firstRow) {
            const inputs = firstRow.querySelectorAll('input');
            inputs.forEach(input => {
                if (input.classList.contains('item-quantity')) {
                    input.value = '1';
                } else if (input.classList.contains('item-price')) {
                    input.value = '0.00';
                } else {
                    input.value = '';
                }
            });
            firstRow.querySelector('.item-vat').textContent = '0.00';
            firstRow.querySelector('.item-total').textContent = '0.00';
        }
        document.getElementById('subtotal').textContent = '0.00';
        document.getElementById('totalVat').textContent = '0.00';
        document.getElementById('invoiceTotal').textContent = '0.00';
        initializeDateFields();
        // Generate a new unique invoice number
        const invoiceNumberField = document.getElementById('invoiceNumber');
        if (invoiceNumberField) {
            try {
                const generator = new window.InvoiceNumberGenerator();
                // Fetch user_id from Supabase session
                let userId = null;
                try {
                    const session = await window.supabase.auth.getSession();
                    userId = session.data?.session?.user?.id;
                } catch (e) {
                    console.error('Could not fetch user session:', e);
                }
                // Get serie from form (default to 'A')
                let serie = document.getElementById('serie')?.value || 'A';
                if (!userId) throw new Error('User not authenticated. Please log in.');
                const newInvoiceNumber = await generator.getNextNumber(userId, serie);
                invoiceNumberField.value = newInvoiceNumber;
            } catch (err) {
                console.error('Error generating invoice number:', err);
                invoiceNumberField.value = '';
                showNotification('Error generating invoice number');
            }
        }
        // Show only the first step
        const steps = form.querySelectorAll('.step');
        steps.forEach((step, idx) => {
            step.style.display = idx === 0 ? '' : 'none';
        });
    }
}

function collectInvoiceData() {
    try {
        // Get required form elements with null checks
        const clientList = document.getElementById('client-list');
        const invoiceNumberInput = document.getElementById('invoiceNumber');
        const issueDateInput = document.getElementById('issueDate');
        const dueDateInput = document.getElementById('dueDate');
        const currencySelect = document.getElementById('currency');
        const paymentTermsSelect = document.getElementById('paymentTerms');
        const notesTextarea = document.getElementById('notes');
        const subtotalSpan = document.getElementById('subtotal');
        const totalVatSpan = document.getElementById('totalVat');
        const invoiceTotalSpan = document.getElementById('invoiceTotal');

        // Validate all required fields exist
        if (!clientList || !invoiceNumberInput || !issueDateInput || !dueDateInput || !currencySelect || !paymentTermsSelect || !notesTextarea || !subtotalSpan || !totalVatSpan || !invoiceTotalSpan) {
            throw new Error('One or more required form fields are missing');
        }

        // Get client data safely
        const clientName = clientList.value || '';
        const clientEmail = document.getElementById('clientEmail')?.value || '';
        const clientAddress = document.getElementById('clientAddress')?.value || '';
        const clientTaxId = document.getElementById('clientTaxId')?.value || '';
        // Assuming clientContact might be a separate field or part of client data
        const clientContact = ''; // Replace with actual field if it exists

        // Assuming companyData is available in the global scope or passed to this function
        // Ensure companyData structure matches what's needed
        const companyData = window.companyData || {}; // Replace with actual way companyData is accessed

        const invoiceData = {
            invoiceNumber: invoiceNumberInput.value,
            issueDate: issueDateInput.value,
            dueDate: dueDateInput.value,
            currency: currencySelect.value || 'MZN',
            // Use standardized client data keys
            client: {
                name: clientName,
                email: clientEmail,
                address: clientAddress,
                taxId: clientTaxId,
                contact: clientContact // Included as per your snippet
            },
            // Include company data
            company: companyData, // Included as per your snippet
            paymentTerms: paymentTermsSelect.value || 'net30',
            notes: notesTextarea.value || '',
            status: 'pending', // Default status for new invoices
            items: [],
            // Ensure these are numbers, not text content
            subtotal: parseAmount(subtotalSpan.textContent) || 0,
            totalVat: parseAmount(totalVatSpan.textContent) || 0,
            total: parseAmount(invoiceTotalSpan.textContent) || 0
        };

        // Validate required fields have values
        if (!invoiceData.invoiceNumber || !invoiceData.client.name) {
            throw new Error('Invoice number and client name are required');
        }

        // Collect items
        const itemRows = document.querySelectorAll('.item-row');
        itemRows.forEach(row => {
            const description = row.querySelector('.item-description')?.value;
            const quantity = parseAmount(row.querySelector('.item-quantity')?.value) || 0;
            const price = parseAmount(row.querySelector('.item-price')?.value) || 0;
            // Get VAT and Total directly from calculated spans
            const vat = parseAmount(row.querySelector('.item-vat')?.textContent) || 0; // Assuming item-vat is a span with text content
            const total = parseAmount(row.querySelector('.item-total')?.textContent) || 0; // Assuming item-total is a span with text content

            if (description && quantity > 0 && price >= 0) { // Ensure price is not negative and description/quantity are present
                invoiceData.items.push({
                    description,
                    quantity,
                    price,
                    vat,
                    total
                });
            }
        });

        // Validate invoice has items
        if (invoiceData.items.length === 0) {
            throw new Error('Invoice must have at least one item');
        }

        return invoiceData;
    } catch (error) {
        console.error('Error collecting invoice data:', error);
        throw new Error('Failed to collect invoice data: ' + error.message);
    }
}

// Utility: Fetch currency rate (MZN as base, similar to invoiceForm.js)
async function fetchCurrencyRate(currency) {
    if (currency === 'MZN') return 1;
    const cacheKey = `walaka_rates_${currency}`;
    const cached = sessionStorage.getItem(cacheKey);
    let rate = null;
    if (cached) {
        const { value, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 60 * 60 * 1000) {
            rate = value;
        }
    }
    if (!rate) {
        try {
            const res = await fetch('https://openexchangerates.org/api/latest.json?app_id=0a2208bb4ead48929a4485ae45dff65d&symbols=USD,EUR,GBP,MZN');
            const data = await res.json();
            if (data && data.rates && data.rates['MZN']) {
                if (currency === 'USD') {
                    rate = data.rates['USD'] / data.rates['MZN'];
                } else if (currency === 'EUR') {
                    rate = data.rates['EUR'] / data.rates['MZN'];
                } else if (currency === 'GBP') {
                    rate = data.rates['GBP'] / data.rates['MZN'];
                }
            }
            if (rate) {
                sessionStorage.setItem(cacheKey, JSON.stringify({ value: rate, timestamp: Date.now() }));
            }
        } catch (err) {
            rate = null;
        }
    }
    return rate && !isNaN(rate) ? rate : null;
}

async function saveInvoice() {
    try {
        // Prevent duplicate submissions
        const submitButton = document.querySelector('#invoiceForm button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        // Show loading state
        showNotification('Saving invoice...');
        
        // Collect and validate form data
        const invoiceData = collectInvoiceData();
        
        if (!invoiceData.invoiceNumber || !invoiceData.client.name) {
            throw new Error('Missing required fields');
        }

        // --- Fetch currency rate ---
        let currency_rate = 1;
        if (invoiceData.currency !== 'MZN') {
            currency_rate = await fetchCurrencyRate(invoiceData.currency);
            if (!currency_rate) {
                showNotification('Could not fetch currency rate. Please try again.', 'error');
                if (submitButton) submitButton.disabled = false;
                return;
            }
        }
        console.log('Using currency_rate:', currency_rate, 'for currency:', invoiceData.currency);

        // Generate PDF
        const pdfBlob = await window.generatePDF(invoiceData);
        
        if (!pdfBlob) {
            throw new Error('Failed to generate PDF');
        }

        // Get user session
        const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
        if (sessionError || !session) {
            throw new Error('Authentication required');
        }

        // Upload PDF to Supabase Storage with proper permissions
        const pdfFileName = `${invoiceData.invoiceNumber.replace(/\s+/g, '_')}_${session.user.id}.pdf`;
        const { data: uploadData, error: uploadError } = await window.supabase.storage
            .from('invoice_pdfs')
            .upload(pdfFileName, pdfBlob, {
                contentType: 'application/pdf',
                upsert: true,
                cacheControl: '3600',
                owner: session.user.id
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw new Error('Failed to upload PDF');
        }

        // Get public URL for the uploaded PDF
        const { data: { publicUrl } } = window.supabase.storage
            .from('invoice_pdfs')
            .getPublicUrl(pdfFileName);

        // Format dates
        const issueDate = new Date(invoiceData.issueDate);
        const dueDate = new Date(invoiceData.dueDate);

        // Save invoice data to database
        let environment_id = null;
        if (typeof window.getCurrentEnvironmentId === 'function') {
            environment_id = await window.getCurrentEnvironmentId();
        } else {
            console.warn('getCurrentEnvironmentId is not available, environment_id will be null');
        }
        const { data: invoice, error: insertError } = await window.supabase
            .from('invoices')
            .insert([{
                invoiceNumber: invoiceData.invoiceNumber,
                issue_date: issueDate.toISOString(),
                due_date: dueDate.toISOString(),
                client_id: invoiceData.client.id || null,
                status: 'pending',
                subtotal: invoiceData.subtotal,
                vat_amount: invoiceData.totalVat,
                total_amount: invoiceData.total,
                currency: invoiceData.currency,
                payment_terms: invoiceData.paymentTerms,
                notes: invoiceData.notes,
                pdf_url: publicUrl,
                customer_name: invoiceData.client.name,
                user_id: session.user.id, // Add user_id for RLS
                environment_id, // Add environment_id for multi-tenancy
                currency_rate // <--- Add the currency rate here
            }])
            .select();

        console.log('Invoice insert result:', invoice, insertError);

        if (insertError) throw insertError;
        if (!invoice || invoice.length === 0) {
            throw new Error('Invoice insert did not return any data');
        }

        // Get the first (and should be only) inserted invoice
        const insertedInvoice = invoice[0];
        if (!insertedInvoice.invoiceNumber) {
            throw new Error('Invoice insert did not return invoiceNumber');
        }

        // Create invoice notification
        // await createInvoiceNotification(session.user.id, insertedInvoice.invoiceNumber);

        // Show success message
        // showNotification('Invoice saved successfully!');
        
        // Download PDF
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = pdfFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);

        // Close modal and refresh list
        window.modalManager.closeModal('invoiceModal');
        // await refreshInvoiceList();

        // Enable the submit button after processing
        if (submitButton) submitButton.disabled = false;

    } catch (error) {
        console.error('Error saving invoice:', error);
        // showNotification('Error saving invoice: ' + (error.message || 'Unknown error'));

        // Re-enable the submit button in case of error
        const submitButton = document.querySelector('#invoiceForm button[type="submit"]');
        if (submitButton) submitButton.disabled = false;

        throw error;
    }
}

// Add refresh function
async function refreshInvoiceList() {
    try {
        // Use the invoice table module if available
        if (window.invoiceTable && typeof window.invoiceTable.refreshTable === 'function') {
            // await window.invoiceTable.refreshTable();
        } else {
            // Fallback to direct function call
            const currentPage = 1;
            const currentLimit = 10;
            await fetchAndDisplayInvoices(currentPage, currentLimit);
        }
        
        // Refresh metrics
        if (typeof window.updateMetricsDisplay === 'function') {
            await window.updateMetricsDisplay();
        }
        
        // Refresh charts
        if (typeof window.updateCharts === 'function') {
            await window.updateCharts();
        }
    } catch (error) {
        console.error('Error refreshing invoice list:', error);
        showNotification('Error refreshing data');
    }
}

// Remove generatePDF and generateInvoiceHTML from this file, now provided by js/invoicescripts/pdf.js

// Removed previewInvoice function - moved to js/invoicescripts/invoicePreview.js
// function previewInvoice() {
//     // Get invoice modal and set it to keep in background
//     const invoiceModal = document.getElementById('invoiceModal');
//     if (invoiceModal) {
//         invoiceModal.style.display = 'none'; // Hide but don't fully close
//     }

//     const invoiceData = getInvoiceData();
    
//     // Update view modal for preview mode
//     const timelineSection = document.querySelector('.invoice-view-footer');
//     const modalFooter = document.querySelector('#viewInvoiceModal .modal-footer');
//     if (timelineSection) timelineSection.style.display = 'none';
//     if (modalFooter) modalFooter.style.display = 'none';
    
//     // Update modal title and close button behavior
//     const modalTitle = document.querySelector('#viewInvoiceModal .modal-header h2');
//     const closeBtn = document.querySelector('#viewInvoiceModal .close-modal');
//     if (modalTitle) modalTitle.textContent = 'Invoice Preview';
//     if (closeBtn) {
//         // Remove existing listeners
//         closeBtn.replaceWith(closeBtn.cloneNode(true));
//         // Add new close behavior
//         document.querySelector('#viewInvoiceModal .close-modal').addEventListener('click', function() {
//             document.getElementById('viewInvoiceModal').style.display = 'none';
//             document.getElementById('invoiceModal').style.display = 'block';
//         });
//     }
    
//     // Generate and display preview
//     generateInvoiceHTML(invoiceData).then(invoiceHTML => {
//         const frame = document.getElementById('invoicePreviewFrame');
//         frame.contentWindow.document.open();
//         frame.contentWindow.document.write(invoiceHTML);
//         frame.contentWindow.document.close();
        
//         document.getElementById('viewInvoiceModal').style.display = 'block';
//     });
// }

function openViewInvoiceModal(invoiceNumber) {
    // Show timeline and buttons for view mode
    const timelineSection = document.querySelector('.invoice-view-footer');
    const modalFooter = document.querySelector('#viewInvoiceModal .modal-footer');
    if (timelineSection) timelineSection.style.display = 'block';
    if (modalFooter) modalFooter.style.display = 'block';
    
    // Update modal title for viewing
    const modalTitle = document.querySelector('#viewInvoiceModal .modal-header h2');
    if (modalTitle) modalTitle.textContent = 'Invoice Details';
    
    // Fetch invoice from Supabase
    fetchInvoiceDetails(invoiceNumber);
}

async function fetchInvoiceDetails(invoiceNumber) {
    try {
        // Show loading state
        const previewContainer = document.getElementById('invoicePreviewContent');
        if (previewContainer) {
            previewContainer.innerHTML = '<div class="loading">Loading invoice...</div>';
        }

        // Ensure invoiceNumber is a string
        console.log('[fetchInvoiceDetails] Raw input:', invoiceNumber, 'Type:', typeof invoiceNumber);
        const invNum = typeof invoiceNumber === 'object' ? invoiceNumber.invoiceNumber : invoiceNumber;
        console.log('[fetchInvoiceDetails] Using invoiceNumber:', invNum);
        const environment_id = await window.getCurrentEnvironmentId();
        console.log('[fetchInvoiceDetails] environment_id:', environment_id);

        // Build query
        let query = window.supabase
            .from('invoices')
            .select('*, clients(*)')
            .eq('invoiceNumber', invNum);
        if (environment_id) {
            query = query.eq('environment_id', environment_id);
            console.log('[fetchInvoiceDetails] Querying with environment_id filter');
        } else {
            console.log('[fetchInvoiceDetails] Querying WITHOUT environment_id filter');
        }
        let { data: invoice, error } = await query.single();
        console.log('[fetchInvoiceDetails] Query result:', invoice, 'Error:', error);

        // Fallback: If no rows and environment_id was used, try again without it
        if ((error && error.code === 'PGRST116') && environment_id) {
            console.warn('[fetchInvoiceDetails] No rows found with environment_id, retrying without environment_id...');
            query = window.supabase
                .from('invoices')
                .select('*, clients(*)')
                .eq('invoiceNumber', invNum);
            ({ data: invoice, error } = await query.single());
            console.log('[fetchInvoiceDetails] Fallback query result:', invoice, 'Error:', error);
        }

        if (error) throw error;
        if (!invoice) throw new Error('Invoice not found');

        // Update status display
        const statusElement = document.getElementById('viewInvoiceStatus');
        if (statusElement) {
            statusElement.textContent = invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1);
            statusElement.className = 'status ' + invoice.status;
        }

        // Update invoice number display
        document.getElementById('viewInvoiceNumber').textContent = invoice.invoiceNumber;

        // Fetch and populate timeline
        const timeline = await fetchInvoiceTimeline(invNum);
        populateTimeline(timeline);

        // Show/hide "Mark as Paid" button based on status
        const markPaidBtn = document.getElementById('markPaidBtn');
        if (markPaidBtn) {
            markPaidBtn.style.display = invoice.status === 'paid' ? 'none' : '';
            if (invoice.status !== 'paid') {
                markPaidBtn.onclick = () => markInvoiceAsPaid(invNum);
            }
        }

        // Build invoice details HTML (form-like layout, no items)
        const client = invoice.clients || {};
        const detailsHtml = `
          <div class="invoice-details-form">
            <div><strong>Client:</strong> ${invoice.client_name || client.customer_name || '-'}</div>
            <div><strong>Email:</strong> ${client.email || '-'}</div>
            <div><strong>NUIT:</strong> ${client.customer_tax_id || '-'}</div>
            <div><strong>Address:</strong> ${client.billing_address || '-'}</div>
            <div><strong>Invoice #:</strong> ${invoice.invoiceNumber}</div>
            <div><strong>Issue Date:</strong> ${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '-'}</div>
            <div><strong>Due Date:</strong> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</div>
            <div><strong>Status:</strong> ${invoice.status || '-'}</div>
            <div><strong>Currency:</strong> ${invoice.currency || '-'}</div>
            <div><strong>Payment Terms:</strong> ${invoice.payment_terms || '-'}</div>
            <div><strong>Notes:</strong> ${invoice.notes || '-'}</div>
            <div><strong>Subtotal:</strong> ${invoice.subtotal != null ? invoice.subtotal.toFixed(2) : '-'}</div>
            <div><strong>VAT Amount:</strong> ${invoice.vat_amount != null ? invoice.vat_amount.toFixed(2) : '-'}</div>
            <div><strong>Total Amount:</strong> ${invoice.total_amount != null ? invoice.total_amount.toFixed(2) : '-'}</div>
          </div>
        `;
        if (previewContainer) {
            previewContainer.innerHTML = detailsHtml;
        }

        // Attach download button logic
        const downloadBtn = document.getElementById('downloadInvoicePdfBtn');
        if (downloadBtn) {
            downloadBtn.onclick = async function() {
                const fileName = `${invoice.invoiceNumber}.pdf`;
                console.log('[Download PDF] Attempting to create signed URL for:', fileName);
                const { data: signedUrlData, error: signedUrlError } = await window.supabase
                    .storage
                    .from('invoice_pdfs')
                    .createSignedUrl(fileName, 60 * 60); // 1 hour expiry
                if (!signedUrlError && signedUrlData && signedUrlData.signedUrl) {
                    window.open(signedUrlData.signedUrl, '_blank');
                    console.log('[Download PDF] Signed URL opened:', signedUrlData.signedUrl);
                } else {
                    console.error('[Download PDF] Could not generate signed URL:', signedUrlError, signedUrlData);
                    showNotification('Could not generate PDF download link.', 'error');
                }
            };
        }

        // Attach send button logic
        const sendBtn = document.getElementById('sendInvoiceBtn');
        if (sendBtn) {
            sendBtn.onclick = function() {
                const client = invoice.clients || {};
                const subject = `Invoice ${invoice.invoiceNumber}`;
                const message = `Dear ${invoice.client_name || client.customer_name || 'Client'},\n\nPlease find attached invoice ${invoice.invoiceNumber} for the amount of ${invoice.total_amount != null ? invoice.total_amount.toFixed(2) : '-'} ${invoice.currency || ''}.\n\nThank you.`;
                if (typeof openEmailModal === 'function') {
                    openEmailModal(invoice.invoiceNumber, client.email, subject, message);
                } else {
                    showNotification('Email modal function not found.', 'error');
                }
            };
        }

        // Open the modal
        window.modalManager.openModal('viewInvoiceModal');

    } catch (error) {
        console.error('[fetchInvoiceDetails] Error fetching invoice:', error);
        showNotification('Error loading invoice: ' + (error.message || error));
    }
}

async function fetchInvoiceTimeline(invoiceNumber) {
    try {
        const { data: timeline, error } = await window.supabase
            .from('invoice_timeline')
            .select('*')
            .eq('invoiceNumber', invoiceNumber)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return timeline || [
            {
                date: new Date().toISOString(),
                title: 'Invoice Created',
                active: true
            }
        ];
    } catch (error) {
        console.error('Error fetching timeline:', error);
        return [];
    }
}

function populateTimeline(timeline) {
    const timelineContainer = document.querySelector('.status-timeline');
    if (!timelineContainer || !timeline.length) return;

    timelineContainer.innerHTML = timeline.map(event => `
        <div class="timeline-item${event.active ? ' active' : ''}">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <span class="timeline-date">${formatDate(event.date)}</span>
                <span class="timeline-title">${event.title}</span>
            </div>
        </div>
    `).join('');
}

async function markInvoiceAsPaid(invoiceNumber) {
    try {
        const environment_id = await window.getCurrentEnvironmentId();
        // Update invoice status
        const { error: updateError } = await window.supabase
            .from('invoices')
            .update({ status: 'paid', payment_date: new Date().toISOString() })
            .eq('invoiceNumber', invoiceNumber)
            .eq('environment_id', environment_id);
        if (updateError) throw updateError;

        // Add timeline event
        const { error: timelineError } = await window.supabase
            .from('invoice_timeline')
            .insert([{
                invoiceNumber: invoiceNumber,
                title: 'Payment Received',
                active: true,
                date: new Date().toISOString()
            }]);

        if (timelineError) throw timelineError;

        // Update UI
        document.getElementById('viewInvoiceStatus').textContent = 'Paid';
        document.getElementById('viewInvoiceStatus').className = 'status paid';
        document.getElementById('markPaidBtn').style.display = 'none';

        // Refresh timeline
        const timeline = await fetchInvoiceTimeline(invoiceNumber);
        populateTimeline(timeline);

        // Show notification
        showNotification('Invoice marked as paid');

        // Refresh invoice list and metrics
        // await refreshInvoiceList();

    } catch (error) {
        console.error('Error marking invoice as paid:', error);
        showNotification('Error updating invoice status');
    }
}

// Remove setupCharts, setupChartPeriodControls, updateChartPeriodButtons, updateInvoiceDistributionChart, updateRevenueByStatusChart from this file, now provided by js/invoicescripts/charts.js

// Remove setupTableFilters and setupTableSorting from this file, now provided by js/invoicescripts/tableFilters.js

window.initializeInvoiceModule = initializeInvoiceModule;
window.openModal = openModal;
// Expose setupProductSuggestions if defined
if (typeof setupProductSuggestions === 'function') {
    window.setupProductSuggestions = setupProductSuggestions;
}

function getInvoiceData() {
    const form = document.getElementById('invoiceForm');
    if (!form) throw new Error('Invoice form not found');

    const items = window.invoiceItems ? window.invoiceItems.getInvoiceItems() : [];
    
    return {
        invoiceNumber: document.getElementById('invoiceNumber').value,
        issueDate: document.getElementById('issueDate').value,
        dueDate: document.getElementById('dueDate').value,
        client: {
            name: document.getElementById('client-list').value,
            email: document.getElementById('clientEmail').value,
            taxId: document.getElementById('clientTaxId').value,
            address: document.getElementById('clientAddress').value
        },
        items: items,
        subtotal: parseAmount(document.getElementById('subtotal').textContent) || 0,
        taxAmount: parseAmount(document.getElementById('totalVat').textContent) || 0,
        total: parseAmount(document.getElementById('invoiceTotal').textContent) || 0,
        notes: document.getElementById('notes').value,
        currency: document.getElementById('currency').value,
        paymentTerms: document.getElementById('paymentTerms').value
    };
}

// Add fetchAndDisplayInvoices to global scope
window.fetchAndDisplayInvoices = async function(page = 1, limit = 10, filters = {}) {
    if (window.invoiceTable && typeof window.invoiceTable.fetchAndDisplayInvoices === 'function') {
        // await window.invoiceTable.fetchAndDisplayInvoices(page, limit, filters);
        window.invoiceTable.setupSorting(); // Setup sorting after table is displayed
    } else {
        console.error('invoiceTable not found');
    }
};

// Initialize InvoiceTableModule
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize table filters first
        if (typeof window.setupTableFilters === 'function') {
            window.setupTableFilters();
            console.log('Table filters initialized successfully');
        }

        // Initialize invoice table
        if (typeof window.fetchAndDisplayInvoices === 'function' && window.invoiceTable) {
            // await window.fetchAndDisplayInvoices(1, 10, {});
            console.log('Invoice table initialized successfully');
        } else {
            console.error('Invoice table functions not found or invoiceTable not available');
        }

        // Initialize other components
        if (window.invoiceActions) {
            window.invoiceActions.setupEventListeners();
            console.log('Invoice actions initialized successfully');
        }

    } catch (error) {
        console.error('Error during initialization:', error);
        showNotification('Error initializing application: ' + error.message);
    }
});

(function() {
  const steps = Array.from(document.querySelectorAll('#invoiceModal .step'));
  const stepIndicators = Array.from(document.querySelectorAll('#invoiceModal .step-indicator'));
  let currentStep = 0;
  let maxStepReached = 0;

  function showStep(index) {
    steps.forEach((step, i) => {
      step.style.display = i === index ? 'block' : 'none';
      step.classList.toggle('active', i === index);
    });
    stepIndicators.forEach((ind, i) => {
      ind.classList.toggle('active', i === index);
    });
    currentStep = index;
    if (index > maxStepReached) maxStepReached = index;
    // Always populate review when entering review step
    if (index === 3) populateReview();
  }

  function validateStep(index) {
    // Basic validation for each step (expand as needed)
    if (index === 0) {
      const clientName = document.getElementById('client-list').value.trim();
      if (!clientName) {
        showNotification('Please enter/select a client name', 'error');
        return false;
      }
    }
    if (index === 1) {
      const issueDate = document.getElementById('issueDate').value;
      const dueDate = document.getElementById('dueDate').value;
      if (!issueDate || !dueDate) {
        showNotification('Please select both issue and due dates', 'error');
        return false;
      }
    }
    if (index === 2) {
      const itemRows = document.querySelectorAll('#itemsTable .item-row');
      let valid = false;
      itemRows.forEach(row => {
        const desc = row.querySelector('.item-description').value.trim();
        const qty = parseAmount(row.querySelector('.item-quantity').value);
        if (desc && qty > 0) valid = true;
      });
      if (!valid) {
        showNotification('Please add at least one valid item', 'error');
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (!validateStep(currentStep)) return;
    if (currentStep < steps.length - 1) {
      showStep(currentStep + 1);
      if (currentStep + 1 === 3) populateReview();
    }
  }
  function prevStep() {
    if (currentStep > 0) showStep(currentStep - 1);
  }

  function populateReview() {
    // Fill the review summary with entered data
    const clientName = document.getElementById('client-list').value;
    const clientEmail = document.getElementById('clientEmail').value;
    const clientTaxId = document.getElementById('clientTaxId').value;
    const clientAddress = document.getElementById('clientAddress').value;
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const issueDate = document.getElementById('issueDate').value;
    const dueDate = document.getElementById('dueDate').value;
    const currency = document.getElementById('currency').value;
    const paymentTerms = document.getElementById('paymentTerms').options[document.getElementById('paymentTerms').selectedIndex].text;
    const notes = document.getElementById('notes').value;
    // Items
    const itemRows = document.querySelectorAll('#itemsTable .item-row');
    let itemsHtml = '';
    itemRows.forEach(row => {
      const desc = row.querySelector('.item-description').value;
      const qty = parseAmount(row.querySelector('.item-quantity').value);
      const price = parseAmount(row.querySelector('.item-price').value);
      const vat = row.querySelector('.item-vat') ? row.querySelector('.item-vat').textContent : '0.00';
      const total = row.querySelector('.item-total') ? row.querySelector('.item-total').textContent : '0.00';
      if (desc && qty > 0) {
        itemsHtml += `<tr><td>${desc}</td><td>${qty}</td><td>${price}</td><td>${vat}</td><td>${total}</td></tr>`;
      }
    });
    const serie = document.getElementById('serie')?.value || '';
    const discountType = document.getElementById('discountType')?.value || 'none';
    const discountValue = parseFloat(document.getElementById('discountValue')?.value) || 0;
    const discountAmount = document.getElementById('discountTotal')?.textContent || '0.00';
    const subtotalAfterDiscount = document.getElementById('subtotalAfterDiscount')?.textContent || '0.00';
    // Invoice number display
    let invoiceNumberDisplay = invoiceNumber;
    const reviewHtml = `
      <div><strong>Client:</strong> ${clientName} (${clientEmail}, NUIT: ${clientTaxId})<br><strong>Address:</strong> ${clientAddress}</div>
      <div><strong>Invoice #:</strong> ${invoiceNumberDisplay} | <strong>Issue:</strong> ${issueDate} | <strong>Due:</strong> ${dueDate}</div>
      <div><strong>Currency:</strong> ${currency} | <strong>Terms:</strong> ${paymentTerms}</div>
      <div><strong>Discount:</strong> ${discountType === 'percent' ? discountValue + '%' : discountAmount} | <strong>Subtotal after Discount:</strong> ${subtotalAfterDiscount}</div>
      <div><strong>Notes:</strong> ${notes || '\u2014'}</div>
      <table class="items-table" style="margin-top:12px;width:100%"><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>VAT</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <div style="margin-top:16px;text-align:right;">
        <button type="button" class="btn secondary-btn" id="previewInvoiceBtn">
          <i class="fas fa-eye"></i> <span data-translate="preview">Preview</span>
        </button>
      </div>
    `;
    document.getElementById('invoiceReviewSummary').innerHTML = reviewHtml;
    // Copy totals
    document.getElementById('reviewSubtotal').textContent = document.getElementById('subtotal').textContent;
    document.getElementById('reviewTotalVat').textContent = document.getElementById('totalVat').textContent;
    document.getElementById('reviewInvoiceTotal').textContent = document.getElementById('invoiceTotal').textContent;
    // Attach preview button event
    setTimeout(() => {
      const previewBtn = document.getElementById('previewInvoiceBtn');
      if (previewBtn) {
        previewBtn.addEventListener('click', function() {
          // Use the InvoiceForm class to collect the latest form data
          let invoiceData = null;
          if (window.invoiceForm && typeof window.invoiceForm.collectInvoiceData === 'function') {
            try {
              invoiceData = window.invoiceForm.collectInvoiceData();
            } catch (err) {
              showNotification('Cannot preview: ' + err.message, 'error');
              return;
            }
          } else if (typeof getInvoiceData === 'function') {
            invoiceData = getInvoiceData();
          }
          if (invoiceData && typeof window.previewInvoice === 'function') {
            window.previewInvoice(invoiceData);
          } else if (window.invoicePreview && typeof window.invoicePreview.showPreview === 'function') {
            window.invoicePreview.showPreview(invoiceData);
          } else if (window.invoicePreview && typeof window.invoicePreview.openPreview === 'function') {
            window.invoicePreview.openPreview();
          } else if (typeof window.openInvoicePreview === 'function') {
            window.openInvoicePreview();
          } else {
            showNotification('Preview function not found', 'error');
          }
        });
      }
    }, 100);
  }

  // Event listeners
  document.querySelectorAll('#invoiceModal .next-step').forEach(btn => {
    btn.addEventListener('click', nextStep);
  });
  document.querySelectorAll('#invoiceModal .prev-step').forEach(btn => {
    btn.addEventListener('click', prevStep);
  });

  // Stepper tab click logic
  stepIndicators.forEach((ind, i) => {
    ind.style.cursor = 'pointer';
    ind.addEventListener('click', function() {
      if (i <= maxStepReached) {
        showStep(i);
        if (i === 3) populateReview();
      }
    });
  });

  // Show first step on modal open
  document.addEventListener('DOMContentLoaded', function() {
    showStep(0);
  });

  // Optional: Reset to first step when modal is closed
  document.querySelectorAll('#invoiceModal .close-modal').forEach(btn => {
    btn.addEventListener('click', function() {
      showStep(0);
      maxStepReached = 0;
    });
  });
})();

// --- Currency Logic Integration Start ---
// Remove any global let currentCurrency, currentRate, fetchingRate, setupCurrencyListener, getConvertedAmount, updateExchangeRate, updateExchangeRateInfo, updateReviewTotals ...

// Insert the class-based InvoiceForm implementation

// Create invoice notification
// async function createInvoiceNotification(userId, invoiceNumber) {
//     console.log('[InvoiceJS] createInvoiceNotification called with:', { userId, invoiceNumber });
//     try {
//         // Check if user has notification settings enabled for invoice notifications
//         console.log('[InvoiceJS] Checking notification settings for user:', userId);
//         const { data: notificationSettings, error: settingsError } = await window.supabase
//             .from('notification_settings')
//             .select('invoice_created')
//             .eq('user_id', userId)
//             .single();

//         console.log('[InvoiceJS] Notification settings result:', { notificationSettings, settingsError });

//         // If no settings found or invoice notifications are disabled, don't create notification
//         if (settingsError || !notificationSettings || !notificationSettings.invoice_created) {
//             console.log('[InvoiceJS] Invoice notifications disabled or no settings found, skipping notification');
//             console.log('[InvoiceJS] Settings error:', settingsError);
//             console.log('[InvoiceJS] Notification settings:', notificationSettings);
            
//             // If no settings exist, create default settings for the user
//             if (settingsError && settingsError.code === 'PGRST116') {
//                 console.log('[InvoiceJS] No notification settings found, creating default settings...');
//                 const { error: createError } = await window.supabase
//                     .from('notification_settings')
//                     .insert({
//                         user_id: userId,
//                         payment_received: true,
//                         invoice_created: true,
//                         invoice_due: true,
//                         invoice_overdue: true,
//                         product_low_stock: true,
//                         system_updates: true,
//                         client_activity: false,
//                         login_attempts: true
//                     });
                
//                 if (createError) {
//                     console.error('[InvoiceJS] Error creating default notification settings:', createError);
//                     return;
//                 } else {
//                     console.log('[InvoiceJS] Default notification settings created successfully');
//                     // Now proceed with creating the notification
//                 }
//             } else {
//                 return;
//             }
//         }

//         // For invoices, we'll create a notification every time since invoice creation is a unique event
//         console.log('[InvoiceJS] Creating new invoice notification...');
        
//         // Create invoice notification
//         console.log('[InvoiceJS] Creating invoice notification in database...');
//         const { error } = await window.supabase
//             .from('notifications')
//             .insert({
//                 user_id: userId,
//                 type: 'invoice',
//                 title: 'Invoice Created Successfully',
//                 message: `Invoice ${invoiceNumber} has been created and is ready for sending to your client.`,
//                 action_url: 'invoices.html',
//                 read: false
//             });

//         if (error) {
//             console.error('[InvoiceJS] Error creating invoice notification:', error);
//         } else {
//             console.log('[InvoiceJS] Invoice notification created successfully');
            
//             // Verify the notification was created by fetching it
//             const { data: verifyNotification, error: verifyError } = await window.supabase
//                 .from('notifications')
//                 .select('*')
//                 .eq('user_id', userId)
//                 .eq('type', 'invoice')
//                 .order('created_at', { ascending: false })
//                 .limit(1);
            
//             if (verifyError) {
//                 console.error('[InvoiceJS] Error verifying notification creation:', verifyError);
//             } else {
//                 console.log('[InvoiceJS] Notification verification successful:', verifyNotification);
//             }
            
//             // Dispatch event to notify other parts of the app about new notification
//             window.dispatchEvent(new CustomEvent('notificationCreated', {
//                 detail: {
//                     type: 'invoice',
//                     title: 'Invoice Created Successfully',
//                     message: `Invoice ${invoiceNumber} has been created and is ready for sending to your client.`
//                 }
//             }));
            
//             // Update notification badge count
//             if (window.notificationBadgeManager) {
//                 await window.notificationBadgeManager.refresh();
//             }
//         }
//     } catch (error) {
//         console.error('[InvoiceJS] Error in createInvoiceNotification:', error);
//     }
// }

window.refreshDashboardUI = async function() {
    try {
        if (window.invoiceTable && typeof window.invoiceTable.refreshTable === 'function') {
            await window.invoiceTable.refreshTable();
        }
        if (typeof window.updateMetricsDisplay === 'function') {
            await window.updateMetricsDisplay();
        }
        if (typeof window.updateCharts === 'function') {
            await window.updateCharts();
        }
        if (window.notificationBadgeManager && typeof window.notificationBadgeManager.refresh === 'function') {
            await window.notificationBadgeManager.refresh();
        }
        if (window.invoiceForm && typeof window.invoiceForm.resetInvoiceForm === 'function') {
            await window.invoiceForm.resetInvoiceForm();
        }
    } catch (error) {
        console.error('Error refreshing dashboard UI:', error);
        showNotification('Error refreshing dashboard UI');
    }
};

async function getAISuggestionForInvoiceNote(context) {
    try {
        const url = "https://qvmtozjvjflygbkjecyj.supabase.co/functions/v1/walaka-assistant";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo";
        const messages = [
            { role: 'system', content: 'Você é um assistente de ERP. Gere uma sugestão de nota adicional para uma factura, baseada no resumo do cliente, itens e total. Seja breve, profissional e relevante para negócios em Moçambique.' },
            { role: 'user', content: `Resumo da factura: ${context}` }
        ];
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ messages })
        });
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            return data.choices[0].message.content.trim();
        }
        return '';
    } catch (e) {
        return '';
    }
}
