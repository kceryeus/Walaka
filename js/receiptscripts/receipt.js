// Initialize Supabase client
const supabase = window.supabase;

// Helper: Set current environment ID in localStorage (no longer used)
// function setCurrentEnvironmentId(id) { ... }
// Helper: Get current environment ID (no longer used)
// async function getCurrentEnvironmentId() { ... }

// DOM Elements
const receiptsTable = document.getElementById('receiptsTable');
const createReceiptBtn = document.getElementById('createReceiptBtn');
const createReceiptModal = document.getElementById('createReceiptModal');
const receiptForm = document.getElementById('receiptForm');
const searchInput = document.querySelector('.search-box input');
const statusFilter = document.querySelector('.filter-dropdown select');

// Add a global variable to store invoice amounts by invoice ID
const invoiceAmounts = {};
// Add a global variable to track multi-select mode
let multiSelectMode = false;

// Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
    await populateClientsDropdown();
    loadReceipts();
    setupEventListeners();

    // Highlight receipt if coming from invoice action
    const highlightId = localStorage.getItem('highlightReceiptId');
    if (highlightId) {
        // Wait for table to load
        setTimeout(() => {
            const row = document.querySelector(`tr[data-receipt-id='${highlightId}']`);
            if (row) {
                row.classList.add('highlight-receipt');
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            localStorage.removeItem('highlightReceiptId');
        }, 800);
    }

    // Auto-select related invoice if coming from invoice action
    const relatedInvoice = localStorage.getItem('relatedInvoiceForCreditNote');
    if (relatedInvoice) {
        // Wait for modal and invoice select to be available
        setTimeout(() => {
            const invoiceSelect = document.getElementById('relatedInvoice');
            if (invoiceSelect) {
                for (const opt of invoiceSelect.options) {
                    if (opt.textContent.includes(relatedInvoice) || opt.value === relatedInvoice) {
                        opt.selected = true;
                        break;
                    }
                }
            }
            localStorage.removeItem('relatedInvoiceForCreditNote');
        }, 800);
    }

    // Add warning message element below the amount input
    // (This code should be run after DOMContentLoaded)
    const amountInput = document.getElementById('amount');
    if (amountInput && !document.getElementById('amount-warning')) {
        const warning = document.createElement('div');
        warning.id = 'amount-warning';
        warning.style.color = 'red';
        warning.style.display = 'none';
        warning.style.fontSize = '0.95em';
        warning.textContent = 'Amount exceeds the selected invoice total.';
        amountInput.parentNode.appendChild(warning);
    }
    // Add event listeners for validation
    const invoiceSelect = document.getElementById('relatedInvoice');
    if (amountInput && invoiceSelect) {
        function checkAmountWarning() {
            let invoiceAmount = 0;
            if (multiSelectMode) {
                // Sum all selected invoice amounts
                Array.from(invoiceSelect.selectedOptions).forEach(opt => {
                    const id = opt.value;
                    if (invoiceAmounts[id]) invoiceAmount += parseFloat(invoiceAmounts[id]);
                });
            } else {
                const selectedInvoiceId = invoiceSelect.value;
                invoiceAmount = invoiceAmounts[selectedInvoiceId] || 0;
            }
            const enteredAmount = parseFloat(amountInput.value);
            const warning = document.getElementById('amount-warning');
            if (!isNaN(invoiceAmount) && !isNaN(enteredAmount)) {
                if (enteredAmount > invoiceAmount && invoiceAmount > 0) {
                    warning.style.display = 'block';
                } else {
                    warning.style.display = 'none';
                }
            } else {
                warning.style.display = 'none';
            }
        }
        amountInput.addEventListener('input', checkAmountWarning);
        invoiceSelect.addEventListener('change', checkAmountWarning);
    }

    // Add button for multi-select toggle
    const invoiceSelectContainer = document.getElementById('relatedInvoice')?.parentNode;
    if (invoiceSelectContainer && !document.getElementById('toggle-multiselect-btn')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggle-multiselect-btn';
        toggleBtn.type = 'button';
        toggleBtn.textContent = 'Select Multiple Invoices';
        toggleBtn.style.marginLeft = '8px';
        toggleBtn.style.background = '#1976d2'; // Blue
        toggleBtn.style.color = 'white';
        toggleBtn.style.border = 'none';
        toggleBtn.style.borderRadius = '4px';
        toggleBtn.style.padding = '4px 12px';
        toggleBtn.style.fontSize = '0.95em';
        toggleBtn.style.width = 'auto';
        toggleBtn.style.minWidth = 'unset';
        toggleBtn.onclick = function() {
            // Disabled for now: show toast and do not enable multi-select
            showNotification('em desenvolvimento, brevemente disponível', 'info');
            /*
            multiSelectMode = !multiSelectMode;
            const invoiceSelect = document.getElementById('relatedInvoice');
            if (multiSelectMode) {
                invoiceSelect.setAttribute('multiple', 'multiple');
                invoiceSelect.size = 5;
                toggleBtn.textContent = 'Single Invoice Mode';
            } else {
                invoiceSelect.removeAttribute('multiple');
                invoiceSelect.size = 1;
                toggleBtn.textContent = 'Select Multiple Invoices';
                // Deselect all but the first selected
                if (invoiceSelect.selectedOptions.length > 1) {
                    const first = invoiceSelect.selectedOptions[0];
                    Array.from(invoiceSelect.options).forEach(opt => opt.selected = false);
                    if (first) first.selected = true;
                }
            }
            */
        };
        invoiceSelectContainer.appendChild(toggleBtn);
    }

    // Attach Download PDF button event listener
    const downloadBtn = document.getElementById('downloadReceiptPdfBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            if (window._lastViewedReceiptId) {
                downloadReceiptPdf(window._lastViewedReceiptId);
            } else {
                showNotification('Please view a receipt first before downloading PDF.', 'warning');
            }
        });
    }

    // Add CSS for highlight
    const style = document.createElement('style');
    style.innerHTML = `.highlight-receipt { background: #fffbe6 !important; transition: background 1s; }`;
    document.head.appendChild(style);

    // Ensure populateBankAccountsDropdown is defined (if not, define it)
    if (typeof window.populateBankAccountsDropdown !== 'function') {
        window.populateBankAccountsDropdown = async function() {
            const user = await supabase.auth.getUser();
            if (!user || !user.data || !user.data.user) return;
            const { data: accounts, error } = await supabase
                .from('bank_accounts')
                .select('id, account_type, bank_name, operator_name, account_holder, account_number, currency')
                .eq('user_id', user.data.user.id);
            const dropdown = document.getElementById('bankAccount');
            if (!dropdown) return;
            dropdown.innerHTML = '<option value="">Select Account</option>';
            if (accounts && accounts.length) {
                accounts.forEach(acc => {
                    let name = '';
                    if (acc.account_type === 'bank') name = acc.bank_name;
                    else if (acc.account_type === 'wallet') name = acc.operator_name;
                    else if (acc.account_type === 'cash') name = acc.account_holder;
                    const label = `${name} (${acc.account_number}) [${acc.currency}]`;
                    const option = document.createElement('option');
                    option.value = acc.id;
                    option.textContent = label;
                    dropdown.appendChild(option);
                });
            } else {
                dropdown.innerHTML = '<option value="">No accounts found</option>';
            }
        };
    }

    // Also call populateBankAccountsDropdown in createReceiptBtn click handler (for robustness)
    if (createReceiptBtn) {
        createReceiptBtn.addEventListener('click', async () => {
            await window.populateBankAccountsDropdown();
        });
    }
});

