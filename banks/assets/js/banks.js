console.log("BANKS.JS LOADED - DEBUG VERSION", new Date().toISOString());
console.error("BANKS.JS DEBUG: If you see this, you are running the intended debug version.");
//import { supabase } from '../../../../js/supabaseClient.js';
//import { auth } from '../../../../js/auth.js';

// DOM Elements
const tableView = document.getElementById('table-view');
const cardsView = document.getElementById('cards-view');
const tableBody = document.getElementById('accounts-table-body');
const cardsContainer = document.getElementById('accounts-cards-container');
const emptyState = document.getElementById('empty-state');
const bankCountEl = document.getElementById('bank-count');
const walletCountEl = document.getElementById('wallet-count');
const currencyCountEl = document.getElementById('currency-count');
const primaryAccountEl = document.getElementById('primary-account');
const filterType = document.getElementById('filter-type');
const filterCurrency = document.getElementById('filter-currency');
const viewOptionBtns = document.querySelectorAll('.view-option-btn');
const addAccountBtn = document.getElementById('add-account-btn');
const emptyAddBtn = document.getElementById('empty-add-btn');

// Modals
const accountModal = document.getElementById('account-modal');
const modalTitle = document.getElementById('modal-title');
const accountForm = document.getElementById('account-form');
const accountIdInput = document.getElementById('account-id');
const accountTypeSelect = document.getElementById('account-type');
const bankFields = document.getElementById('bank-fields');
const walletFields = document.getElementById('wallet-fields');
const cashFields = document.getElementById('cash-fields');
const bankNameSelect = document.getElementById('bank-name');
const bankNameOther = document.getElementById('bank-name-other');
const operatorNameSelect = document.getElementById('operator-name');
const operatorNameOther = document.getElementById('operator-name-other');
const accountHolderInput = document.getElementById('account-holder');
const accountNumberInput = document.getElementById('account-number');
const accountNumberLabel = document.getElementById('account-number-label');
const accountNumberHint = document.getElementById('account-number-hint');
const currencySelect = document.getElementById('currency');
const branchInput = document.getElementById('branch');
const swiftCodeInput = document.getElementById('swift-code');
const bankAddressInput = document.getElementById('bank-address');
const isPrimaryCheckbox = document.getElementById('is-primary');
const walletInstructions = document.getElementById('wallet-instructions');
const saveAccountBtn = document.getElementById('save-account');
const cancelAccountBtn = document.getElementById('cancel-account');
const closeModalBtns = document.querySelectorAll('.close-modal');

// Delete Modal
const deleteModal = document.getElementById('delete-modal');
const deleteAccountType = document.getElementById('delete-account-type');
const deleteAccountName = document.getElementById('delete-account-name');
const deleteAccountNumber = document.getElementById('delete-account-number');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');

// Toast
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');
const toastIcon = document.getElementById('toast-icon');
const toastCloseBtn = document.getElementById('toast-close');

