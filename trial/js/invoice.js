// Invoice Management Module JavaScript

// Add module state tracking
let invoiceModuleInitialized = false;
let invoiceDistributionChartInstance = null;
let revenueByStatusChartInstance = null;

let upgradeModalInstance = null;

// Remove DEV_MODE constant and test data

// DOMContentLoaded event handler
document.addEventListener('DOMContentLoaded', function() {
    if (!invoiceModuleInitialized) {
        console.log('Starting invoice module initialization...');
        initializeInvoiceModule();
        checkAuthAndLoadInvoices();
    }
});

async function checkAuthAndLoadInvoices() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            window.location.href = '/login.html';
            return;
        }

        setupEventListeners();
        setupCharts();
        updateCharts();
        setupChartSubscription();
        setupInvoiceTable();
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
    }
}

function initializeInvoiceModule() {
    if (invoiceModuleInitialized) {
        console.warn('Attempted to initialize invoice module multiple times!');
        return;
    }
    
    console.log('Invoice Management Module initialized');
    invoiceModuleInitialized = true;
    
    setupItemCalculations();
    initializeDateFields();
}

function setupEventListeners() {
    // Create Invoice Button
    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    if (createInvoiceBtn) {
        createInvoiceBtn.addEventListener('click', async function() {
            try {
                const { data: { user } } = await supabase.auth.getSession();
                if (!user) {
                    showNotification('Please log in to create invoices');
                    return;
                }

                const trialStatus = await window.supabase.checkTrialStatus(user.id);
                
                if (!trialStatus.canCreate) {
                    showUpgradeModal({
                        daysLeft: trialStatus.daysLeft,
                        invoicesLeft: trialStatus.invoicesLeft,
                        isExpired: trialStatus.isExpired
                    });
                    return;
                }

                // Open the create invoice modal
                const modal = document.getElementById('invoiceModal');
                if (modal) {
                    modal.style.display = 'block';
                    document.querySelector('.modal-overlay').style.display = 'block';
                    
                    // Initialize form
                    resetInvoiceForm();
                }

            } catch (error) {
                console.error('Error:', error);
                showNotification('Error checking trial status');
            }
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
    if (addItemBtn) {
        addItemBtn.addEventListener('click', addInvoiceItem);
    }
    
 
    
    // View Invoice buttons
    const viewButtons = document.querySelectorAll('.view-btn');
    viewButtons.forEach(button => {
        button.addEventListener('click', function() {
            const invoiceNumber = this.getAttribute('data-invoice');
            openViewInvoiceModal(invoiceNumber);
        });
    });
    
    // Setup invoice item calculations
    setupItemCalculations();
    
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
        invoiceForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            try {
                await saveInvoice();
            } catch (error) {
                console.error('Error submitting form:', error);
                showNotification('Error: ' + error.message);
            }
        });
    }

    // Preview button
    const previewInvoiceBtn = document.getElementById('previewInvoiceBtn');
    if (previewInvoiceBtn) {
        previewInvoiceBtn.addEventListener('click', async function() {
            const invoiceData = getInvoiceData();
            const invoiceHTML = await generateInvoiceHTML(invoiceData);
            
            const previewContainer = document.getElementById('invoicePreviewContent');
            previewContainer.innerHTML = `
                <div class="invoice-a4">
                    ${invoiceHTML}
                </div>
            `;
            
            document.getElementById('viewInvoiceModal').style.display = 'block';
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
    
    // Table filters
    setupTableFilters();

    // Remove item button handler
    document.querySelector('#itemsTable tbody').addEventListener('click', function(e) {
        if (e.target.classList.contains('fa-trash') || e.target.classList.contains('remove-item-btn')) {
            const row = e.target.closest('.item-row');
            if (!row) return;

            const rows = document.querySelectorAll('.item-row');
            if (rows.length > 1) {
                row.remove();
            } else {
                // Clear last row instead of removing
                const inputs = row.querySelectorAll('input');
                inputs.forEach(input => {
                    if (input.classList.contains('item-quantity')) {
                        input.value = '1';
                    } else if (input.classList.contains('item-price')) {
                        input.value = '0.00';
                    } else {
                        input.value = '';
                    }
                });
                row.querySelector('.item-vat').textContent = '0.00';
                row.querySelector('.item-total').textContent = '0.00';
            }
            updateInvoiceTotals();
        }
    });
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

async function setupItemCalculations() {
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

async function handleProductSearch(searchTerm, row) {
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
    newProductForm.style.display = 'block';
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

function resetInvoiceForm() {
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
        
        // Remove all rows except the first one
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
            
            // Reset calculated values
            firstRow.querySelector('.item-vat').textContent = '0.00';
            firstRow.querySelector('.item-total').textContent = '0.00';
        }
        
        // Reset totals
        document.getElementById('subtotal').textContent = '0.00';
        document.getElementById('totalVat').textContent = '0.00';
        document.getElementById('invoiceTotal').textContent = '0.00';
        
        // Initialize date fields with fresh values
        initializeDateFields();
        
        // Generate a new invoice number
        const invoiceNumberField = document.getElementById('invoiceNumber');
        if (invoiceNumberField) {
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            // In a real app, we would get the next sequence number from the server
            const nextNumber = Math.floor(Math.random() * 1000) + 1;
            invoiceNumberField.value = `INV-${year}-${nextNumber.toString().padStart(4, '0')}`;
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
            clientData = JSON.parse(clientList.getAttribute('data-client') || '{}');
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
                name: clientList.value || '',
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
        if (!invoiceData.invoiceNumber || !invoiceData.client.name) {
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
        const { data: { user } } = await supabase.auth.getSession();
        if (!user) throw new Error('User not authenticated');

        // Check trial status before saving
        const trialStatus = await window.supabase.checkTrialStatus(user.id);
        if (!trialStatus.canCreate) {
            showUpgradeModal({
                daysLeft: trialStatus.daysLeft,
                invoicesLeft: trialStatus.invoicesLeft,
                isExpired: trialStatus.isExpired
            });
            return;
        }

        // Existing invoice creation code
        // Show loading state
        showNotification('Saving invoice...');
        
        // Collect and validate form data
        const invoiceData = collectInvoiceData();
        
        if (!invoiceData.invoiceNumber || !invoiceData.client.name) {
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
                invoice_number: invoiceData.invoiceNumber,
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
                user_id: session.user.id // Add user_id for RLS
            }])
            .select();

        if (insertError) {
            console.error('Database insert error:', insertError);
            throw new Error('Failed to save invoice data');
        }

        await window.supabase.incrementInvoiceCount(user.id);
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

    } catch (error) {
        console.error('Error saving invoice:', error);
        showNotification('Error saving invoice: ' + (error.message || 'Unknown error'));
        throw error;
    }
}

function showUpgradeModal(trialInfo) {
    // Remove existing modal if present
    if (upgradeModalInstance) {
        upgradeModalInstance.remove();
    }

    const modalHtml = `
        <div class="upgrade-modal-overlay">
            <div class="upgrade-modal">
                <div class="upgrade-modal-header">
                    <h2>Upgrade Your Plan</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="trial-info">
                    ${trialInfo.isExpired ? 
                        '<p>Your trial has expired</p>' : 
                        `<p>Your trial expires in ${trialInfo.daysLeft} days</p>
                         <p>You have ${trialInfo.invoicesLeft} invoices remaining</p>`
                    }
                </div>
                <div class="pricing-options">
                </div>
                <div class="payment-options">
                    <button class="payment-btn card-btn" onclick="handleCardPayment()">
                        <i class="fas fa-credit-card"></i> Pay with Card
                    </button>
                    <button class="payment-btn mpesa-btn" onclick="handleMPesaPayment()">
                        <i class="fas fa-mobile-alt"></i> M-Pesa
                    </button>
                    <button class="payment-btn emola-btn" onclick="handleEMolaPayment()">
                        <i class="fas fa-wallet"></i> e-Mola
                    </button>
                </div>
            </div>
        </div>
    `;

    upgradeModalInstance = document.createElement('div');
    upgradeModalInstance.innerHTML = modalHtml;
    document.body.appendChild(upgradeModalInstance);

    // Add event listeners
    const closeBtn = upgradeModalInstance.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => upgradeModalInstance.remove());
    }
}

// Add these payment handler functions
function handleCardPayment() {
    // Implement card payment integration
    console.log('Processing card payment...');
    alert('Card payment processing will be implemented soon.');
}

function handleMPesaPayment() {
    // Implement M-Pesa integration
    console.log('Processing M-Pesa payment...');
    alert('M-Pesa payment processing will be implemented soon.');
}

function handleEMolaPayment() {
    // Implement e-Mola integration
    console.log('Processing e-Mola payment...');
    alert('e-Mola payment processing will be implemented soon.');
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

async function generatePDF(invoiceData) {
    // Generate invoice HTML
    const invoiceHTML = await generateInvoiceHTML(invoiceData);
    
    // Create a temporary container
    const container = document.createElement('div');
    container.innerHTML = invoiceHTML;
    container.style.width = '210mm';
    container.style.padding = '10mm';
    document.body.appendChild(container);
    
    // Generate PDF using html2pdf
    const opt = {
        margin: 10,
        filename: `${invoiceData.invoiceNumber}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    try {
        const pdf = await html2pdf().from(container).set(opt).outputPdf('blob');
        document.body.removeChild(container);
        return pdf;
    } catch (error) {
        document.body.removeChild(container);
        throw error;
    }
}

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
            .eq('invoice_number', invoiceNumber)
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
        document.getElementById('viewInvoiceNumber').textContent = invoice.invoice_number;

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
            .eq('invoice_number', invoiceNumber)
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
            .eq('invoice_number', invoiceNumber);

        if (updateError) throw updateError;

        // Add timeline event
        const { error: timelineError } = await window.supabase
            .from('invoice_timeline')
            .insert([{
                invoice_number: invoiceNumber,
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

// Chart.js chart instances

function setupCharts() {
    // Clean up existing charts
    if (invoiceDistributionChartInstance) {
        invoiceDistributionChartInstance.destroy();
        invoiceDistributionChartInstance = null;
    }
    if (revenueByStatusChartInstance) {
        revenueByStatusChartInstance.destroy();
        revenueByStatusChartInstance = null;
    }

    // Setup Invoice Distribution Chart
    const invoiceDistributionCtx = document.getElementById('invoiceDistributionChart');
    if (invoiceDistributionCtx) {
        invoiceDistributionChartInstance = new Chart(invoiceDistributionCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Invoices Created',
                    data: Array(7).fill(0),
                    borderColor: '#007ec7',
                    backgroundColor: 'rgba(0, 126, 199, 0.1)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        window.invoiceDistributionChart = invoiceDistributionChartInstance;
    }

    // Setup Revenue by Status Chart
    const revenueByStatusCtx = document.getElementById('revenueByStatusChart');
    if (revenueByStatusCtx) {
        revenueByStatusChartInstance = new Chart(revenueByStatusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Paid', 'Pending', 'Overdue', 'Draft'],
                datasets: [{
                    data: Array(4).fill(0),
                    backgroundColor: [
                        '#3bb077',
                        '#f0ad4e',
                        '#e55353',
                        '#6c757d'
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                },
                cutout: '70%'
            }
        });
        window.revenueByStatusChart = revenueByStatusChartInstance;
    }
}

function setupChartPeriodControls() {
    const weeklyBtn = document.getElementById('weeklyBtn');
    const monthlyBtn = document.getElementById('monthlyBtn');
    const quarterlyBtn = document.getElementById('quarterlyBtn');
    
    // Log button elements to verify they exist
    console.log('Chart period buttons:', {
        weeklyBtn: !!weeklyBtn,
        monthlyBtn: !!monthlyBtn,
        quarterlyBtn: !!quarterlyBtn
    });

    if (weeklyBtn && monthlyBtn && quarterlyBtn) {
        weeklyBtn.addEventListener('click', function() {
            console.log('Weekly button clicked');
            updateChartPeriodButtons(this, [monthlyBtn, quarterlyBtn]);
            updateInvoiceDistributionChart('weekly');
        });
        
        monthlyBtn.addEventListener('click', function() {
            console.log('Monthly button clicked');
            updateChartPeriodButtons(this, [weeklyBtn, quarterlyBtn]);
            updateInvoiceDistributionChart('monthly');
        });
        
        quarterlyBtn.addEventListener('click', function() {
            console.log('Quarterly button clicked');
            updateChartPeriodButtons(this, [weeklyBtn, monthlyBtn]);
            updateInvoiceDistributionChart('quarterly');
        });
    }

    const revenueMonthlyBtn = document.getElementById('revenueMonthlyBtn');
    const revenueYearlyBtn = document.getElementById('revenueYearlyBtn');
    
    // Log revenue button elements
    console.log('Revenue period buttons:', {
        revenueMonthlyBtn: !!revenueMonthlyBtn,
        revenueYearlyBtn: !!revenueYearlyBtn
    });

    if (revenueMonthlyBtn && revenueYearlyBtn) {
        revenueMonthlyBtn.addEventListener('click', function() {
            console.log('Revenue monthly button clicked');
            updateChartPeriodButtons(this, [revenueYearlyBtn]);
            updateRevenueByStatusChart('monthly');
        });
        
        revenueYearlyBtn.addEventListener('click', function() {
            console.log('Revenue yearly button clicked');
            updateChartPeriodButtons(this, [revenueMonthlyBtn]);
            updateRevenueByStatusChart('yearly');
        });
    }
}

function updateChartPeriodButtons(activeButton, inactiveButtons) {
    activeButton.classList.add('active');
    inactiveButtons.forEach(button => button.classList.remove('active'));
}

function updateInvoiceDistributionChart(period, data = null) {
    console.log('updateInvoiceDistributionChart called with:', {
        period,
        data,
        type: typeof period
    });

    try {
        const chart = window.invoiceDistributionChart;
        if (!chart) throw new Error('Chart instance not found');

        // If data is provided, use it. Otherwise, use period-based default data
        if (data) {
            chart.data.datasets[0].data = data.values;
            chart.data.labels = data.labels;
        } else if (typeof period === 'string') {
            let labels = [];
            let values = [];

            switch (period.toLowerCase()) {
                case 'weekly':
                    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    values = [5, 7, 10, 8, 12, 3, 1];
                    break;
                // ...existing cases...
            }

            chart.data.labels = labels;
            chart.data.datasets[0].data = values;
        }

        chart.update();

    } catch (error) {
        console.error('Error updating distribution chart:', error);
    }
}

function updateRevenueByStatusChart(period, data = null) {
    console.log('updateRevenueByStatusChart called with:', {
        period,
        data,
        type: typeof period
    });

    try {
        const chart = window.revenueByStatusChart;
        if (!chart) throw new Error('Chart instance not found');

        // If data is provided, use it directly
        if (data) {
            chart.data.datasets[0].data = [
                data.paid || 0,
                data.pending || 0,
                data.overdue || 0,
                data.draft || 0
            ];
        } else if (typeof period === 'string') {
            chart.data.datasets[0].data = period.toLowerCase() === 'monthly' 
                ? [65, 15, 12, 8] 
                : [78, 10, 8, 4];
        }

        chart.update();

    } catch (error) {
        console.error('Error updating revenue chart:', error);
    }
}

function setupTableFilters() {
    // Get filter elements
    const statusFilter = document.getElementById('statusFilter');
    const dateFilter = document.getElementById('dateFilter');
    const clientFilter = document.getElementById('clientFilter');
    const searchInput = document.getElementById('searchInvoices');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const resetFiltersLink = document.getElementById('resetFiltersLink');
    
    // Get table elements
    const table = document.getElementById('invoicesTable');
    const rows = table ? Array.from(table.querySelectorAll('tbody tr')) : [];
    
    if (!table || rows.length === 0) return;

    // Populate client filter with data from Supabase
    async function populateClientFilter() {
        try {
            if (!window.supabase) {
                throw new Error('Supabase client not initialized');
            }

            const { data: clients, error } = await window.supabase
                .from('clients')
                .select('customer_id, company_name')
                .order('company_name', { ascending: true });

            if (error) throw error;

            if (clientFilter) {
                // Clear existing options except "All Clients"
                clientFilter.innerHTML = '<option value="all">All Clients</option>';

                // Add clients to select
                clients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.customer_id;
                    option.textContent = client.company_name;
                    clientFilter.appendChild(option);
                });
            }
        } catch (err) {
            console.error('Error populating client filter:', err);
        }
    }

    // Call the function to populate client filter
    populateClientFilter();
    
    // Function to apply all filters
    function applyFilters() {
        const status = statusFilter ? statusFilter.value : 'all';
        const date = dateFilter ? dateFilter.value : 'all';
        const client = clientFilter ? clientFilter.value : 'all';
        const searchText = searchInput ? searchInput.value.toLowerCase() : '';
        
        let visibleCount = 0;
        
        rows.forEach(row => {
            const rowStatus = row.getAttribute('data-status');
            const rowDate = new Date(row.getAttribute('data-date'));
            const rowClientId = row.getAttribute('data-client-id');
            const rowInvoice = row.querySelector('td:first-child').textContent.toLowerCase();
            
            // Match status
            const statusMatch = status === 'all' || rowStatus === status;
            
            // Match date range
            let dateMatch = true;
            
            if (date !== 'all') {
                const today = new Date();
                const oneWeek = new Date(today);
                oneWeek.setDate(today.getDate() - 7);
                
                const oneMonth = new Date(today);
                oneMonth.setMonth(today.getMonth() - 1);
                
                const oneQuarter = new Date(today);
                oneQuarter.setMonth(today.getMonth() - 3);
                
                const oneYear = new Date(today);
                oneYear.setFullYear(today.getFullYear() - 1);
                
                switch (date) {
                    case 'today':
                        dateMatch = rowDate.toDateString() === today.toDateString();
                        break;
                    case 'week':
                        dateMatch = rowDate >= oneWeek;
                        break;
                    case 'month':
                        dateMatch = rowDate >= oneMonth;
                        break;
                    case 'quarter':
                        dateMatch = rowDate >= oneQuarter;
                        break;
                    case 'year':
                        dateMatch = rowDate >= oneYear;
                        break;
                }
            }
            
            // Match client
            const clientMatch = client === 'all' || rowClientId === client;
            
            // Match search text
            const searchMatch = !searchText || 
                                rowInvoice.includes(searchText) || 
                                rowClientId.includes(searchText);
            
            // Apply all filters
            const shouldShow = statusMatch && dateMatch && clientMatch && searchMatch;
            row.style.display = shouldShow ? '' : 'none';
            
            if (shouldShow) visibleCount++;
        });
        
        // Show/hide "No results" message
        const noResultsMessage = document.getElementById('noResultsMessage');
        if (noResultsMessage) {
            if (visibleCount === 0) {
                table.style.display = 'none';
                noResultsMessage.style.display = 'block';
            } else {
                table.style.display = '';
                noResultsMessage.style.display = 'none';
            }
        }
        
        // Update page info
        const pageInfo = document.querySelector('.page-info');
        if (pageInfo) {
            pageInfo.textContent = `Showing ${visibleCount} of ${rows.length} invoices`;
        }
    }
    
    // Add event listeners to filters
    if (statusFilter) {
        statusFilter.addEventListener('change', applyFilters);
    }
    
    if (dateFilter) {
        dateFilter.addEventListener('change', applyFilters);
    }
    
    if (clientFilter) {
        clientFilter.addEventListener('change', applyFilters);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Debounce search for better performance
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(applyFilters, 300);
        });
    }
    
    // Reset filters function
    function resetFilters() {
        if (statusFilter) statusFilter.value = 'all';
        if (dateFilter) dateFilter.value = 'month';
        if (clientFilter) clientFilter.value = 'all';
        if (searchInput) searchInput.value = '';
        
        applyFilters();
    }
    
    // Clear filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', resetFilters);
    }
    
    // Reset filters link (in no results message)
    if (resetFiltersLink) {
        resetFiltersLink.addEventListener('click', function(e) {
            e.preventDefault();
            resetFilters();
        });
    }
    
    // Initialize sorting
    setupTableSorting(table, rows);
}

function setupTableSorting(table, rows) {
    const sortIcons = table ? table.querySelectorAll('.sort-icon') : [];
    
    sortIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const sortKey = this.getAttribute('data-sort');
            const ascending = !this.classList.contains('ascending');
            
            // Reset all icons
            sortIcons.forEach(i => {
                i.classList.remove('ascending', 'descending');
            });
            
            // Set this icon's state
            this.classList.add(ascending ? 'ascending' : 'descending');
            
            // Sort rows
            rows.sort((a, b) => {
                let aVal, bVal;
                
                // Get appropriate values based on sort key
                switch (sortKey) {
                    case 'invoice':
                        aVal = a.querySelector('td:nth-child(1)').textContent.trim();
                        bVal = b.querySelector('td:nth-child(1)').textContent.trim();
                        break;
                    case 'client':
                        aVal = a.querySelector('td:nth-child(2)').textContent.trim();
                        bVal = b.querySelector('td:nth-child(2)').textContent.trim();
                        break;
                    case 'date':
                        aVal = new Date(a.getAttribute('data-date'));
                        bVal = new Date(b.getAttribute('data-date'));
                        return ascending ? aVal - bVal : bVal - aVal;
                    case 'dueDate':
                        aVal = new Date(a.getAttribute('data-duedate'));
                        bVal = new Date(b.getAttribute('data-duedate'));
                        return ascending ? aVal - bVal : bVal - aVal;
                    case 'amount':
                        aVal = parseFloat(a.getAttribute('data-amount'));
                        bVal = parseFloat(b.getAttribute('data-amount'));
                        return ascending ? aVal - bVal : bVal - aVal;
                    case 'status':
                        aVal = a.getAttribute('data-status');
                        bVal = b.getAttribute('data-status');
                        break;
                }
                
                // String comparison for non-numeric fields
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
                
                return 0;
            });
            
            // Reattach rows in new sorted order
            const tbody = table.querySelector('tbody');
            rows.forEach(row => tbody.appendChild(row));
        });
    });
}

function showNotification(message) {
    // In a real application, you would use a proper notification system
    alert(message);
}

// Template Selection Script

    document.addEventListener('DOMContentLoaded', function() {
        const templateModal = document.getElementById('templateModal');
        const chooseTemplateBtn = document.getElementById('chooseTemplate');
        const closeTemplateBtn = document.querySelector('.close-template-modal');
        const closeModalX = templateModal.querySelector('.close-modal');
        let selectedTemplate = 'classic'; // Default template

        // Add styles for wider centered content with centered buttons
        const modalContent = templateModal.querySelector('.modal-content');
        modalContent.style.maxWidth = '800px'; // Make modal wider
        modalContent.style.margin = '5vh auto'; // Center vertically and horizontally
        modalContent.style.transform = 'scale(0.95)'; // Slightly reduce overall size

        // Style the template grid for vertical layout
        const templateGrid = templateModal.querySelector('.template-grid');
        if (templateGrid) {
            templateGrid.style.display = 'flex';
            templateGrid.style.flexDirection = 'column'; // Stack items vertically
            templateGrid.style.alignItems = 'center'; // Center items horizontally
            templateGrid.style.gap = '20px';
            templateGrid.style.padding = '20px';
        }

        // Style the template cards
        const templateCards = document.querySelectorAll('.template-card');
        templateCards.forEach(card => {
            card.style.width = '100%';
            card.style.maxWidth = '600px'; // Make cards wider
            card.style.textAlign = 'center';
            card.style.padding = '15px';
            
            // Center the buttons within each card
            const button = card.querySelector('.select-template');
            if (button) {
                button.style.display = 'block';
                button.style.margin = '10px auto'; // Center horizontally with margin
            }
        });

        // Open template modal
        chooseTemplateBtn.addEventListener('click', function() {
            templateModal.style.display = 'block';
            document.querySelector('.modal-overlay').style.display = 'block';
        });

        // Close template modal
        function closeTemplateModal() {
            templateModal.style.display = 'none';
            document.querySelector('.modal-overlay').style.display = 'none';
        }

        closeTemplateBtn.addEventListener('click', closeTemplateModal);
        closeModalX.addEventListener('click', closeTemplateModal);

        // Update the template selection handler
        templateCards.forEach(card => {
            card.addEventListener('click', function() {
                selectedTemplate = this.dataset.template;
                // Save to localStorage
                localStorage.setItem('selectedInvoiceTemplate', selectedTemplate);
                templateCards.forEach(c => c.classList.remove('selected'));
                this.classList.add('selected');
            });

            const selectBtn = card.querySelector('.select-template');
            selectBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                selectedTemplate = card.dataset.template;
                // Save to localStorage
                localStorage.setItem('selectedInvoiceTemplate', selectedTemplate);
                console.log(`Selected template: ${selectedTemplate}`);
                closeTemplateModal();
            });
        });

        // Close modal when clicking outside
        window.addEventListener('click', function(e) {
            if (e.target === templateModal) {
                closeTemplateModal();
            }
        });
    });

document.getElementById('invoiceForm').addEventListener('submit', function(event) {
    event.preventDefault();

    // Collect data from the form
    const clientName = document.getElementById('clientName').value;
    const clientEmail = document.getElementById('clientEmail').value;
    const clientAddress = document.getElementById('clientAddress').value;
    const clientTaxId = document.getElementById('clientTaxId').value;
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const issueDate = document.getElementById('issueDate').value;
    const dueDate = document.getElementById('dueDate').value;
    const paymentTerms = document.getElementById('paymentTerms').value;
    const issuerName = document.getElementById('issuerName').value;
    const issuerNuit = document.getElementById('issuerNuit').value;
    const issuerAddress = document.getElementById('issuerAddress').value;
    const description = document.getElementById('description').value;
    const totalWithoutTaxes = document.getElementById('totalWithoutTaxes').value;
    const vatRate = document.getElementById('vatRate').value;
    const vatAmount = document.getElementById('vatAmount').value;
    const totalAmountPayable = document.getElementById('totalAmountPayable').value;
    const paymentConditions = document.getElementById('paymentConditions').value;
    const legalInfo = document.getElementById('legalInfo').value;
});


// Generate Invoice HTML
async function generateInvoiceHTML(invoiceData) {
    try {
        const selectedTemplate = localStorage.getItem('selectedInvoiceTemplate') || 'classic';
        const templatePath = `/templates/${TEMPLATE_PATHS[selectedTemplate]}`;
        
        const response = await fetch(templatePath);
        if (!response.ok) throw new Error('Template not found');
        
        const templateContent = await response.text();
        return await populateTemplate(templateContent, invoiceData);
    } catch (error) {
        console.error('Error generating invoice HTML:', error);
        throw error;
    }
}

function getInvoiceData() {
    const form = document.getElementById('invoiceForm');
    const itemRows = document.querySelectorAll('.item-row');

    // Fetch client name from the input field (handles both new and existing clients)
    const clientInput = document.getElementById('client-input');
    const clientName = clientInput ? clientInput.value : '';

    return {
        invoiceNumber: document.getElementById('invoiceNumber').value,
        issueDate: document.getElementById('issueDate').value,
        dueDate: document.getElementById('dueDate').value,
        currency: document.getElementById('currency').value,
        clientName: clientName, // Use the value from the input field
        clientAddress: document.getElementById('clientAddress').value,
        clientTaxId: document.getElementById('clientTaxId').value,
        items: Array.from(itemRows).map(row => ({
            description: row.querySelector('.item-description').value,
            quantity: row.querySelector('.item-quantity').value,
            price: row.querySelector('.item-price').value,
            vat: row.querySelector('.item-vat').textContent,
            total: row.querySelector('.item-total').textContent
        })),
        subtotal: document.getElementById('subtotal').textContent,
        totalVat: document.getElementById('totalVat').textContent,
        total: document.getElementById('invoiceTotal').textContent,
        notes: document.getElementById('notes').value
    };
}

// Download functionality
document.getElementById('downloadPdfBtn').addEventListener('click', async function() {
    const invoiceData = getInvoiceData();
    const invoiceHTML = await generateInvoiceHTML(invoiceData);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Invoice ${invoiceData.invoiceNumber}</title>
                <link rel="stylesheet" href="css/invoice-layout.css">
                <style>
                    body { margin: 0; background: white; }
                </style>
            </head>
            <body>
                <div class="invoice-a4">
                    ${invoiceHTML}
                </div>
                <script>
                    window.onload = function() {
                        window.print();
                        window.onafterprint = function() {
                            window.close();
                        };
                    };
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
});

document.addEventListener('input', async function(e) {
    if (e.target.id !== 'client-list') return;
    
    const searchTerm = e.target.value.toLowerCase().trim();
    const expandClientForm = document.getElementById('expand-client-form');
    
    if (searchTerm.length < 2) {
        hideClientSuggestions();
        return;
    }

    try {
        const { data: clients, error } = await supabase
            .from('clients')
            .select('*')
            .ilike('name', `%${searchTerm}%`)
            .limit(5);

        if (error) throw error;

        if (clients.length > 0) {
            showClientSuggestions(clients);
            expandClientForm.style.display = 'none';
        } else {
            hideClientSuggestions();
            expandClientForm.style.display = 'block';
        }
    } catch (err) {
        console.error('Error fetching clients:', err);
    }
});

function showClientSuggestions(clients) {
    let suggestionsBox = document.querySelector('.client-suggestions');
    if (!suggestionsBox) {
        suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'client-suggestions';
        document.getElementById('client-list').parentNode.appendChild(suggestionsBox);
    }

    suggestionsBox.innerHTML = clients.map(client => `
        <div class="suggestion-item" data-client='${JSON.stringify(client)}'>
            ${client.name} (${client.nuit || 'No NUIT'})
        </div>
    `).join('');

    suggestionsBox.style.display = 'block';
}

function hideClientSuggestions() {
    const suggestionsBox = document.querySelector('.client-suggestions');
    if (suggestionsBox) {
        suggestionsBox.style.display = 'none';
    }
}

function fillInvoiceFields(client) {
    document.getElementById('clientTaxId').value = client.nuit || '';
    document.getElementById('clientEmail').value = client.email || '';
    document.getElementById('clientAddress').value = client.billing_address || '';
    // Fill other relevant fields
}

// Add click handler for suggestions
document.addEventListener('click', function(e) {
    if (e.target.closest('.suggestion-item')) {
        const client = JSON.parse(e.target.closest('.suggestion-item').dataset.client);
        document.getElementById('client-list').value = client.name;
        fillInvoiceFields(client);
        hideClientSuggestions();
    } else if (!e.target.closest('.client-suggestions') && !e.target.closest('#client-list')) {
        hideClientSuggestions();
    }
});

// Save new client
async function saveNewClient(clientData) {
    try {
        const { data, error } = await supabase
            .from('clients')
            .insert([clientData])
            .select()
            .single();

        if (error) throw error;

        document.getElementById('client-list').value = data.name;
        fillInvoiceFields(data);
        document.getElementById('expand-client-form').style.display = 'none';
        
        return data;
    } catch (err) {
        console.error('Error saving client:', err);
        throw err;
    }
}

function setupClientAutocomplete() {
    const clientInput = document.getElementById('client-list');
    const expandClientForm = document.getElementById('expand-client-form');
    
    if (!clientInput) return;

    clientInput.addEventListener('input', async function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        if (searchTerm.length < 2) {
            hideClientSuggestions();
            if (expandClientForm) {
                expandClientForm.style.display = 'none';
            }
            return;
        }

        try {
            const { data: clients, error } = await window.supabase
                .from('clients')
                .select('*')
                .ilike('company_name', `%${searchTerm}%`)
                .limit(5);

            if (error) throw error;

            if (clients && clients.length > 0) {
                showClientSuggestions(clients);
                if (expandClientForm) {
                    expandClientForm.style.display = 'none';
                }
            } else {
                hideClientSuggestions();
                if (expandClientForm) {
                    expandClientForm.style.display = 'block';
                }
            }
        } catch (err) {
            console.error('Error fetching clients:', err);
        }
    });
}

function showClientSuggestions(clients) {
    const clientInput = document.getElementById('client-list');
    if (!clientInput) return;
    
    let suggestionsBox = document.querySelector('.client-suggestions');
    
    if (!suggestionsBox) {
        suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'client-suggestions';
        clientInput.parentNode.appendChild(suggestionsBox);
    }

    suggestionsBox.innerHTML = clients.map(client => `
        <div class="suggestion-item" data-client='${JSON.stringify(client)}'>
            ${client.company_name || client.name} ${client.customer_tax_id ? `(${client.customer_tax_id})` : ''}
        </div>
    `).join('');

    suggestionsBox.style.display = 'block';

    // Add click handlers for suggestions
    suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            const client = JSON.parse(this.dataset.client);
            fillClientFields(client);
            hideClientSuggestions();
        });
    });
}

function hideClientSuggestions() {
    const suggestionsBox = document.querySelector('.client-suggestions');
    if (suggestionsBox) {
        suggestionsBox.style.display = 'none';
    }
}

function fillClientFields(client) {
    const fields = {
        'client-list': client.company_name || client.name,
        'clientEmail': client.email,
        'clientAddress': client.billing_address,
        'clientTaxId': client.customer_tax_id || client.nuit
    };

    Object.keys(fields).forEach(id => {
        const element = document.getElementById(id);
        if (element && fields[id]) {
            element.value = fields[id];
        }
    });
}

async function saveNewClient(clientData) {
    try {
        // Validate required data
        if (!clientData?.name) {
            throw new Error('Client name is required');
        }

        const { data, error } = await window.supabase
            .from('clients')
            .insert([{
                company_name: clientData.name,
                customer_tax_id: clientData.nuit,
                email: clientData.email,
                billing_address: clientData.billing_address,
                telephone: clientData.telephone,
                status: 'active'
            }])
            .select()
            .single();

        if (error) throw error;

        fillClientFields(data);
        const expandClientForm = document.getElementById('expand-client-form');
        if (expandClientForm) {
            expandClientForm.style.display = 'none';
        }
        
        return data;
    } catch (err) {
        console.error('Error saving client:', err);
        alert('Error saving client: ' + (err.message || 'Unknown error'));
        throw err;
    }
}

// ...existing code...

async function fillClientFields(client) {
    const fields = {
        'client-list': client.company_name || client.name,
        'clientEmail': client.email,
        'clientAddress': client.billing_address,
        'clientTaxId': client.customer_tax_id || client.nuit
    };

    Object.keys(fields).forEach(id => {
        const element = document.getElementById(id);
        if (element && fields[id]) {
            element.value = fields[id];
        }
    });

    // Generate new invoice number when client is selected
    try {
        const invoiceNumber = await invoiceNumberService.getNextInvoiceNumber(client.customer_id);
        document.getElementById('invoiceNumber').value = invoiceNumber;
    } catch (error) {
        console.error('Error generating invoice number:', error);
        showNotification('Error generating invoice number');
    }
}

// ...existing code...

async function updateMetricsDisplay() {
    try {
        // Fetch all invoices
        const { data: invoices, error: invoiceError } = await window.supabase
            .from('invoices')
            .select('*');

        if (invoiceError) throw invoiceError;

        // Calculate metrics
        const totalInvoices = invoices.length;
        const totalPaid = invoices.filter(inv => inv.status === 'paid').length;
        const totalPending = invoices.filter(inv => inv.status === 'pending').length;
        const totalOverdue = invoices.filter(inv => inv.status === 'overdue').length;

        // Calculate percentages
        const paidPercentage = ((totalPaid / totalInvoices) * 100).toFixed(1);
        const pendingPercentage = ((totalPending / totalInvoices) * 100).toFixed(1);
        const overduePercentage = ((totalOverdue / totalInvoices) * 100).toFixed(1);

        // Update metrics cards
        document.querySelector('#totalInvoicesCard .metric-value').textContent = totalInvoices;
        document.querySelector('#paidInvoicesCard .metric-value').textContent = totalPaid;
        document.querySelector('#paidInvoicesCard .metric-footer .metric-label').textContent = 
            `${paidPercentage}% of Total`;

        document.querySelector('#pendingInvoicesCard .metric-value').textContent = totalPending;
        document.querySelector('#pendingInvoicesCard .metric-footer .metric-label').textContent = 
            `${pendingPercentage}% of Total`;

        document.querySelector('#overdueInvoicesCard .metric-value').textContent = totalOverdue;
        document.querySelector('#overdueInvoicesCard .metric-footer .metric-label').textContent = 
            `${overduePercentage}% of Total`;

    } catch (error) {
        console.error('Error updating metrics:', error);
        // Set default values in case of error
        document.querySelector('#totalInvoicesCard .metric-value').textContent = '0';
        document.querySelector('#paidInvoicesCard .metric-value').textContent = '0';
        document.querySelector('#pendingInvoicesCard .metric-value').textContent = '0';
        document.querySelector('#overdueInvoicesCard .metric-value').textContent = '0';
    }
}

// Setup realtime subscription for metrics updates
function setupMetricsSubscription() {
    const subscription = window.supabase
        .channel('public:invoices')
        .on('postgres_changes', 
            {
                event: '*',
                schema: 'public',
                table: 'invoices'
            }, 
            () => {
                updateMetricsDisplay();
            }
        )
        .subscribe();

    return () => {
        subscription.unsubscribe();
    };
}

async function updateCharts() {
    try {
        // Fetch all invoices
        const { data: invoices, error: invoiceError } = await window.supabase
            .from('invoices')
            .select('*');

        if (invoiceError) throw invoiceError;

        // Update both charts with the invoice data
        if (Array.isArray(invoices)) {
            processInvoiceDataForCharts(invoices);
        }

    } catch (error) {
        console.error('Error updating charts:', error);
        resetCharts();
    }
}

function processInvoiceDataForCharts(invoices) {
    // Update Distribution Chart
    const weeklyData = calculateWeeklyDistribution(invoices);
    updateInvoiceDistributionChart('weekly', weeklyData);
    
    // Update Revenue Chart
    const revenueData = calculateRevenueByStatus(invoices);
    updateRevenueByStatusChart('monthly', revenueData);
}

function calculateWeeklyDistribution(invoices) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyCounts = Array(7).fill(0);
    
    invoices.forEach(invoice => {
        const date = new Date(invoice.issue_date);
        const dayIndex = date.getDay();
        dailyCounts[dayIndex]++;
    });

    // Rotate array to start from Monday
    const values = [...dailyCounts.slice(1), dailyCounts[0]];
    const labels = [...days.slice(1), days[0]];

    return { labels, values };
}

function calculateRevenueByStatus(invoices) {
    return invoices.reduce((acc, invoice) => {
        const status = invoice.status || 'pending';
        const amount = parseFloat(invoice.total_amount) || 0;
        acc[status] = (acc[status] || 0) + amount;
        return acc;
    }, {});
}

function resetCharts() {
    // Reset Invoice Distribution Chart
    if (window.invoiceDistributionChart) {
        window.invoiceDistributionChart.data.datasets[0].data = Array(7).fill(0);
        window.invoiceDistributionChart.update();
    }

    // Reset Revenue by Status Chart
    if (window.revenueByStatusChart) {
        window.revenueByStatusChart.data.datasets[0].data = Array(4).fill(0);
        window.revenueByStatusChart.update();
    }
}

// Setup realtime subscription for chart updates
function setupChartSubscription() {
    const subscription = window.supabase
        .channel('public:invoices')
        .on('postgres_changes', 
            {
                event: '*',
                schema: 'public',
                table: 'invoices'
            }, 
            () => {
                updateCharts();
            }
        )
        .subscribe();

    return () => {
        subscription.unsubscribe();
    };
}

// ...existing code...

async function setupInvoiceTable() {
    try {
        const tbody = document.querySelector('#invoicesTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading invoices...</td></tr>';
        }

        // Initial fetch with default filters
        await fetchAndDisplayInvoices();

    } catch (error) {
        console.error('Error setting up invoice table:', error);
        showError('Failed to load invoices');
    }
}

async function fetchAndDisplayInvoices(page = 1) {
    try {
        const isDevMode = localStorage.getItem('devMode') === 'true';
        
        if (isDevMode) {
            // Use test data in dev mode
            displayInvoices(TEST_DATA.invoices);
            return;
        }

        // Calculate pagination range
        const from = (page - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        let invoices;
        let count;

        if (DEV_MODE) {
            // Use test data in dev mode
            invoices = TEST_DATA.invoices.slice(from, to + 1);
            count = TEST_DATA.invoices.length;
        } else {
            // Real Supabase query in production
            const countResult = await supabase
                .from('invoices')
                .select('*', { count: 'exact', head: true });

            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            invoices = data;
            count = countResult.count;
        }

        totalInvoices = count;
        currentPage = page;

        // Update table content
        const tbody = document.querySelector('#invoicesTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!invoices || invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No invoices found</td></tr>';
            return;
        }

        // Populate table rows
        invoices.forEach(invoice => {
            const row = `
                <tr>
                    <td>${invoice.invoice_number}</td>
                    <td>${invoice.customer_name}</td>
                    <td>${formatDate(invoice.issue_date)}</td>
                    <td>${formatCurrency(invoice.total_amount)}</td>
                    <td><span class="status ${invoice.status}">${invoice.status}</span></td>
                    <td class="actions">
                        <button class="action-btn view-btn" data-invoice="${invoice.invoice_number}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn send-btn">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="action-btn more-btn">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });

        // Update pagination controls
        updatePaginationControls();

        // Setup action buttons for new rows
        setupActionButtons();

    } catch (error) {
        console.error('Error fetching invoices:', error);
        showError('Failed to load invoices');
    }
}

function showError(message) {
    const tbody = document.querySelector('#invoicesTable tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-error">${message}</td></tr>`;
    }
}

// ...existing code...

function setupPagination() {
    const controls = document.querySelector('.page-controls');
    if (!controls) return;

    controls.addEventListener('click', (e) => {
        const button = e.target.closest('.pagination-btn');
        if (!button || button.disabled) return;

        const currentPage = parseInt(document.querySelector('.pagination-btn.active')?.textContent || '1');
        let newPage = currentPage;

        if (button.classList.contains('active')) return;

        if (button.querySelector('.fa-chevron-left')) {
            newPage = currentPage - 1;
        } else if (button.querySelector('.fa-chevron-right')) {
            newPage = currentPage + 1;
        } else {
            newPage = parseInt(button.textContent);
        }

        fetchAndDisplayInvoices(newPage);
    });
}

function setupInvoiceSubscription() {
    const subscription = supabase
        .channel('public:invoices')
        .on('postgres_changes', 
            {
                event: '*',
                schema: 'public',
                table: 'invoices'
            }, 
            () => {
                fetchAndDisplayInvoices();
            }
        )
        .subscribe();

    return () => {
        subscription.unsubscribe();
    };
}

// Helper function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize invoice table when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupInvoiceTable();
});