function setupEventListeners() {
    // Ensure all .close-modal buttons have type="button"
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.setAttribute('type', 'button');
    });

    // Create Receipt Button
    createReceiptBtn?.addEventListener('click', async () => {
        // Get current user ID
        const user_id = await getCurrentUserId();
        // Generate the next receipt number
        const nextReceiptNumber = await generateIncrementalReceiptNumber(user_id);
        // Set the value in the input field
        const receiptNumberInput = document.getElementById('receiptNumber');
        if (receiptNumberInput) {
            receiptNumberInput.value = nextReceiptNumber;
            receiptNumberInput.readOnly = true; // Make it read-only
        }
        openModal('createReceiptModal');
    });

    // Event delegation for all .close-modal buttons
    document.body.addEventListener('click', function(e) {
        if (e.target.classList.contains('close-modal')) {
            console.log('close-modal clicked (delegated)', e.target);
            // Find the parent modal
            let modal = e.target.closest('.document-modal');
            if (modal) closeModal(modal.id);
        }
    });

    // Direct event listener for .close-modal buttons (robustness)
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function(e) {
            console.log('close-modal clicked (direct)', e.target);
            let modal = e.target.closest('.document-modal');
            if (modal) closeModal(modal.id);
        });
    });

    // Also close when clicking the overlay
    const overlay = document.querySelector('.modal-overlay');
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            // Only close if clicking directly on the overlay, not on modal content
            if (e.target === overlay) {
                // Close the topmost open modal
                const openModals = Array.from(document.querySelectorAll('.document-modal'))
                    .filter(m => m.style.display === 'block');
                if (openModals.length > 0) {
                    closeModal(openModals[openModals.length - 1].id);
                }
            }
        });
    }
    // Prevent modal from closing when clicking inside modal content
    document.querySelectorAll('.document-modal-content').forEach(modalContent => {
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // Search Input
    searchInput?.addEventListener('input', (e) => {
        filterReceipts(e.target.value);
    });

    // Status Filter
    statusFilter?.addEventListener('change', (e) => {
        filterReceiptsByStatus(e.target.value);
    });

    // Form Submit
    receiptForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createReceipt();
    });
}