// Global state
let accounts = [];
let filteredAccounts = [];
let userId = null;
let currentAccountId = null;

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Use Supabase Auth to get the real user ID, as in dashboard.html/invoices.html
        const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
        if (sessionError || !session || !session.user) {
            window.location.href = '/login.html';
            return;
        }
        userId = session.user.id;
        // Initialize the application
        await displayUserName();
        await loadAccounts();
        initEventListeners();
        // Optionally, set up auth state change listener as in dashboard.html
        /*
        window.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                window.location.href = '/login.html';
            }
        });
        */
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error initializing application', 'error');
    }
});

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // Add account buttons
    if (addAccountBtn) addAccountBtn.addEventListener('click', () => openAddAccountModal());
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => openAddAccountModal());
    
    // Form type change
    if (accountTypeSelect) accountTypeSelect.addEventListener('change', toggleAccountTypeFields);
    
    // Other field for custom bank/operator names
    if (bankNameSelect && bankNameOther) {
        bankNameSelect.addEventListener('change', () => {
            bankNameOther.style.display = bankNameSelect.value === 'other' ? 'block' : 'none';
        });
    } else {
        if (!bankNameSelect) console.error('bankNameSelect missing');
        if (!bankNameOther) console.error('bankNameOther missing');
    }
    
    if (operatorNameSelect && operatorNameOther) {
        operatorNameSelect.addEventListener('change', () => {
            operatorNameOther.style.display = operatorNameSelect.value === 'other' ? 'block' : 'none';
        });
    } else {
        if (!operatorNameSelect) console.error('operatorNameSelect missing');
        if (!operatorNameOther) console.error('operatorNameOther missing');
    }
    
    // Cancel account form
    if (cancelAccountBtn) cancelAccountBtn.addEventListener('click', closeAccountModal);
    
    // Submit account form
    if (accountForm) accountForm.addEventListener('submit', handleAccountFormSubmit);
    
    // Close buttons for modals
    if (closeModalBtns && closeModalBtns.length) {
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const modal = this.closest('.modal');
                modal.style.display = 'none';
            });
        });
    }
    
    // Delete modal buttons
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => deleteModal.style.display = 'none');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', deleteAccount);
    
    // Filter change
    if (filterType) filterType.addEventListener('change', applyFilters);
    if (filterCurrency) filterCurrency.addEventListener('change', applyFilters);
    
    // View options toggle
    if (viewOptionBtns && viewOptionBtns.length) {
        viewOptionBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const viewType = btn.dataset.view;
                setActiveView(viewType);
            });
        });
    }
    
    // Close toast
    if (toastCloseBtn) toastCloseBtn.addEventListener('click', () => {
        toast.classList.remove('show');
    });
    
    // Handle sign out
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) signOutBtn.addEventListener('click', handleSignOut);
}

/**
 * Load accounts from database
 */
async function loadAccounts() {
    try {
        const { data, error } = await window.supabase
            .from('bank_accounts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            throw new Error(error.message);
        }
        
        accounts = data || [];
        // Fetch balances for all accounts
        const accountIds = accounts.map(acc => acc.id);
        const balanceMap = await fetchAccountBalances(accountIds);
        // Attach computed balances to accounts
        accounts.forEach(acc => {
            acc._computed_balance = balanceMap[acc.id] || 0;
        });
        filteredAccounts = [...accounts];
        
        updateAccountsUI();
        updateMetrics();
    } catch (error) {
        console.error('Error loading accounts:', error);
        showToast('Failed to load accounts', 'error');
    }
}

/**
 * Update the UI based on the current accounts data
 */
function updateAccountsUI() {
    // Check if we have accounts
    if (filteredAccounts.length === 0) {
        emptyState.style.display = 'flex';
        tableView.style.display = 'none';
        cardsView.style.display = 'none';
        return;
    }
    
    // Hide empty state
    emptyState.style.display = 'none';
    
    // Update both views
    updateTableView();
    updateCardsView();
}

/**
 * Update the table view with the current accounts
 */