// Helper Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function showNoResults(message = 'No invoices found') {
    const table = document.getElementById('invoicesTable');
    const noResults = document.getElementById('noResultsMessage');
    
    if (table) table.style.display = 'none';
    if (noResults) {
        noResults.style.display = 'block';
        const messageEl = noResults.querySelector('p');
        if (messageEl) messageEl.textContent = message;
    }
}

function hideNoResults() {
    const table = document.getElementById('invoicesTable');
    const noResults = document.getElementById('noResultsMessage');
    
    if (table) table.style.display = 'table';
    if (noResults) noResults.style.display = 'none';
}

function updatePaginationDisplay(currentPage, totalPages, totalItems) {
    const controls = document.querySelector('.page-controls');
    const pageInfo = document.querySelector('.page-info');
    if (!controls || !pageInfo) return;

    // Update page info text
    const start = ((currentPage - 1) * 6) + 1;
    const end = Math.min(currentPage * 6, totalItems);
    pageInfo.textContent = `Showing ${start}-${end} of ${totalItems} invoices`;

    // Clear existing pagination buttons
    controls.innerHTML = '';

    // Add previous button
    controls.innerHTML += `
        <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

    // Add page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            controls.innerHTML += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}">${i}</button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            controls.innerHTML += '<span class="pagination-ellipsis">...</span>';
        }
    }

    // Add next button
    controls.innerHTML += `
        <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}"
                ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

    // Add click handlers for new buttons
    setupPaginationHandlers(currentPage, totalPages);
}