async function loadReceipts() {
    try {
        let query = supabase
            .from('receipts')
            .select('*, invoices:related_invoice_id ("invoiceNumber")')
            .order('created_at', { ascending: false });
        const { data: receipts, error } = await query;

        if (error) throw error;

        displayReceipts(receipts);
    } catch (error) {
        console.error('Error loading receipts:', error);
        showNotification('Error loading receipts', 'error');
    }
}

function displayReceipts(receipts) {
    const tbody = receiptsTable.querySelector('tbody');
    tbody.innerHTML = '';

    receipts.forEach(receipt => {
        // Support multiple invoice numbers
        let invoiceNumbers = '-';
        if (receipt.invoices && Array.isArray(receipt.invoices)) {
            invoiceNumbers = receipt.invoices.map(inv => inv.invoiceNumber).join(', ');
        } else if (receipt.invoices?.invoiceNumber) {
            invoiceNumbers = receipt.invoices.invoiceNumber;
        } else if (receipt.related_invoice_id && typeof receipt.related_invoice_id === 'string' && receipt.related_invoice_id.includes(',')) {
            invoiceNumbers = receipt.related_invoice_id;
        }
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${receipt.receipt_number}</td>
            <td>${receipt.client_name}</td>
            <td>${formatDate(receipt.payment_date)}</td>
            <td>${formatCurrency(receipt.amount)}</td>
            <td>${receipt.payment_method}</td>
            <td>${invoiceNumbers}</td>
            <td><span class="status-badge status-${receipt.status.toLowerCase()}">${receipt.status}</span></td>
            <td class="actions-cell">
                <button class="action-btn view-btn" onclick="viewReceipt('${receipt.receipt_id}')">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Replace the old generateReceiptNumber with an async version
async function generateIncrementalReceiptNumber(user_id) {
    const year = new Date().getFullYear();
    // Query the latest receipt for this user and year
    const { data, error } = await supabase
        .from('receipts')
        .select('receipt_number')
        .eq('user_id', user_id)
        .ilike('receipt_number', `REC-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1);
    if (error) {
        console.error('Error fetching last receipt number:', error);
        // Fallback to 1 if error
        return `REC-${year}-0001`;
    }
    let nextNumber = 1;
    if (data && data.length > 0) {
        const last = data[0].receipt_number;
        // Extract the numeric part
        const match = last.match(/REC-\d{4}-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }
    // Zero pad to 4 digits
    const padded = String(nextNumber).padStart(4, '0');
    return `REC-${year}-${padded}`;
}

// Utility: Show notification (improved for user feedback)
function showNotification(message, type = 'success') {
    // Basic toast implementation
    let toast = document.getElementById('walaka-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'walaka-toast';
        toast.style.position = 'fixed';
        toast.style.bottom = '32px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.background = type === 'error' ? '#d32f2f' : (type === 'info' ? '#1976d2' : '#388e3c');
        toast.style.color = 'white';
        toast.style.padding = '12px 24px';
        toast.style.borderRadius = '6px';
        toast.style.fontSize = '1em';
        toast.style.zIndex = 9999;
        toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        toast.style.display = 'none';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.display = 'block';
    toast.style.background = type === 'error' ? '#d32f2f' : (type === 'info' ? '#1976d2' : '#388e3c');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.style.display = 'none';
    }, 2500);
    // Also log to console
    console.log(`${type}: ${message}`);
}

// Helper: Validate receipt form data
function validateReceiptForm(formData) {
    const requiredFields = ['client', 'paymentDate', 'amount', 'paymentMethod'];
    for (const field of requiredFields) {
        if (!formData.get(field)) {
            showNotification(`Missing required field: ${field}`, 'error');
            return false;
        }
    }
    if (isNaN(parseFloat(formData.get('amount')))) {
        showNotification('Amount must be a valid number', 'error');
        return false;
    }
    return true;
}

// Improved: Populate clients dropdown with explicit columns and error handling
async function populateClientsDropdown() {
    const clientSelect = document.getElementById('client');
    if (!clientSelect) return;
    const { data: clients, error } = await supabase
        .from('clients')
        .select('customer_id, customer_name')
        .order('customer_name', { ascending: true });
    if (error) {
        showNotification('Failed to load clients', 'error');
        console.error(error);
        return;
    }
    clientSelect.innerHTML = '<option value="">Select Client</option>';
    for (const client of clients) {
        const option = document.createElement('option');
        option.value = client.customer_id;
        option.textContent = client.customer_name;
        option.setAttribute('data-client-name', client.customer_name);
        clientSelect.appendChild(option);
    }
    clientSelect.onchange = async function() {
        await populateInvoicesDropdown(this.value);
    };
}

// Improved: Populate invoices dropdown for selected client_id
async function populateInvoicesDropdown(clientId) {
    const invoiceSelect = document.getElementById('relatedInvoice');
    if (!invoiceSelect) return;
    // Clear dropdown before fetching
    invoiceSelect.innerHTML = '<option value="">Select Invoice</option>';
    // Clear invoiceAmounts
    Object.keys(invoiceAmounts).forEach(key => delete invoiceAmounts[key]);
    if (!clientId) {
        return;
    }
    // Fetch all invoices for this client (for fallback)
    const { data: allInvoices, error: allError } = await supabase
        .from('invoices')
        .select('id, "invoiceNumber", client_id, status, total_amount')
        .eq('client_id', clientId);
    if (allError) {
        console.error('Error fetching all invoices for client:', allError);
    }
    // Fetch only pending invoices (case-insensitive)
    let { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, "invoiceNumber", client_id, status, total_amount')
        .eq('client_id', clientId)
        .ilike('status', 'pending')
        .order('created_at', { ascending: false });
    if (error) {
        showNotification('Failed to load invoices', 'error');
        console.error(error);
        return;
    }
    // Fallback: If no pending invoices, show all invoices for the client
    if (!invoices || invoices.length === 0) {
        showNotification('No pending invoices found. Showing all invoices for this client.', 'warning');
        if (allInvoices && allInvoices.length > 0) {
            for (const inv of allInvoices) {
                invoiceAmounts[inv.id] = inv.total_amount;
                const option = document.createElement('option');
                option.value = inv.id;
                option.textContent = `${inv.invoiceNumber} (${inv.status}) - ${formatCurrency(inv.total_amount)}`;
                option.setAttribute('data-amount', inv.total_amount);
                invoiceSelect.appendChild(option);
            }
        } else {
            invoiceSelect.innerHTML = '<option value="">No invoices found</option>';
        }
        return;
    }
    for (const inv of invoices) {
        invoiceAmounts[inv.id] = inv.total_amount;
        const option = document.createElement('option');
        option.value = inv.id;
        option.textContent = `${inv.invoiceNumber} - ${formatCurrency(inv.total_amount)}`;
        option.setAttribute('data-amount', inv.total_amount);
        invoiceSelect.appendChild(option);
    }
}

// Improved: Create or upsert receipt with validation and error handling
async function createReceipt() {
    try {
        const formData = new FormData(receiptForm);
        if (!validateReceiptForm(formData)) return;
        const user_id = await getCurrentUserId();
        const client_id = formData.get('client');
        const clientSelect = document.getElementById('client');
        const client_name = clientSelect.options[clientSelect.selectedIndex]?.getAttribute('data-client-name') ?? '';
        const invoiceSelect = document.getElementById('relatedInvoice');
        let related_invoice_ids = null;
        let related_invoice_numbers = null;
        let totalInvoiceAmount = 0;
        if (multiSelectMode) {
            // Collect all selected invoice IDs
            const selected = Array.from(invoiceSelect.selectedOptions).map(opt => opt.value).filter(Boolean);
            related_invoice_ids = selected.join(','); // Store as comma-separated string for now
            related_invoice_numbers = selected.map(id => {
                const opt = invoiceSelect.querySelector(`option[value='${id}']`);
                return opt ? opt.textContent.split(' - ')[0] : id;
            }).join(',');
            totalInvoiceAmount = selected.reduce((sum, id) => sum + (parseFloat(invoiceAmounts[id]) || 0), 0);
        } else {
            related_invoice_ids = invoiceSelect.value || null;
            const opt = invoiceSelect.selectedOptions[0];
            related_invoice_numbers = opt ? opt.textContent.split(' - ')[0] : '';
            totalInvoiceAmount = parseFloat(invoiceAmounts[related_invoice_ids]) || 0;
        }
        // Use the receipt number from the input field
        const receipt_number = document.getElementById('receiptNumber').value;
        const enteredAmount = parseFloat(formData.get('amount'));
        const bank_account_id = document.getElementById('bankAccount')?.value || null;
        const receiptData = {
            receipt_number,
            client_id,
            client_name,
            payment_date: formData.get('paymentDate'),
            amount: enteredAmount,
            payment_method: formData.get('paymentMethod'),
            related_invoice_id: related_invoice_ids, // Now supports multiple
            related_invoice: related_invoice_numbers, // Set to invoice number(s)
            notes: formData.get('notes'),
            status: 'paid',
            user_id,
            bank_account_id
        };
        // Use insert (or upsert if you want to avoid duplicates)
        const { data, error } = await supabase
            .from('receipts')
            .insert([receiptData])
            .select();
        if (error) throw error;
        showNotification('Receipt created successfully');
        closeModal('createReceiptModal');
        receiptForm.reset();
        document.getElementById('receiptNumber').value = '';
        loadReceipts();
        // Automatically download PDF for the new receipt
        if (data && data.length > 0) {
            await downloadReceiptPdf(data[0].receipt_id);
        }
        // --- Create notification and send email to user ---
        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (user) {
                // Create notification (this will also send email via global helper)
                await window.createNotification(
                    'system',
                    'Receipt Created',
                    `A new receipt (${receiptData.receipt_number}) has been created in your account.`,
                    'receipts.html',
                    user.id
                );
                // Remove direct call to sendNotificationEmail; handled by createNotification
            }
        } catch (err) {
            console.error('[RECEIPT EMAIL] Error sending receipt notification/email:', err);
        }
    } catch (error) {
        showNotification('Error creating receipt', 'error');
        console.error(error);
    }
}

// Utility: Mark invoice as paid and create receipt (not truly atomic, but sequential)
async function markInvoiceAsPaidAndCreateReceipt(invoiceId, receiptData) {
    // This is not a true transaction; for true atomicity, use a Postgres function
    try {
        // 1. Update invoice status
        const { error: updateError } = await supabase
            .from('invoices')
            .update({ status: 'paid', payment_date: new Date().toISOString() })
            .eq('id', invoiceId);
        if (updateError) throw updateError;
        // 2. Create receipt
        const { error: receiptError } = await supabase
            .from('receipts')
            .insert([receiptData]);
        if (receiptError) throw receiptError;
        showNotification('Invoice marked as paid and receipt created!');
        // --- Create notification and send email to user ---
        try {
            const { data: { user } } = await window.supabase.auth.getUser();
            if (user) {
                await window.createNotification(
                    'system',
                    'Receipt Created',
                    `A new receipt (${receiptData.receipt_number}) has been created in your account.`,
                    'receipts.html',
                    user.id
                );
                if (typeof window.sendNotificationEmail === 'function' && user.email) {
                    console.log('[RECEIPT EMAIL] Sending receipt creation email to user:', user.email);
                    await window.sendNotificationEmail(
                        user.email,
                        'Receipt Created',
                        `A new receipt (${receiptData.receipt_number}) has been created in your account. You can view it in your dashboard.`
                    );
                }
            }
        } catch (err) {
            console.error('[RECEIPT EMAIL] Error sending receipt notification/email:', err);
        }
    } catch (error) {
        showNotification('Error updating invoice or creating receipt', 'error');
        console.error(error);
    }
}

async function viewReceipt(id) {
    try {
        const { data: receipt, error } = await supabase
            .from('receipts')
            .select('*, invoices:related_invoice_id ("invoiceNumber")')
            .eq('receipt_id', id)
            .single();

        if (error) throw error;

        const modal = document.getElementById('viewReceiptModal');
        const details = document.getElementById('receiptDetails');
        // Support multiple invoice numbers
        let invoiceNumbers = '-';
        if (receipt.invoices && Array.isArray(receipt.invoices)) {
            invoiceNumbers = receipt.invoices.map(inv => inv.invoiceNumber).join(', ');
        } else if (receipt.invoices?.invoiceNumber) {
            invoiceNumbers = receipt.invoices.invoiceNumber;
        } else if (receipt.related_invoice_id && typeof receipt.related_invoice_id === 'string' && receipt.related_invoice_id.includes(',')) {
            invoiceNumbers = receipt.related_invoice_id;
        }
        details.innerHTML = `
            <div class="receipt-details">
                <div class="detail-row">
                    <span class="label">Receipt Number:</span>
                    <span class="value">${receipt.receipt_number}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Client:</span>
                    <span class="value">${receipt.client_name}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Payment Date:</span>
                    <span class="value">${formatDate(receipt.payment_date)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Amount:</span>
                    <span class="value">${formatCurrency(receipt.amount)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Payment Method:</span>
                    <span class="value">${receipt.payment_method}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Related Invoice(s):</span>
                    <span class="value">${invoiceNumbers}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value status-badge status-${receipt.status.toLowerCase()}">${receipt.status}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Notes:</span>
                    <span class="value">${receipt.notes || '-'}</span>
                </div>
            </div>
        `;

        openModal('viewReceiptModal');
    } catch (error) {
        console.error('Error viewing receipt:', error);
        showNotification('Error viewing receipt', 'error');
    }
}

async function deleteReceipt(id) {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
        let query = supabase
            .from('receipts')
            .delete()
            .eq('receipt_id', id);
        const { error } = await query;

        if (error) throw error;

        showNotification('Receipt deleted successfully');
        loadReceipts();
    } catch (error) {
        console.error('Error deleting receipt:', error);
        showNotification('Error deleting receipt', 'error');
    }
}

function filterReceipts(searchTerm) {
    const rows = receiptsTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
    });
}

function filterReceiptsByStatus(status) {
    const rows = receiptsTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
        if (!status) {
            row.style.display = '';
            return;
        }
        const statusCell = row.querySelector('.status-badge');
        row.style.display = statusCell.classList.contains(`status-${status}`) ? '' : 'none';
    });
}

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: 'MZN'
    }).format(amount);
}

// Helper: Fetch current user
async function getCurrentUserId() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new Error('User not authenticated');
    return user.id;
}

// Helper: Populate clients dropdown from clients table
async function populateClientsDropdown() {
    const clientSelect = document.getElementById('client');
    if (!clientSelect) return;
    const { data: clients, error } = await supabase
        .from('clients')
        .select('customer_id, customer_name')
        .order('customer_name', { ascending: true });
    if (error) return;
    clientSelect.innerHTML = '<option value="">Select Client</option>';
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.customer_id;
        option.textContent = client.customer_name;
        option.setAttribute('data-client-name', client.customer_name);
        clientSelect.appendChild(option);
    });
    // Add event listener to fetch pending invoices when client changes
    clientSelect.addEventListener('change', async function() {
        await populateInvoicesDropdown(this.value);
    });
}

// Helper: Populate invoices dropdown for selected client_id
async function populateInvoicesDropdown(clientId) {
    const invoiceSelect = document.getElementById('relatedInvoice');
    if (!invoiceSelect) return;
    // Clear dropdown before fetching
    invoiceSelect.innerHTML = '<option value="">Select Invoice</option>';
    // Clear invoiceAmounts
    Object.keys(invoiceAmounts).forEach(key => delete invoiceAmounts[key]);
    if (!clientId) {
        return;
    }
    // Fetch all invoices for this client (for fallback)
    const { data: allInvoices, error: allError } = await supabase
        .from('invoices')
        .select('id, "invoiceNumber", client_id, status, total_amount')
        .eq('client_id', clientId);
    if (allError) {
        console.error('Error fetching all invoices for client:', allError);
    }
    // Fetch only pending invoices (case-insensitive)
    let { data: invoices, error } = await supabase
        .from('invoices')
        .select('id, "invoiceNumber", client_id, status, total_amount')
        .eq('client_id', clientId)
        .ilike('status', 'pending')
        .order('created_at', { ascending: false });
    if (error) {
        showNotification('Failed to load invoices', 'error');
        console.error(error);
        return;
    }
    // Fallback: If no pending invoices, show all invoices for the client
    if (!invoices || invoices.length === 0) {
        showNotification('No pending invoices found. Showing all invoices for this client.', 'warning');
        if (allInvoices && allInvoices.length > 0) {
            for (const inv of allInvoices) {
                invoiceAmounts[inv.id] = inv.total_amount;
                const option = document.createElement('option');
                option.value = inv.id;
                option.textContent = `${inv.invoiceNumber} (${inv.status}) - ${formatCurrency(inv.total_amount)}`;
                option.setAttribute('data-amount', inv.total_amount);
                invoiceSelect.appendChild(option);
            }
        } else {
            invoiceSelect.innerHTML = '<option value="">No invoices found</option>';
        }
        return;
    }
    for (const inv of invoices) {
        invoiceAmounts[inv.id] = inv.total_amount;
        const option = document.createElement('option');
        option.value = inv.id;
        option.textContent = `${inv.invoiceNumber} - ${formatCurrency(inv.total_amount)}`;
        option.setAttribute('data-amount', inv.total_amount);
        invoiceSelect.appendChild(option);
    }
}

// Utility functions for modals
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.querySelector('.modal-overlay');
    if (modal) modal.style.display = 'block';
    if (overlay) overlay.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
    // Hide overlay only if no modals are open
    const anyOpen = Array.from(document.querySelectorAll('.document-modal'))
        .some(m => m.style.display === 'block');
    const overlay = document.querySelector('.modal-overlay');
    if (overlay && !anyOpen) overlay.style.display = 'none';
}

// Placeholder for editReceipt modal logic
function editReceipt(id) {
    alert('Edit receipt functionality coming soon!');
    // In the future, implement modal open and populate logic here
}

// --- PDF Download Functionality ---
async function downloadReceiptPdf(receiptId) {
    try {
        // Fetch receipt data (reuse viewReceipt logic)
        const { data: receipt, error } = await supabase
            .from('receipts')
            .select('*, invoices:related_invoice_id ("invoiceNumber")')
            .eq('receipt_id', receiptId)
            .single();
        if (error) throw error;
        // Fetch business profile for current user
        let user_id = null;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            user_id = user?.id;
        } catch (e) {}
        let company = {
            company_name: 'WALAKA SOFTWARE, LDA.',
            address: 'Maputo, Mozambique',
            email: 'info@walakasoftware.com',
            tax_id: 'N/A'
        };
        if (user_id) {
            const { data: profiles, error: profileError } = await supabase
                .from('business_profiles')
                .select('company_name, address, email, tax_id')
                .eq('user_id', user_id)
                .limit(1);
            if (!profileError && profiles && profiles.length > 0) {
                company = {
                    company_name: profiles[0].company_name || company.company_name,
                    address: profiles[0].address || company.address,
                    email: profiles[0].email || company.email,
                    tax_id: profiles[0].tax_id || company.tax_id
                };
            }
        }
        // Prepare data
        let invoiceNumbers = '-';
        if (receipt.invoices && Array.isArray(receipt.invoices)) {
            invoiceNumbers = receipt.invoices.map(inv => inv.invoiceNumber).join(', ');
        } else if (receipt.invoices?.invoiceNumber) {
            invoiceNumbers = receipt.invoices.invoiceNumber;
        } else if (receipt.related_invoice_id && typeof receipt.related_invoice_id === 'string' && receipt.related_invoice_id.includes(',')) {
            invoiceNumbers = receipt.related_invoice_id;
        }
        // --- Modern Minimalist PDF Layout ---
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        // Colors & fonts
        const primary = '#3498db';
        const text = '#2d3436';
        const lightText = '#636e72';
        const border = '#dfe6e9';
        // Header
        doc.setFillColor(52, 152, 219); // primary
        doc.rect(0, 0, 210, 22, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(255,255,255);
        doc.text(company.company_name, 14, 15);
        doc.setFontSize(14);
        doc.text('RECEIPT', 180, 15, { align: 'right' });
        // Receipt Number
        doc.setFontSize(11);
        doc.setTextColor(text);
        doc.setFont('helvetica', 'normal');
        doc.text(`Receipt Number: ${receipt.receipt_number}`, 14, 30);
        // Company Info (dynamic)
        doc.setFont('helvetica', 'bold');
        doc.text('From:', 14, 40);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(company.company_name, 14, 45);
        doc.text(company.address, 14, 50);
        doc.text(company.email, 14, 55);
        doc.text(`NUIT: ${company.tax_id}`, 14, 60);
        // Client Info
        doc.setFont('helvetica', 'bold');
        doc.text('To:', 120, 40);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(receipt.client_name || '-', 120, 45);
        // Receipt Details
        let y = 70;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Receipt Details', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        y += 7;
        doc.text(`Payment Date:`, 14, y); doc.text(formatDate(receipt.payment_date), 50, y);
        y += 6;
        doc.text(`Payment Method:`, 14, y); doc.text(receipt.payment_method, 50, y);
        y += 6;
        doc.text(`Related Invoice(s):`, 14, y); doc.text(invoiceNumbers, 50, y);
        y += 6;
        doc.text(`Status:`, 14, y); doc.text(receipt.status, 50, y);
        // Amount Summary Box
        y += 10;
        doc.setDrawColor(primary);
        doc.setFillColor(247, 247, 247);
        doc.roundedRect(120, 65, 70, 25, 3, 3, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(primary);
        doc.text('Amount Received', 155, 75, { align: 'center' });
        doc.setFontSize(16);
        doc.text(formatCurrency(receipt.amount), 155, 88, { align: 'center' });
        // Notes
        y += 25;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(text);
        doc.text('Notes', 14, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(lightText);
        doc.text(receipt.notes || '-', 14, y + 6, { maxWidth: 180 });
        // Footer
        doc.setFontSize(9);
        doc.setTextColor(lightText);
        doc.text('Generated by WALAKA', 105, 287, { align: 'center' });

        // --- Upload PDF to Supabase Storage ---
        const pdfBlob = doc.output('blob');
        const fileName = `receipts/${receipt.receipt_number}.pdf`;
        // Upload to 'receipts-pdfs' bucket
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('receipts-pdfs')
            .upload(fileName, pdfBlob, {
                contentType: 'application/pdf',
                upsert: true
            });
        if (uploadError && uploadError.statusCode !== '409') { // 409 = file exists, upsert will overwrite
            showNotification('Error uploading PDF to storage', 'error');
            console.error(uploadError);
            return;
        }
        // Get signed URL for private bucket
        const { data: signedUrlData, error: signedUrlError } = await supabase
            .storage
            .from('receipts-pdfs')
            .createSignedUrl(fileName, 60 * 60); // 1 hour expiry
        const pdfUrl = signedUrlData?.signedUrl || null;
        // Update the receipt row with the signed URL and bucket
        if (pdfUrl) {
            await supabase
                .from('receipts')
                .update({
                    pdf_url: pdfUrl,
                    pdf_bucket: 'receipts-pdfs'
                })
                .eq('receipt_id', receipt.receipt_id);
        }
        // Download PDF locally as well
        doc.save(`${receipt.receipt_number || 'receipt'}.pdf`);
        showNotification('PDF generated and uploaded!');
    } catch (error) {
        showNotification('Error generating PDF', 'error');
        console.error(error);
    }
}
// Patch viewReceipt to store last viewed receiptId and remove PDF link row
const _orig_viewReceipt = window.viewReceipt;
window.viewReceipt = async function(id) {
    window._lastViewedReceiptId = id;
    return _orig_viewReceipt ? _orig_viewReceipt(id) : (await viewReceipt(id));
};

// Attach event listener to the download PDF button in the viewReceiptModal
const viewReceiptModal = document.getElementById('viewReceiptModal');
if (viewReceiptModal) {
    const downloadBtn = document.getElementById('downloadReceiptPdfBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async function() {
            const receiptId = window._lastViewedReceiptId;
            if (!receiptId) {
                showNotification('Please view a receipt first before downloading PDF.', 'warning');
                return;
            }
            // Fetch the receipt number for the file name
            const { data: receipt, error } = await supabase
                .from('receipts')
                .select('receipt_number')
                .eq('receipt_id', receiptId)
                .single();
            if (error || !receipt || !receipt.receipt_number) {
                showNotification('Could not find receipt for PDF download.', 'error');
                return;
            }
            const fileName = `receipts/${receipt.receipt_number}.pdf`;
            // Get a fresh signed URL for the PDF
            const { data: signedUrlData, error: signedUrlError } = await supabase
                .storage
                .from('receipts-pdfs')
                .createSignedUrl(fileName, 60 * 60); // 1 hour expiry
            if (!signedUrlError && signedUrlData && signedUrlData.signedUrl) {
                window.open(signedUrlData.signedUrl, '_blank');
            } else {
                showNotification('Could not generate PDF download link.', 'error');
            }
        });
    }
} 