function updateTableView() {
    // Update table header to include Balance column and expand column
    const tableHeader = document.querySelector('.accounts-table thead tr');
    if (tableHeader && !tableHeader.querySelector('.balance-col')) {
        const balanceTh = document.createElement('th');
        balanceTh.className = 'balance-col';
        balanceTh.textContent = 'Balance';
        tableHeader.insertBefore(balanceTh, tableHeader.children[5]); // Before Actions
    }
    if (tableHeader && !tableHeader.querySelector('.expand-col')) {
        const expandTh = document.createElement('th');
        expandTh.className = 'expand-col';
        expandTh.textContent = '';
        tableHeader.insertBefore(expandTh, tableHeader.children[0]); // First column
    }
    tableBody.innerHTML = '';
    
    filteredAccounts.forEach(account => {
        let typeLabel = '';
        if (account.account_type === 'bank') typeLabel = 'Bank';
        else if (account.account_type === 'wallet') typeLabel = 'Wallet';
        else if (account.account_type === 'cash') typeLabel = 'Cash';
        let name = '';
        if (account.account_type === 'bank') name = account.bank_name;
        else if (account.account_type === 'wallet') name = account.operator_name;
        else if (account.account_type === 'cash') name = account.account_holder;
        let number = '';
        if (account.account_type === 'bank' || account.account_type === 'wallet') number = account.account_number;
        else if (account.account_type === 'cash') number = '-';
        let balanceCell = '';
        balanceCell = `${account._computed_balance != null ? account._computed_balance.toFixed(2) : '0.00'}`;
        // Create row as DOM element
        const row = document.createElement('tr');
        row.classList.add('account-row');
        row.innerHTML = `
            <td class="expand-col">
                <button class="expand-btn" title="Show Statement" data-id="${account.id}">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </td>
            <td class="type-col">${typeLabel}</td>
            <td class="name-col">${name}</td>
            <td class="holder-col">${account.account_holder}</td>
            <td class="number-col">${number}</td>
            <td class="currency-col">${account.currency}</td>
            <td class="balance-col">${balanceCell}</td>
            <td class="action-col">
                <div class="action-buttons">
                    <button class="action-btn star-btn ${account.is_primary ? 'active' : ''}" data-id="${account.id}" title="Set as primary">
                        <i class="fas fa-star"></i>
                    </button>
                    <button class="action-btn edit-btn" data-id="${account.id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-id="${account.id}" title="Delete">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;
        // Attach event listeners
        row.querySelector('.edit-btn').addEventListener('click', () => {
            openEditAccountModal(account.id);
        });
        row.querySelector('.delete-btn').addEventListener('click', () => {
            openDeleteModal(account.id);
        });
        row.querySelector('.star-btn').addEventListener('click', () => {
            setAsPrimary(account.id);
        });
        // Expand/collapse logic
        row.querySelector('.expand-btn').addEventListener('click', function() {
            const alreadyOpen = row.classList.contains('expanded');
            // Collapse any open statement rows
            document.querySelectorAll('.account-row.expanded').forEach(r => {
                r.classList.remove('expanded');
                if (r.nextSibling && r.nextSibling.classList && r.nextSibling.classList.contains('statement-row')) {
                    r.parentNode.removeChild(r.nextSibling);
                }
            });
            if (alreadyOpen) return; // Just collapsed
            row.classList.add('expanded');
            // Insert statement row
            const statementRow = document.createElement('tr');
            statementRow.className = 'statement-row';
            statementRow.innerHTML = `<td colspan="8">
                <div class="statement-section" data-account-id="${account.id}">
                    <div class="statement-controls">
                        <label>From: <input type="date" class="statement-date-from"></label>
                        <label>To: <input type="date" class="statement-date-to"></label>
                        <button class="statement-export-btn"><i class="fas fa-file-export"></i> Export</button>
                    </div>
                    <div class="statement-table-container">
                        <div class="statement-loading">Loading...</div>
                        <table class="statement-table" style="display:none;">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Notes</th>
                                    <th>Invoice/Receipt</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </td>`;
            row.parentNode.insertBefore(statementRow, row.nextSibling);
            // Fetch and render statement
            loadAndRenderStatement(account.id, statementRow);
        });
        tableBody.appendChild(row);
    });
}

/**
 * Update the cards view with the current accounts
 */
function updateCardsView() {
    cardsContainer.innerHTML = '';
    filteredAccounts.forEach(account => {
        let typeLabel = '';
        if (account.account_type === 'bank') typeLabel = 'Bank';
        else if (account.account_type === 'wallet') typeLabel = 'Wallet';
        else if (account.account_type === 'cash') typeLabel = 'Cash';
        let name = '';
        if (account.account_type === 'bank') name = account.bank_name;
        else if (account.account_type === 'wallet') name = account.operator_name;
        else if (account.account_type === 'cash') name = account.account_holder;
        let number = '';
        if (account.account_type === 'bank' || account.account_type === 'wallet') number = account.account_number;
        else if (account.account_type === 'cash') number = '-';
        let balanceInfo = `<div class='account-balance'><strong>Balance:</strong> ${account._computed_balance != null ? account._computed_balance.toFixed(2) : '0.00'} ${account.currency}</div>`;
        // Create card as DOM element
        const card = document.createElement('div');
        card.className = 'account-card';
        card.innerHTML = `
            <div class="account-type">${typeLabel}</div>
            <div class="account-name">${name}</div>
            <div class="account-holder">${account.account_holder}</div>
            <div class="account-number">${number}</div>
            <div class="account-currency">${account.currency}</div>
            ${balanceInfo}
            <div class="account-actions">
                <button class="secondary-btn edit-card-btn" data-id="${account.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="danger-btn delete-card-btn" data-id="${account.id}">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        `;
        card.querySelector('.edit-card-btn').addEventListener('click', () => {
            openEditAccountModal(account.id);
        });
        card.querySelector('.delete-card-btn').addEventListener('click', () => {
            openDeleteModal(account.id);
        });
        cardsContainer.appendChild(card);
    });
}