function setupPaginationHandlers(currentPage, totalPages) {
    const controls = document.querySelector('.page-controls');
    if (!controls) return;

    controls.addEventListener('click', (e) => {
        const button = e.target.closest('.pagination-btn');
        if (!button || button.disabled) return;

        let newPage = currentPage;

        if (button.querySelector('.fa-chevron-left')) {
            newPage = currentPage - 1;
        } else if (button.querySelector('.fa-chevron-right')) {
            newPage = currentPage + 1;
        } else {
            newPage = parseInt(button.textContent);
        }

        if (newPage >= 1 && newPage <= totalPages) {
            fetchAndDisplayInvoices(newPage);
        }
    });
}

// Add this at the beginning of the file
document.addEventListener('DOMContentLoaded', function() {
    const downloadPdfBtn = document.getElementById('downloadPdfBtn');
    if (downloadPdfBtn) {
        downloadPdfBtn.addEventListener('click', async function() {
            // ... existing download PDF logic ...
        });
    }
    
    // Initialize invoice module
    initializeInvoiceModule();
    setupEventListeners();
    setupCharts();
    updateCharts();
    setupChartSubscription();
    setupInvoiceTable();

    // Initialize client autocomplete
    const clientList = document.getElementById('client-list');
    if (clientList) {
        setupClientAutocomplete();
    }

    // Initialize metrics
    updateMetricsDisplay();
    setupMetricsSubscription();
});

