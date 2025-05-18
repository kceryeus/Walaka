// Invoice Management Module JavaScript

// Add module state tracking
let invoiceModuleInitialized = false;
let invoiceDistributionChartInstance = null;
let revenueByStatusChartInstance = null;


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
    const modal = document.getElementById(modalId);
    const overlay = document.querySelector('.modal-overlay');
    
    if (modal && overlay) {
        modal.style.display = 'block';
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
        
        // Initialize or reset form if it's the invoice creation modal
        if (modalId === 'invoiceModal') {
            resetInvoiceForm();
        }
    }
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
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('item-description')) {
            const searchTerm = e.target.value.toLowerCase().trim();
            const row = e.target.closest('.item-row');
            
            if (searchTerm.length < 2) {
                hideProductSuggestions(row);
                hideNewProductForm(row);
                return;
            }

            handleProductSearch(searchTerm, row);
        }

        if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-price')) {
            const row = e.target.closest('.item-row');
            if (row) {
                calculateRowTotal(row);
                updateInvoiceTotals();
            }
        }
    });
}

function handleProductSearch(searchTerm, row) {
    (async function() {
        try {
            const { data: products, error } = await window.supabase
                .from('products')
                .select('*')
                .ilike('description', `%${searchTerm}%`)
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
    const rect = input.getBoundingClientRect();
    
    let suggestionsBox = row.querySelector('.product-suggestions');
    if (!suggestionsBox) {
        suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'product-suggestions';
        row.querySelector('td:first-child').appendChild(suggestionsBox);
    }

    suggestionsBox.innerHTML = products.map(product => `
        <div class="suggestion-item" data-product='${JSON.stringify(product)}'>
            <div>${product.description}</div>
            <div class="suggestion-price">${formatCurrency(product.price)}</div>
        </div>
    `).join('');

    // Position suggestions box
    suggestionsBox.style.top = (rect.height) + 'px';
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
    if (descriptionInput) descriptionInput.value = product.description || '';
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
        currency: 'MZN'
    }).format(amount);
}

function calculateRowTotal(row) {
    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    
    const subtotal = quantity * price;
    const vat = subtotal * 0.16; // 16% VAT
    
    row.querySelector('.item-vat').textContent = vat.toFixed(2);
    row.querySelector('.item-total').textContent = (subtotal + vat).toFixed(2);
}

function updateInvoiceTotals() {
    const rows = document.querySelectorAll('.item-row');
    let subtotal = 0;
    let totalVat = 0;
    
    rows.forEach(row => {
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        
        const rowSubtotal = quantity * price;
        const rowVat = rowSubtotal * 0.16;
        
        subtotal += rowSubtotal;
        totalVat += rowVat;
    });
    
    const grandTotal = subtotal + totalVat;
    
    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('totalVat').textContent = totalVat.toFixed(2);
    document.getElementById('invoiceTotal').textContent = grandTotal.toFixed(2);
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
    
    // Initialize the new row
    const newRow = itemsTableBody.lastElementChild;
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
        // Generate a new unique invoice number only once
        const invoiceNumberField = document.getElementById('invoiceNumber');
        if (invoiceNumberField && !invoiceNumberField.dataset.generated) {
            try {
                const generator = new window.InvoiceNumberGenerator();
                const newInvoiceNumber = await generator.getNextNumber();
                invoiceNumberField.value = newInvoiceNumber;
                invoiceNumberField.dataset.generated = true; // Mark as generated
            } catch (err) {
                console.error('Error generating invoice number:', err);
                invoiceNumberField.value = '';
                showNotification('Error generating invoice number');
            }
        }
    }
}