/**
 * Update metrics based on all accounts
 */
function updateMetrics() {
    // Refactored for clarity and extensibility
    const counts = {
        bank: 0,
        wallet: 0,
        cash: 0
    };
    const currencySet = new Set();
    let primaryAccountName = 'None';
    accounts.forEach(account => {
        if (counts[account.account_type] !== undefined) counts[account.account_type]++;
        if (account.currency) currencySet.add(account.currency);
        if (account.is_primary) {
            if (account.account_type === 'bank') primaryAccountName = account.bank_name;
            else if (account.account_type === 'wallet') primaryAccountName = account.operator_name;
            else if (account.account_type === 'cash') primaryAccountName = account.account_holder;
        }
    });
    bankCountEl.textContent = counts.bank;
    walletCountEl.textContent = counts.wallet;
    // If you have a cashCountEl, update it here
    const cashCountEl = document.getElementById('cash-count');
    if (cashCountEl) cashCountEl.textContent = counts.cash;
    currencyCountEl.textContent = currencySet.size;
    primaryAccountEl.textContent = primaryAccountName;
}

/**
 * Apply filters and update UI
 */
function applyFilters() {
    const typeFilter = filterType.value;
    const currencyFilter = filterCurrency.value;
    
    filteredAccounts = accounts.filter(account => {
        // Filter by account type
        if (typeFilter !== 'all' && account.account_type !== typeFilter) {
            return false;
        }
        
        // Filter by currency
        if (currencyFilter !== 'all' && account.currency !== currencyFilter) {
            return false;
        }
        
        return true;
    });
    
    updateAccountsUI();
}

/**
 * Set active view (table or cards)
 */
function setActiveView(viewType) {
    // Update active button
    viewOptionBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === viewType);
    });
    
    // Show selected view
    if (viewType === 'table') {
        tableView.style.display = 'block';
        cardsView.style.display = 'none';
    } else {
        tableView.style.display = 'none';
        cardsView.style.display = 'block';
    }
}

/**
 * Open modal to add a new account
 */
function openAddAccountModal() {
    // Set modal title
    modalTitle.textContent = 'Add New Account';
    
    // Reset form
    accountForm.reset();
    accountIdInput.value = '';
    currentAccountId = null;
    
    // Default to bank account type and show relevant fields
    accountTypeSelect.value = 'bank';
    toggleAccountTypeFields();
    
    // Show modal
    accountModal.style.display = 'block';
}

/**
 * Open modal to edit an existing account
 */
async function openEditAccountModal(accountId) {
    // Find the account
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    // Set modal title
    modalTitle.textContent = 'Edit Account';
    
    // Set form values
    accountIdInput.value = account.id;
    currentAccountId = account.id;
    accountTypeSelect.value = account.account_type;
    accountHolderInput.value = account.account_holder;
    accountNumberInput.value = account.account_number;
    currencySelect.value = account.currency;
    branchInput.value = account.branch || '';
    swiftCodeInput.value = account.swift_code || '';
    bankAddressInput.value = account.bank_address || '';
    isPrimaryCheckbox.checked = account.is_primary;
    
    // Set account type specific fields
    if (account.account_type === 'bank') {
        bankNameSelect.value = account.bank_name;
        // Check if it's a custom bank name
        if (!Array.from(bankNameSelect.options).some(opt => opt.value === account.bank_name)) {
            bankNameSelect.value = 'other';
            bankNameOther.value = account.bank_name;
            bankNameOther.style.display = 'block';
        } else {
            bankNameOther.style.display = 'none';
        }
    } else if (account.account_type === 'wallet') {
        operatorNameSelect.value = account.operator_name;
        // Check if it's a custom operator name
        if (!Array.from(operatorNameSelect.options).some(opt => opt.value === account.operator_name)) {
            operatorNameSelect.value = 'other';
            operatorNameOther.value = account.operator_name;
            operatorNameOther.style.display = 'block';
        } else {
            operatorNameOther.style.display = 'none';
        }
        walletInstructions.value = account.instructions || '';
    } else if (account.account_type === 'cash') {
        document.getElementById('cash-name').value = account.account_holder;
        document.getElementById('cash-balance').value = account.balance || 0;
        cashFields.style.display = 'block';
        bankNameSelect.required = false;
        operatorNameSelect.required = false;
        bankNameOther.style.display = 'none';
        operatorNameOther.style.display = 'none';
        walletInstructions.value = ''; // Clear wallet instructions for cash
    }
    
    // Toggle fields based on account type
    toggleAccountTypeFields();
    
    // Show modal
    accountModal.style.display = 'block';
}