// Update fetchAndDisplayInvoices to use the new pagination
async function fetchAndDisplayInvoices(page = 1, limit = 6, filters = {}) {
    try {
        // ... existing query setup code ...

        const { data: invoices, count, error } = await queryBuilder;

        if (error) throw error;

        // Update table body
        const tbody = document.querySelector('#invoicesTable tbody');
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!invoices || invoices.length === 0) {
            showNoResults();
            return;
        }

        hideNoResults();

        invoices.forEach(invoice => {
            // ... existing row creation code ...
        });

        // Update pagination with new utility function
        updatePaginationDisplay(page, Math.ceil(count / limit), count);

    } catch (error) {
        console.error('Error fetching invoices:', error);
        showNoResults('Error loading invoices');
    }
}

// ...existing code...

async function fetchAndDisplayInvoices() {
    try {
        if (!window.supabase) {
            throw new Error('Supabase client not initialized');
        }

        const tbody = document.querySelector('#invoicesTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading invoices...</td></tr>';
        }

        // Fetch invoices from Supabase
        const { data: invoices, error } = await window.supabase
            .from('invoices')
            .select(`
                *,
                clients (*)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Clear loading message
        if (tbody) {
            tbody.innerHTML = '';
        }

        // Handle no invoices case
        if (!invoices || invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No invoices found</td></tr>';
            return;
        }

        // Populate table with real data
        invoices.forEach(invoice => {
            const row = `
                <tr data-invoice-id="${invoice.id}">
                    <td>${invoice.invoice_number || ''}</td>
                    <td>${invoice.customer_name || ''}</td>
                    <td>${formatDate(invoice.issue_date)}</td>
                    <td>${formatDate(invoice.due_date)}</td>
                    <td>${formatCurrency(invoice.total_amount)}</td>
                    <td><span class="status ${invoice.status?.toLowerCase() || 'pending'}">${invoice.status || 'Pending'}</span></td>
                    <td class="actions">
                        <button class="action-btn view-btn" data-invoice="${invoice.invoice_number}" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn send-btn" title="Send">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                        <button class="action-btn more-btn" title="More">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML('beforeend', row);
        });

        // Setup action buttons for the newly added rows
        setupActionButtons();

    } catch (error) {
        console.error('Error fetching invoices:', error);
        const tbody = document.querySelector('#invoicesTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-error">Error loading invoices</td></tr>';
        }
    }
}