function collectInvoiceData() {
    try {
        // Get required form elements with null checks
        const clientList = document.getElementById('client-list');
        const invoiceNumber = document.getElementById('invoiceNumber');
        const issueDate = document.getElementById('issueDate');
        const dueDate = document.getElementById('dueDate');
        const currency = document.getElementById('currency');

        // Validate all required fields exist
        if (!clientList || !invoiceNumber || !issueDate || !dueDate || !currency) {
            throw new Error('Required form fields are missing');
        }

        // Get client data safely
        let clientData = {};
        try {
            clientData = JSON.parse(clientList.getAttribute('client-list') || '{}');
        } catch (e) {
            console.warn('Could not parse client data:', e);
        }

        const invoiceData = {
            invoiceNumber: invoiceNumber.value,
            issueDate: issueDate.value,
            dueDate: dueDate.value,
            currency: currency.value || 'MZN',
            client: {
                id: clientData.customer_id || '',
                customer_name: clientList.value || '',
                email: document.getElementById('clientEmail')?.value || '',
                address: document.getElementById('clientAddress')?.value || '',
                taxId: document.getElementById('clientTaxId')?.value || ''
            },
            paymentTerms: document.getElementById('paymentTerms')?.value || 'net30',
            notes: document.getElementById('notes')?.value || '',
            status: 'pending',
            items: [],
            subtotal: parseFloat(document.getElementById('subtotal')?.textContent || '0'),
            totalVat: parseFloat(document.getElementById('totalVat')?.textContent || '0'),
            total: parseFloat(document.getElementById('invoiceTotal')?.textContent || '0')
        };

        // Validate required fields have values
        if (!invoiceData.invoiceNumber || !invoiceData.client.customer_name) {
            throw new Error('Invoice number and client name are required');
        }

        // Collect items
        const itemRows = document.querySelectorAll('.item-row');
        itemRows.forEach(row => {
            const description = row.querySelector('.item-description')?.value;
            const quantity = parseFloat(row.querySelector('.item-quantity')?.value) || 0;
            const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
            const vat = parseFloat(row.querySelector('.item-vat')?.textContent) || 0;
            const total = parseFloat(row.querySelector('.item-total')?.textContent) || 0;

            if (description && quantity > 0) {
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

async function saveInvoice() {
    try {
        // Prevent duplicate submissions
        const submitButton = document.querySelector('#invoiceForm button[type="submit"]');
        if (submitButton) submitButton.disabled = true;

        // Show loading state
        showNotification('Saving invoice...');
        
        // Collect and validate form data
        const invoiceData = collectInvoiceData();
        
        if (!invoiceData.invoiceNumber || !invoiceData.client.customer_name) {
            throw new Error('Missing required fields');
        }

        // Generate PDF
        const pdfBlob = await generatePDF(invoiceData);
        
        if (!pdfBlob) {
            throw new Error('Failed to generate PDF');
        }

        // Get user session
        const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
        if (sessionError || !session) {
            throw new Error('Authentication required');
        }

        // Upload PDF to Supabase Storage with proper permissions
        const pdfFileName = `${invoiceData.invoiceNumber.replace(/\s+/g, '_')}.pdf`;
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
                customer_name: invoiceData.client.customer_name,
                user_id: session.user.id // Add user_id for RLS
            }])
            .select()
            .single();

        console.log('Invoice insert result:', invoice, insertError);

        if (insertError) throw insertError;
        if (!invoice || !invoice.invoiceNumber) {
            throw new Error('Invoice insert did not return invoiceNumber');
        }

        // Show success message
        showNotification('Invoice saved successfully!');
        
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
        closeAllModals();
        await refreshInvoiceList();

        // Enable the submit button after processing
        if (submitButton) submitButton.disabled = false;

    } catch (error) {
        console.error('Error saving invoice:', error);
        showNotification('Error saving invoice: ' + (error.message || 'Unknown error'));

        // Re-enable the submit button in case of error
        const submitButton = document.querySelector('#invoiceForm button[type="submit"]');
        if (submitButton) submitButton.disabled = false;

        throw error;
    }
}

// Add refresh function
async function refreshInvoiceList() {
    try {
        const currentPage = 1; // Get current page from state if needed
        const currentLimit = 10; // Get current limit from state if needed
        await fetchAndDisplayInvoices(currentPage, currentLimit);
        
        // Refresh metrics
        await updateMetricsDisplay();
        
        // Refresh charts
        await updateCharts();
    } catch (error) {
        console.error('Error refreshing invoice list:', error);
        showNotification('Error refreshing data');
    }
}

// Remove generatePDF and generateInvoiceHTML from this file, now provided by js/invoicescripts/pdf.js

function previewInvoice() {
    // Get invoice modal and set it to keep in background
    const invoiceModal = document.getElementById('invoiceModal');
    if (invoiceModal) {
        invoiceModal.style.display = 'none'; // Hide but don't fully close
    }

    const invoiceData = getInvoiceData();
    
    // Update view modal for preview mode
    const timelineSection = document.querySelector('.invoice-view-footer');
    const modalFooter = document.querySelector('#viewInvoiceModal .modal-footer');
    if (timelineSection) timelineSection.style.display = 'none';
    if (modalFooter) modalFooter.style.display = 'none';
    
    // Update modal title and close button behavior
    const modalTitle = document.querySelector('#viewInvoiceModal .modal-header h2');
    const closeBtn = document.querySelector('#viewInvoiceModal .close-modal');
    if (modalTitle) modalTitle.textContent = 'Invoice Preview';
    if (closeBtn) {
        // Remove existing listeners
        closeBtn.replaceWith(closeBtn.cloneNode(true));
        // Add new close behavior
        document.querySelector('#viewInvoiceModal .close-modal').addEventListener('click', function() {
            document.getElementById('viewInvoiceModal').style.display = 'none';
            document.getElementById('invoiceModal').style.display = 'block';
        });
    }
    
    // Generate and display preview
    generateInvoiceHTML(invoiceData).then(invoiceHTML => {
        const frame = document.getElementById('invoicePreviewFrame');
        frame.contentWindow.document.open();
        frame.contentWindow.document.write(invoiceHTML);
        frame.contentWindow.document.close();
        
        document.getElementById('viewInvoiceModal').style.display = 'block';
    });
}

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

        // Fetch invoice data
        const { data: invoice, error } = await window.supabase
            .from('invoices')
            .select('*, clients(*)')
            .eq('invoiceNumber', invoiceNumber)
            .single();

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
        const timeline = await fetchInvoiceTimeline(invoiceNumber);
        populateTimeline(timeline);

        // Show/hide "Mark as Paid" button based on status
        const markPaidBtn = document.getElementById('markPaidBtn');
        if (markPaidBtn) {
            markPaidBtn.style.display = invoice.status === 'paid' ? 'none' : '';
            if (invoice.status !== 'paid') {
                markPaidBtn.onclick = () => markInvoiceAsPaid(invoiceNumber);
            }
        }

        // Load PDF from storage if available
        if (invoice.pdf_url) {
            const previewContainer = document.getElementById('invoicePreviewContent');
            previewContainer.innerHTML = `
                <iframe src="${invoice.pdf_url}" width="100%" height="600px" frameborder="0"></iframe>
            `;
        }

        // Open the modal
        openModal('viewInvoiceModal');

    } catch (error) {
        console.error('Error fetching invoice:', error);
        showNotification('Error loading invoice: ' + error.message);
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
        // Update invoice status
        const { error: updateError } = await window.supabase
            .from('invoices')
            .update({ status: 'paid', paid_date: new Date().toISOString() })
            .eq('invoiceNumber', invoiceNumber);

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
        await refreshInvoiceList();

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