/**
 * Open delete confirmation modal
 */
function openDeleteModal(accountId) {
    // Find the account
    const account = accounts.find(acc => acc.id === accountId);
    if (!account) return;
    
    // Set current account ID
    currentAccountId = accountId;
    
    // Set account details in the modal
    deleteAccountType.textContent = account.account_type === 'bank' ? 'Bank Account' : 'Mobile Wallet';
    deleteAccountName.textContent = account.account_type === 'bank' ? account.bank_name : account.operator_name;
    deleteAccountNumber.textContent = account.account_number;
    
    // Show modal
    deleteModal.style.display = 'block';
}

/**
 * Close account modal
 */
function closeAccountModal() {
    accountModal.style.display = 'none';
}

/**
 * Toggle form fields based on selected account type
 */
function toggleAccountTypeFields() {
    const type = accountTypeSelect.value;
    const bankAccountHolder = document.querySelector('#bank-fields #account-holder');
    const walletAccountHolder = document.querySelector('#wallet-fields #account-holder');
    const bankAccountNumber = document.getElementById('bank-account-number');
    const walletAccountNumber = document.getElementById('wallet-account-number');
    if (type === 'bank') {
        bankFields.style.display = 'block';
        walletFields.style.display = 'none';
        cashFields.style.display = 'none';
        bankNameSelect.required = true;
        bankAccountNumber.required = true;
        operatorNameSelect.required = false;
        walletAccountNumber.required = false;
        if (bankAccountHolder) bankAccountHolder.required = true;
        if (walletAccountHolder) walletAccountHolder.required = false;
    } else if (type === 'wallet') {
        bankFields.style.display = 'none';
        walletFields.style.display = 'block';
        cashFields.style.display = 'none';
        bankNameSelect.required = false;
        bankAccountNumber.required = false;
        operatorNameSelect.required = true;
        walletAccountNumber.required = true;
        if (bankAccountHolder) bankAccountHolder.required = false;
        if (walletAccountHolder) walletAccountHolder.required = true;
    } else if (type === 'cash') {
        bankFields.style.display = 'none';
        walletFields.style.display = 'none';
        cashFields.style.display = 'block';
        bankNameSelect.required = false;
        bankAccountNumber.required = false;
        operatorNameSelect.required = false;
        walletAccountNumber.required = false;
        if (bankAccountHolder) bankAccountHolder.required = false;
        if (walletAccountHolder) walletAccountHolder.required = false;
    }
    updateRequiredFields(type);
}

// Helper to get field by ID, with error logging
function getField(id) {
    const el = document.getElementById(id);
    if (!el) {
        console.error(`[banks.js] Field with id '${id}' not found in DOM.`);
    }
    return el;
}

function updateRequiredFields(selectedType) {
    // Remove required from all
    getField('bank-account-holder')?.removeAttribute('required');
    getField('bank-account-number')?.removeAttribute('required');
    getField('bank-name')?.removeAttribute('required');
    getField('wallet-account-holder')?.removeAttribute('required');
    getField('wallet-account-number')?.removeAttribute('required');
    getField('operator-name')?.removeAttribute('required');
    getField('cash-name')?.removeAttribute('required');
    getField('cash-balance')?.removeAttribute('required');
    // Add required to visible fields
    if (selectedType === 'bank') {
        getField('bank-account-holder')?.setAttribute('required', 'required');
        getField('bank-account-number')?.setAttribute('required', 'required');
        getField('bank-name')?.setAttribute('required', 'required');
    } else if (selectedType === 'wallet') {
        getField('wallet-account-holder')?.setAttribute('required', 'required');
        getField('wallet-account-number')?.setAttribute('required', 'required');
        getField('operator-name')?.setAttribute('required', 'required');
    } else if (selectedType === 'cash') {
        getField('cash-name')?.setAttribute('required', 'required');
        getField('cash-balance')?.setAttribute('required', 'required');
    }
}