function updateInvoiceDistributionChart(period) {
    console.log('updateInvoiceDistributionChart called with:', {
        period: period,
        type: typeof period,
        stack: new Error().stack
    });

    try {
        if (!window.invoiceDistributionChart) {
            throw new Error('Chart instance not found');
        }

        // Type validation with detailed logging
        if (typeof period !== 'string') {
            console.error('Invalid period type:', {
                received: period,
                type: typeof period,
                stack: new Error().stack
            });
            return;
        }

        // Log right before toLowerCase()
        console.log('About to process period:', period);
        const lowerPeriod = period.toLowerCase();

        let labels = [];
        let data = [];

        switch (lowerPeriod) {
            case 'weekly':
                labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                data = [5, 7, 10, 8, 12, 3, 1];
                break;
            case 'monthly':
                labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                data = [25, 38, 42, 35];
                break;
            case 'quarterly':
                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                data = [42, 38, 55, 40, 45, 42, 38, 35, 42, 48, 50, 65];
                break;
            default:
                console.error('Invalid period value:', lowerPeriod);
                return;
        }

        window.invoiceDistributionChart.data.labels = labels;
        window.invoiceDistributionChart.data.datasets[0].data = data;
        window.invoiceDistributionChart.update();
        console.log('Chart updated successfully with period:', lowerPeriod);

    } catch (error) {
        console.error('Error updating distribution chart:', {
            error: error.message,
            period: period,
            stack: error.stack
        });
    }
}

function updateRevenueByStatusChart(period) {
    console.log('updateRevenueByStatusChart called with:', {
        period: period,
        type: typeof period,
        stack: new Error().stack
    });

    try {
        if (!window.revenueByStatusChart) {
            throw new Error('Chart instance not found');
        }

        // Type validation with detailed logging
        if (typeof period !== 'string') {
            console.error('Invalid period type:', {
                received: period,
                type: typeof period,
                stack: new Error().stack
            });
            return;
        }

        // Log right before toLowerCase()
        console.log('About to process period:', period);
        const lowerPeriod = period.toLowerCase();

        const data = lowerPeriod === 'monthly' ? [65, 15, 12, 8] : [78, 10, 8, 4];
        window.revenueByStatusChart.data.datasets[0].data = data;
        window.revenueByStatusChart.update();
        console.log('Chart updated successfully with period:', lowerPeriod);

    } catch (error) {
        console.error('Error updating revenue chart:', {
            error: error.message,
            period: period,
            stack: error.stack
        });
    }
}

// ...existing code...

function setupClientFormHandlers(clientList) {
    const addClientBtn = document.getElementById('add-client-btn');
    const newClientForm = document.getElementById('new-client-form');
    const saveNewClientBtn = document.getElementById('save-new-client');

    // Handle client input changes
    clientList.addEventListener('input', async function() {
        const value = this.value.trim();
        if (!value) return;

        const { data: existingClient, error } = await window.supabase
            .from('clients')
            .select('customer_id')
            .eq('company_name', value)
            .maybeSingle();

        if (addClientBtn) {
            addClientBtn.style.display = (!existingClient && value) ? 'inline-block' : 'none';
        }
    });

    // Show new client form
    if (addClientBtn) {
        addClientBtn.addEventListener('click', function() {
            if (newClientForm) {
                newClientForm.style.display = 'block';
                const newClientName = document.getElementById('new-client-name');
                if (newClientName) {
                    newClientName.value = clientList.value;
                }
            }
        });
    }

    // Handle new client save
    if (saveNewClientBtn) {
        saveNewClientBtn.addEventListener('click', async function() {
            try {
                const newClient = {
                    company_name: document.getElementById('new-client-name')?.value,
                    customer_tax_id: document.getElementById('new-client-nuit')?.value,
                    email: document.getElementById('new-client-email')?.value,
                    billing_address: document.getElementById('new-client-address')?.value,
                    status: 'active'
                };

                const { data, error } = await window.supabase
                    .from('clients')
                    .insert([newClient])
                    .select()
                    .single();

                if (error) throw error;

                // Update form with new client
                clientList.value = data.company_name;
                if (newClientForm) newClientForm.style.display = 'none';
                if (addClientBtn) addClientBtn.style.display = 'none';

                // Fill client details in invoice form
                fillClientFields(data);
                
                showNotification('Client added successfully!', 'success');
                
            } catch (error) {
                console.error('Error saving client:', error);
                showNotification('Error adding client: ' + error.message, 'error');
            }
        });
    }
}