// Listen for account type changes
const accountTypeSelector = getField('account-type', 'init');
if (accountTypeSelector) {
    accountTypeSelector.addEventListener('change', function() {
        toggleAccountTypeFields();
    });
    // On page load, set correct fields
    toggleAccountTypeFields();
}

/**
 * Handle account form submission
 */
async function handleAccountFormSubmit(e) {
    e.preventDefault();
    try {
        const type = accountTypeSelect.value;
        // Always provide required values for NOT NULL columns
        let accountData = {
            account_type: type,
            user_id: userId,
            currency: getField('currency')?.value || 'MZN',
            is_primary: getField('is-primary')?.checked || false,
        };

        let holderValue = '', numberValue = '';
        if (type === 'bank') {
            holderValue = getField('bank-account-holder')?.value.trim();
            numberValue = getField('bank-account-number')?.value.trim();
            accountData = {
                ...accountData,
                account_holder: holderValue || '',
                account_number: numberValue || '',
                bank_name: getField('bank-name')?.value || '',
                branch: getField('branch')?.value || null,
                swift_code: getField('swift-code')?.value || null,
                bank_address: getField('bank-address')?.value || null,
                operator_name: null,
                instructions: null,
                balance: null,
            };
        } else if (type === 'wallet') {
            holderValue = getField('wallet-account-holder')?.value.trim();
            numberValue = getField('wallet-account-number')?.value.trim();
            accountData = {
                ...accountData,
                account_holder: holderValue || '',
                account_number: numberValue || '',
                bank_name: null,
                branch: null,
                swift_code: null,
                bank_address: null,
                operator_name: getField('operator-name')?.value || '',
                instructions: getField('wallet-instructions')?.value || null,
                balance: null,
            };
        } else if (type === 'cash') {
            holderValue = getField('cash-name')?.value.trim();
            let balanceValue = parseFloat(getField('cash-balance')?.value || '0');
            if (isNaN(balanceValue)) balanceValue = 0;
            accountData = {
                ...accountData,
                account_holder: holderValue || '',
                account_number: '-', // Always provide a value for NOT NULL
                bank_name: null,
                branch: null,
                swift_code: null,
                bank_address: null,
                operator_name: null,
                instructions: null,
                balance: balanceValue,
            };
            numberValue = 'N/A'; // Not required for cash
        }

        // Validate required fields
        if (!holderValue) throw new Error('Account holder name is required');
        if (type !== 'cash' && !numberValue) throw new Error(`${type === 'bank' ? 'Account number' : 'Mobile number'} is required`);
        if (!accountData.currency) throw new Error('Currency is required');

        // Debug log for accountData
        console.log('Submitting accountData:', accountData);

        // Basic validation for bank/wallet fields
        if (type === 'bank' && !getField('bank-name')?.value.trim()) {
            throw new Error('Bank name is required');
        }
        if (type === 'wallet' && !getField('operator-name')?.value.trim()) {
            throw new Error('Mobile operator is required');
        }
        // Validate mobile number format (Mozambique)
        if (type === 'wallet') {
            const mobileRegex = /^(84|85|86|87)\d{7}$/;
            if (!mobileRegex.test(numberValue)) {
                throw new Error('Invalid mobile number format. Use format: 84xxxxxxx');
            }
        }
        // If setting as primary, update all other accounts
        if (isPrimaryCheckbox.checked) {
            await unsetAllPrimary();
        }
        // Build the account object
        if (accountIdInput?.value) {
            await updateAccount(accountIdInput.value, accountData);
            showToast('Account updated successfully', 'success');
        } else {
            await createAccount(accountData);
            showToast('Account created successfully', 'success');
        }
        // Close modal and refresh
        closeAccountModal();
        await loadAccounts();
    } catch (error) {
        console.error('Form submission error:', error);
        showToast(error.message || 'Failed to save account', 'error');
    }
}