// ...existing code...

function setupActionButtons() {
    // View Button (Opens PDF)
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const invoiceNumber = this.dataset.invoice;
            try {
                const { data: invoice, error } = await window.supabase
                    .from('invoices')
                    .select('pdf_url')
                    .eq('invoice_number', invoiceNumber)
                    .single();
                
                if (error) throw error;
                
                if (invoice?.pdf_url) {
                    // Open PDF in a new window
                    const previewContainer = document.getElementById('invoicePreviewContent');
                    if (previewContainer) {
                        previewContainer.innerHTML = `
                            <iframe src="${invoice.pdf_url}" width="100%" height="600px" frameborder="0"></iframe>
                        `;
                        openModal('viewInvoiceModal');
                    }
                } else {
                    throw new Error('PDF not found');
                }
            } catch (error) {
                console.error('Error viewing invoice:', error);
                showNotification('Error opening invoice PDF');
            }
        });
    });

    // Send Button (Email Modal)
    document.querySelectorAll('.send-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const row = this.closest('tr');
            const invoiceNumber = row.querySelector('.view-btn').dataset.invoice;
            
            // Get client email from database
            try {
                const invoice = await fetchInvoiceForEmail(invoiceNumber);
                if (!invoice) throw new Error('Invoice not found');

                const emailModal = document.getElementById('emailInvoiceModal');
                const emailInput = document.getElementById('emailTo');
                const subjectInput = document.getElementById('emailSubject');
                
                if (emailInput) {
                    emailInput.value = invoice.clients?.email || '';
                }
                
                if (subjectInput) {
                    subjectInput.value = `Invoice ${invoiceNumber}`;
                }

                openModal('emailInvoiceModal');
                setupEmailFormHandler(emailModal, invoiceNumber);

            } catch (error) {
                console.error('Error preparing email:', error);
                showNotification('Error preparing email: ' + error.message);
            }
        });
    });

    // ...existing more button code...

    // More Button (Status Change Dropdown)
    document.querySelectorAll('.more-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation(); // Prevent event bubbling
            
            const row = this.closest('tr');
            const invoiceNumber = row.querySelector('.view-btn').dataset.invoice;
            
            // Remove any existing dropdowns
            document.querySelectorAll('.status-dropdown').forEach(d => d.remove());
            
            // Create and position dropdown
            const dropdown = document.createElement('div');
            dropdown.className = 'status-dropdown';
            dropdown.innerHTML = `
                <div class="dropdown-item" data-status="paid">Mark as Paid</div>
                <div class="dropdown-item" data-status="pending">Mark as Pending</div>
                <div class="dropdown-item" data-status="overdue">Mark as Overdue</div>
                <div class="dropdown-item" data-status="cancelled">Mark as Cancelled</div>
            `;
            
            // Position dropdown below button
            const rect = this.getBoundingClientRect();
            dropdown.style.position = 'absolute';
            dropdown.style.top = `${rect.bottom + window.scrollY}px`;
            dropdown.style.left = `${rect.left}px`;
            document.body.appendChild(dropdown);
            
            // Add click handlers for status changes
            dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', async function() {
                    const newStatus = this.dataset.status;
                    try {
                        const { error } = await window.supabase
                            .from('invoices')
                            .update({ status: newStatus })
                            .eq('invoice_number', invoiceNumber);
                        
                        if (error) throw error;
                        
                        // Update UI
                        const statusSpan = row.querySelector('.status');
                        if (statusSpan) {
                            statusSpan.className = `status ${newStatus}`;
                            statusSpan.textContent = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
                        }
                        
                        // Update metrics and charts
                        await updateMetricsDisplay();
                        await updateCharts();
                        
                        showNotification(`Invoice marked as ${newStatus}`);
                    } catch (error) {
                        console.error('Error updating status:', error);
                        showNotification('Error updating invoice status');
                    } finally {
                        dropdown.remove();
                    }
                });
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function closeDropdown(e) {
                if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        });
    });
}