/**
 * Create a new account
 */
async function createAccount(accountData) {
    try {
        const { data, error } = await window.supabase
            .from('bank_accounts')
            .insert([accountData]);
        
        if (error) {
            throw new Error(`Failed to create account: ${error.message}`);
        }
        
        return data;
    } catch (error) {
        console.error('Error creating account:', error);
        throw error;
    }
}

/**
 * Update existing account
 */
async function updateAccount(accountId, accountData) {
    try {
        const { data, error } = await window.supabase
            .from('bank_accounts')
            .update(accountData)
            .eq('id', accountId)
            .eq('user_id', userId);
        
        if (error) {
            throw new Error(`Failed to update account: ${error.message}`);
        }
        
        return data;
    } catch (error) {
        console.error('Error updating account:', error);
        throw error;
    }
}

/**
 * Delete an account
 */
async function deleteAccount() {
    if (!currentAccountId) return;
    
    try {
        const { error } = await window.supabase
            .from('bank_accounts')
            .delete()
            .eq('id', currentAccountId)
            .eq('user_id', userId);
        
        if (error) {
            throw new Error(`Failed to delete account: ${error.message}`);
        }
        
        // Close modal and refresh
        deleteModal.style.display = 'none';
        currentAccountId = null;
        
        // Refresh accounts list
        await loadAccounts();
        
        // Show success message
        showToast('Account deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting account:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Set an account as primary
 */
async function setAsPrimary(accountId) {
    try {
        // First unset all primary accounts
        await unsetAllPrimary();
        
        // Then set the selected account as primary
        const { error } = await window.supabase
            .from('bank_accounts')
            .update({ is_primary: true })
            .eq('id', accountId)
            .eq('user_id', userId);
        
        if (error) {
            throw new Error(`Failed to set primary account: ${error.message}`);
        }
        
        // Refresh accounts list
        await loadAccounts();
        
        // Show success message
        showToast('Primary account updated', 'success');
    } catch (error) {
        console.error('Error setting primary account:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Unset all primary accounts
 */
async function unsetAllPrimary() {
    try {
        const { error } = await window.supabase
            .from('bank_accounts')
            .update({ is_primary: false })
            .eq('user_id', userId)
            .eq('is_primary', true);
        
        if (error) {
            throw new Error(`Failed to unset primary accounts: ${error.message}`);
        }
    } catch (error) {
        console.error('Error unsetting primary accounts:', error);
        throw error;
    }
}

/**
 * Display the current user's name
 */
async function displayUserName() {
    const supabase = window.supabase;
    if (typeof supabase === 'undefined' || !supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    let displayName = session.user.email;
    try {
        const { data: userRecord, error } = await supabase
            .from('users')
            .select('username')
            .eq('id', session.user.id)
            .maybeSingle();

        if (userRecord && userRecord.username) {
            displayName = userRecord.username;
        }
    } catch (e) {
        console.error('Error fetching user record:', e);
    }

    const userSpan = document.getElementById('user-displayname');
    if (userSpan) userSpan.textContent = displayName;
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'success') {
    // Set message and icon
    toastMessage.textContent = message;
    
    // Clear previous classes
    toast.className = 'toast';
    toast.classList.add(`toast-${type}`);
    
    // Set icon
    toastIcon.className = 'fas';
    switch (type) {
        case 'success':
            toastIcon.classList.add('fa-check-circle');
            break;
        case 'error':
            toastIcon.classList.add('fa-times-circle');
            break;
        case 'warning':
            toastIcon.classList.add('fa-exclamation-circle');
            break;
        default:
            toastIcon.classList.add('fa-info-circle');
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 5000);
}

/**
 * Handle sign out
 */
async function handleSignOut() {
    try {
        await window.supabase.auth.signOut();
    } catch (error) {
        console.error('Error signing out:', error);
        showToast('Error signing out: ' + error.message, 'error');
    }
}

// Dropdown open/close logic for user menu
// (copied from invoices page)
document.addEventListener('DOMContentLoaded', () => {
    const userProfile = document.getElementById('userProfile');
    const userDropdown = document.getElementById('userDropdown');

    if (!userProfile || !userDropdown) return;

    let dropdownTimeout;

    function openDropdown() {
        clearTimeout(dropdownTimeout);
        userProfile.classList.add('open');
    }

    function closeDropdown() {
        dropdownTimeout = setTimeout(() => {
            userProfile.classList.remove('open');
        }, 150);
    }

    // Mouse events for desktop
    userProfile.addEventListener('mouseenter', openDropdown);
    userProfile.addEventListener('mouseleave', closeDropdown);
    userDropdown.addEventListener('mouseenter', openDropdown);
    userDropdown.addEventListener('mouseleave', closeDropdown);

    // Click events for mobile
    userProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.innerWidth <= 768) {
            userProfile.classList.toggle('open');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!userProfile.contains(e.target)) {
            userProfile.classList.remove('open');
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            userProfile.classList.remove('open');
        }
    });
});

/**
 * Fetch balances for all accounts from bank_account_transactions
 */
async function fetchAccountBalances(accountIds) {
    if (!accountIds.length) return {};
    const { data, error } = await window.supabase
        .rpc('get_account_balances', { account_ids: accountIds });
    if (error) {
        console.error('Error fetching balances:', error);
        return {};
    }
    const balanceMap = {};
    data.forEach(row => {
        balanceMap[row.bank_account_id] = parseFloat(row.balance) || 0;
    });
    return balanceMap;
}

// Fetch and render statement for an account
async function loadAndRenderStatement(accountId, statementRow) {
    const section = statementRow.querySelector('.statement-section');
    const fromInput = section.querySelector('.statement-date-from');
    const toInput = section.querySelector('.statement-date-to');
    const exportBtn = section.querySelector('.statement-export-btn');
    const loadingDiv = section.querySelector('.statement-loading');
    const table = section.querySelector('.statement-table');
    const tbody = table.querySelector('tbody');
    // Set default date range: last 30 days
    const today = new Date();
    const prior = new Date();
    prior.setDate(today.getDate() - 30);
    fromInput.value = prior.toISOString().slice(0,10);
    toInput.value = today.toISOString().slice(0,10);
    async function fetchAndRender() {
        loadingDiv.style.display = 'block';
        table.style.display = 'none';
        tbody.innerHTML = '';
        // Fetch transactions from Supabase
        const { data, error } = await window.supabase
            .from('bank_account_transactions')
            .select('*')
            .eq('bank_account_id', accountId)
            .gte('created_at', fromInput.value + 'T00:00:00Z')
            .lte('created_at', toInput.value + 'T23:59:59Z')
            .order('created_at', { ascending: false });
        if (error) {
            loadingDiv.textContent = 'Error loading statement.';
            return;
        }
        if (!data || data.length === 0) {
            loadingDiv.textContent = 'No transactions found for this period.';
            return;
        }
        loadingDiv.style.display = 'none';
        table.style.display = 'table';
        data.forEach(tx => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(tx.created_at).toLocaleDateString()}</td>
                <td>${tx.transaction_type}</td>
                <td>${parseFloat(tx.amount).toFixed(2)}</td>
                <td>${tx.notes || ''}</td>
                <td>${tx.invoice_id ? 'Invoice: ' + tx.invoice_id : (tx.receipt_id ? 'Receipt: ' + tx.receipt_id : '')}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    fromInput.addEventListener('change', fetchAndRender);
    toInput.addEventListener('change', fetchAndRender);
    exportBtn.addEventListener('click', function() {
        exportStatementTableToCSV(table, accountId, fromInput.value, toInput.value);
    });
    await fetchAndRender();
}

// Export statement table to CSV
function exportStatementTableToCSV(table, accountId, from, to) {
    let csv = 'Date,Type,Amount,Notes,Invoice/Receipt\n';
    Array.from(table.querySelectorAll('tbody tr')).forEach(tr => {
        const cells = Array.from(tr.children).map(td => '"' + td.textContent.replace(/"/g, '""') + '"');
        csv += cells.join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `statement_${accountId}_${from}_to_${to}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