// ...existing code...

// Add invoice number service
const invoiceNumberService = {
    async getNextInvoiceNumber(clientId) {
        try {
            const { data, error } = await window.supabase
                .from('invoices')
                .select('invoice_number')
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const lastNumber = data?.[0]?.invoice_number?.split('-')?.[2] || '0000';
            const nextNumber = (parseInt(lastNumber) + 1).toString().padStart(4, '0');
            
            return `INV-${year}-${nextNumber}`;
        } catch (error) {
            console.error('Error generating invoice number:', error);
            const randomNumber = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
            return `INV-${new Date().getFullYear()}-${randomNumber}`;
        }
    }
};

// Update client search to use company_name instead of name
async function fetchClients(searchTerm) {
    try {
        const { data: clients, error } = await window.supabase
            .from('clients')
            .select('*')
            .ilike('company_name', `%${searchTerm}%`)
            .limit(5);

        if (error) throw error;
        return clients;
    } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
    }
}

// Update client input handler
document.addEventListener('input', async function(e) {
    if (e.target.id !== 'client-list') return;
    
    const searchTerm = e.target.value.toLowerCase().trim();
    const expandClientForm = document.getElementById('expand-client-form');
    
    if (searchTerm.length < 2) {
        if (expandClientForm) expandClientForm.style.display = 'none';
        hideClientSuggestions();
        return;
    }

    const clients = await fetchClients(searchTerm);
    if (clients.length > 0) {
        showClientSuggestions(clients);
        if (expandClientForm) expandClientForm.style.display = 'none';
    } else {
        hideClientSuggestions();
        if (expandClientForm) expandClientForm.style.display = 'block';
    }
});

// ...existing code...

async function fetchClients(searchTerm) {
    try {
        const { data: clients, error } = await window.supabase
            .from('clients')
            .select('*')
            .ilike('company_name', `%${searchTerm}%`)
            .limit(5);

        if (error) throw error;
        return clients || [];
    } catch (error) {
        console.error('Error fetching clients:', error);
        return [];
    }
}

document.addEventListener('input', async function(e) {
    if (e.target.id !== 'client-list') return;
    
    const searchTerm = e.target.value.toLowerCase().trim();
    const expandClientForm = document.getElementById('expand-client-form');
    
    if (searchTerm.length < 2) {
        hideClientSuggestions();
        if (expandClientForm) {
            expandClientForm.style.display = 'none';
        }
        return;
    }

    try {
        const clients = await fetchClients(searchTerm);
        
        if (clients.length > 0) {
            showClientSuggestions(clients);
            if (expandClientForm) {
                expandClientForm.style.display = 'none';
            }
        } else {
            hideClientSuggestions();
            if (expandClientForm) {
                expandClientForm.style.display = 'block';
            }
        }
    } catch (err) {
        console.error('Error fetching clients:', err);
    }
});

function showClientSuggestions(clients) {
    const clientInput = document.getElementById('client-list');
    if (!clientInput) return;
    
    let suggestionsBox = document.querySelector('.client-suggestions');
    
    if (!suggestionsBox) {
        suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'client-suggestions';
        const parent = clientInput.parentNode;
        if (parent) {
            parent.appendChild(suggestionsBox);
        }
    }

    suggestionsBox.innerHTML = clients.map(client => `
        <div class="suggestion-item" data-client='${JSON.stringify(client)}'>
            ${client.company_name || ''} ${client.customer_tax_id ? `(${client.customer_tax_id})` : ''}
        </div>
    `).join('');

    suggestionsBox.style.display = 'block';
}

// ...existing code...

async function fillClientFields(client) {
    const fields = {
        'client-list': client.company_name,
        'clientEmail': client.email,
        'clientAddress': `${client.street_name || ''} ${client.address_detail || ''}, ${client.city || ''}, ${client.province || ''} ${client.postal_code || ''}`,
        'clientTaxId': client.customer_tax_id,
        'clientContact': client.contact,
        'clientTelephone': client.telephone
    };

    Object.keys(fields).forEach(id => {
        const element = document.getElementById(id);
        if (element && fields[id]) {
            element.value = fields[id];
        }
    });
}

async function saveNewClient(clientData) {
    try {
        // Validate required data
        if (!clientData?.company_name) {
            throw new Error('Company name is required');
        }

        const { data, error } = await window.supabase
            .from('clients')
            .insert([{
                company_name: clientData.company_name,
                customer_tax_id: clientData.customer_tax_id,
                email: clientData.email,
                street_name: clientData.street_name,
                address_detail: clientData.address_detail,
                city: clientData.city,
                postal_code: clientData.postal_code,
                province: clientData.province,
                country: clientData.country || 'Mozambique',
                telephone: clientData.telephone,
                contact: clientData.contact,
                status: 'active'
            }])
            .select()
            .single();

        if (error) throw error;

        fillClientFields(data);
        const expandClientForm = document.getElementById('expand-client-form');
        if (expandClientForm) {
            expandClientForm.style.display = 'none';
        }
        
        return data;
    } catch (err) {
        console.error('Error saving client:', err);
        alert('Error saving client: ' + (err.message || 'Unknown error'));
        throw err;
    }
}

async function saveInvoice(invoiceData) {
    try {
        // Show loading state
        showNotification('Saving invoice...');

        if (!invoiceData.invoice_number || !invoiceData.customer_name) {
            throw new Error('Missing required fields');
        }

        // Format dates
        const issueDate = new Date(invoiceData.issue_date);
        const dueDate = new Date(invoiceData.due_date);

        // Save invoice data to database
        const { data: invoice, error: insertError } = await window.supabase
            .from('invoices')
            .insert([{
                invoice_number: invoiceData.invoice_number,
                issue_date: issueDate.toISOString(),
                due_date: dueDate.toISOString(),
                client_id: invoiceData.client_id,
                status: 'pending',
                subtotal: invoiceData.subtotal,
                vat_amount: invoiceData.vat_amount,
                total_amount: invoiceData.total_amount,
                currency: invoiceData.currency,
                payment_terms: invoiceData.payment_terms,
                notes: invoiceData.notes,
                customer_name: invoiceData.customer_name
            }])
            .select();

        if (insertError) throw insertError;

        showNotification('Invoice saved successfully!');
        closeAllModals();
        await refreshInvoiceList();

        return invoice;

    } catch (error) {
        console.error('Error saving invoice:', error);
        showNotification('Error saving invoice: ' + (error.message || 'Unknown error'));
        throw error;
    }
}

// ...rest of the code...

