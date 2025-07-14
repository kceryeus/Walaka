/**
 * Banks & Mobile Wallets Management
 * Handles the management of bank accounts and mobile wallets
 * for receiving payments from clients.
 */

//import { supabase } from '../../../js/supabaseClient.js';

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
const walletInstructionText = document.getElementById('wallet-instruction-text');
const additionalBankFields = document.getElementById('additional-bank-fields');
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

// Sample data (for demo purposes)
const sampleAccounts = [
    {
        id: 1,
        account_type: 'bank',
        bank_name: 'Millennium BIM',
        operator_name: null,
        account_holder: 'WALAKA Business',
        account_number: '123456789',
        currency: 'MZN',
        branch: 'Maputo Sede',
        swift_code: 'BIMOMZMX',
        bank_address: 'Av. 25 de Setembro, Maputo',
        is_primary: true
    },
    {
        id: 2,
        account_type: 'wallet',
        bank_name: null,
        operator_name: 'M-PESA',
        account_holder: 'WALAKA Business',
        account_number: '841234567',
        currency: 'MZN',
        branch: null,
        swift_code: null,
        bank_address: null,
        is_primary: false
    },
    {
        id: 3,
        account_type: 'bank',
        bank_name: 'Standard Bank',
        operator_name: null,
        account_holder: 'WALAKA International',
        account_number: '987654321',
        currency: 'USD',
        branch: 'Maputo Main',
        swift_code: 'SBICMZMX',
        bank_address: 'Av. 10 de Novembro, Maputo',
        is_primary: false
    }
];

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
 /*       // Check authentication status
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            window.location.href = '/login.html';
            return;
        }
        
        userId = session.user.id;
*/        
        // Initialize the application
        await displayUserName();
        await loadAccounts();
        initEventListeners();
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error initializing application', 'error');
    }
});

/**
 * Load accounts from database
 */
async function loadAccounts() {
    try {
        const { data, error } = await supabase
            .from('bank_accounts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        
        if (error) {
            throw new Error(error.message);
        }
        
        accounts = data || [];
        filteredAccounts = [...accounts];
        
        updateAccountsUI();
        updateMetrics();
    } catch (error) {
        console.error('Error loading accounts:', error);
        showToast('Failed to load accounts', 'error');
    }
}

/**
 * Initialize all event listeners
 */
function initEventListeners() {
    // Add account buttons
    addAccountBtn.addEventListener('click', () => openAddAccountModal());
    emptyAddBtn.addEventListener('click', () => openAddAccountModal());
    
    // Form type change
    accountTypeSelect.addEventListener('change', toggleAccountTypeFields);
    
    // Other field for custom bank/operator names
    bankNameSelect.addEventListener('change', () => {
        bankNameOther.style.display = bankNameSelect.value === 'other' ? 'block' : 'none';
    });
    
    operatorNameSelect.addEventListener('change', () => {
        operatorNameOther.style.display = operatorNameSelect.value === 'other' ? 'block' : 'none';
        updateWalletInstructions(operatorNameSelect.value);
    });
    
    // Cancel account form
    cancelAccountBtn.addEventListener('click', closeAccountModal);
    
    // Submit account form
    accountForm.addEventListener('submit', handleAccountFormSubmit);
    
    // Close buttons for modals
    closeModalBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Delete modal buttons
    cancelDeleteBtn.addEventListener('click', () => deleteModal.style.display = 'none');
    confirmDeleteBtn.addEventListener('click', deleteAccount);
    
    // Filter change
    filterType.addEventListener('change', applyFilters);
    filterCurrency.addEventListener('change', applyFilters);
    
    // View options toggle
    viewOptionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const viewType = btn.dataset.view;
            setActiveView(viewType);
        });
    });
    
    // Close toast
    if (toastCloseBtn) {
        toastCloseBtn.addEventListener('click', () => {
            toast.classList.remove('show');
        });
    }
    
    // Sign out button
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', () => {
            // In a real app, this would handle sign out logic
            showToast('Signed out successfully', 'success');
            // Redirect to login page
            window.location.href = '/login.html';
        });
    }
    
    // Mobile number formatting for wallet accounts
    accountNumberInput.addEventListener('input', function() {
        if (accountTypeSelect.value === 'wallet') {
            // Format as phone number
            let number = this.value.replace(/\D/g, '');
            if (number.length > 9) {
                number = number.substring(0, 9);
            }
            this.value = number;
            
            // Validate Mozambican mobile number
            if (number.length === 9) {
                const prefix = number.substring(0, 2);
                if (['82', '83', '84', '85', '86', '87'].includes(prefix)) {
                    this.setCustomValidity('');
                    accountNumberHint.textContent = 'Valid Mozambican mobile number';
                    accountNumberHint.style.color = 'var(--success-color)';
                } else {
                    this.setCustomValidity('Invalid mobile prefix');
                    accountNumberHint.textContent = 'Invalid mobile prefix. Should be 82, 83, 84, 85, 86, or 87';
                    accountNumberHint.style.color = 'var(--danger-color)';
                }
            } else {
                this.setCustomValidity('Mobile number should be 9 digits');
                accountNumberHint.textContent = 'Should be 9 digits, e.g., 841234567';
                accountNumberHint.style.color = 'var(--text-secondary)';
            }
        } else {
            this.setCustomValidity('');
            accountNumberHint.textContent = '';
        }
    });
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
    
    // Show active view
    const activeViewBtn = document.querySelector('.view-option-btn.active');
    if (activeViewBtn) {
        setActiveView(activeViewBtn.dataset.view);
    } else {
        setActiveView('table');
    }
}

/**
 * Update the table view with the current accounts
 */
function updateTableView() {
    tableBody.innerHTML = '';
    
    filteredAccounts.forEach(account => {
        const row = document.createElement('tr');
        
        // Format account type badge
        const typeBadge = `
            <span class="type-badge ${account.account_type === 'bank' ? 'bank-badge' : 'wallet-badge'}">
                <i class="fas fa-${account.account_type === 'bank' ? 'university' : 'wallet'}"></i>
                ${account.account_type === 'bank' ? 'Bank' : 'Wallet'}
            </span>
        `;
        
        // Format account name
        const accountName = account.account_type === 'bank' 
            ? account.bank_name 
            : account.operator_name;
            
        // Create the row HTML
        row.innerHTML = `
            <td>${typeBadge}</td>
            <td>${accountName}</td>
            <td>${account.account_holder}</td>
            <td class="account-number">${account.account_number}</td>
            <td><span class="currency-badge">${account.currency}</span></td>
            <td>
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
        
        // Add event listeners to action buttons
        tableBody.appendChild(row);
        
        // Edit button
        row.querySelector('.edit-btn').addEventListener('click', () => {
            openEditAccountModal(account.id);
        });
        
        // Delete button
        row.querySelector('.delete-btn').addEventListener('click', () => {
            openDeleteModal(account.id);
        });
        
        // Star button (set as primary)
        row.querySelector('.star-btn').addEventListener('click', () => {
            setAsPrimary(account.id);
        });
    });
}

/**
 * Update the cards view with the current accounts
 */
function updateCardsView() {
    cardsContainer.innerHTML = '';
    
    filteredAccounts.forEach(account => {
        const card = document.createElement('div');
        card.className = 'account-card';
        
        // Determine icon and name based on account type
        const icon = account.account_type === 'bank' ? 'university' : 'wallet';
        const iconClass = account.account_type === 'bank' ? 'bank-icon-card' : 'wallet-icon-card';
        const name = account.account_type === 'bank' ? account.bank_name : account.operator_name;
        
        card.innerHTML = `
            <div class="account-card-header">
                <div class="account-card-type">
                    <div class="account-card-icon ${iconClass}">
                        <i class="fas fa-${icon}"></i>
                    </div>
                    <h3>${name}</h3>
                </div>
                ${account.is_primary ? '<span class="primary-badge"><i class="fas fa-star"></i> Primary</span>' : ''}
            </div>
            <div class="account-card-body">
                <div class="account-card-row">
                    <div class="account-card-label">Account Holder</div>
                    <div class="account-card-value">${account.account_holder}</div>
                </div>
                <div class="account-card-row">
                    <div class="account-card-label">${account.account_type === 'bank' ? 'Account Number' : 'Mobile Number'}</div>
                    <div class="account-card-value account-card-number">${account.account_number}</div>
                </div>
                <div class="account-card-row">
                    <div class="account-card-label">Currency</div>
                    <div class="account-card-value">${account.currency}</div>
                </div>
                ${account.branch ? `
                <div class="account-card-row">
                    <div class="account-card-label">Branch</div>
                    <div class="account-card-value">${account.branch}</div>
                </div>
                ` : ''}
            </div>
            <div class="account-card-footer">
                <button class="secondary-btn edit-card-btn" data-id="${account.id}">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="danger-btn delete-card-btn" data-id="${account.id}">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        `;
        
        cardsContainer.appendChild(card);
        
        // Add event listeners to buttons
        card.querySelector('.edit-card-btn').addEventListener('click', () => {
            openEditAccountModal(account.id);
        });
        
        card.querySelector('.delete-card-btn').addEventListener('click', () => {
            openDeleteModal(account.id);
        });
    });
}

/**
 * Update metrics based on all accounts
 */
function updateMetrics() {
    // Count bank accounts
    const bankCount = accounts.filter(account => account.account_type === 'bank').length;
    bankCountEl.textContent = bankCount;
    
    // Count mobile wallets
    const walletCount = accounts.filter(account => account.account_type === 'wallet').length;
    walletCountEl.textContent = walletCount;
    
    // Count unique currencies
    const currencies = [...new Set(accounts.map(account => account.currency))];
    currencyCountEl.textContent = currencies.length;
    
    // Get primary account
    const primaryAccount = accounts.find(account => account.is_primary);
    if (primaryAccount) {
        const name = primaryAccount.account_type === 'bank' 
            ? primaryAccount.bank_name 
            : primaryAccount.operator_name;
        primaryAccountEl.textContent = name;
    } else {
        primaryAccountEl.textContent = 'None';
    }
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
    accountNumberHint.textContent = '';
    
    // Default to bank account type and show relevant fields
    accountTypeSelect.value = 'bank';
    toggleAccountTypeFields();
    
    // Show modal
    accountModal.style.display = 'block';
}

/**
 * Open modal to edit an existing account
 */
function openEditAccountModal(accountId) {
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
    isPrimaryCheckbox.checked = account.is_primary;
    
    // Set type-specific fields
    if (account.account_type === 'bank') {
        bankNameSelect.value = account.bank_name;
        bankNameOther.value = '';
        
        // Check if it's "other" bank
        if (bankNameSelect.value === '') {
            bankNameSelect.value = 'other';
            bankNameOther.value = account.bank_name;
            bankNameOther.style.display = 'block';
        } else {
            bankNameOther.style.display = 'none';
        }
        
        branchInput.value = account.branch || '';
        swiftCodeInput.value = account.swift_code || '';
        bankAddressInput.value = account.bank_address || '';
    } else {
        operatorNameSelect.value = account.operator_name;
        operatorNameOther.value = '';
        
        // Check if it's "other" operator
        if (operatorNameSelect.value === '') {
            operatorNameSelect.value = 'other';
            operatorNameOther.value = account.operator_name;
            operatorNameOther.style.display = 'block';
        } else {
            operatorNameOther.style.display = 'none';
        }
        
        updateWalletInstructions(operatorNameSelect.value);
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
    currentAccountId = account.id;
    
    // Update delete modal content
    deleteAccountType.textContent = account.account_type === 'bank' ? 'Bank Account' : 'Mobile Wallet';
    deleteAccountName.textContent = account.account_type === 'bank' ? account.bank_name : account.operator_name;
    deleteAccountNumber.textContent = account.account_number;
    
    // Show delete modal
    deleteModal.style.display = 'block';
}

/**
 * Close account modal
 */
function closeAccountModal() {
    accountModal.style.display = 'none';
    currentAccountId = null;
}

/**
 * Toggle form fields based on selected account type
 */
function toggleAccountTypeFields() {
    const accountType = accountTypeSelect.value;
    
    if (accountType === 'bank') {
        // Show bank fields, hide wallet fields
        bankFields.style.display = 'block';
        walletFields.style.display = 'none';
        additionalBankFields.style.display = 'block';
        walletInstructions.style.display = 'none';
        
        // Update account number label
        accountNumberLabel.textContent = 'Account Number ';
        accountNumberLabel.appendChild(document.createElement('span')).className = 'required';
        accountNumberLabel.querySelector('.required').textContent = '*';
        
        // Clear wallet-specific validation
        accountNumberInput.placeholder = 'Enter account number';
        accountNumberInput.setCustomValidity('');
        accountNumberHint.textContent = '';
    } else {
        // Show wallet fields, hide bank fields
        bankFields.style.display = 'none';
        walletFields.style.display = 'block';
        additionalBankFields.style.display = 'none';
        walletInstructions.style.display = 'block';
        
        // Update account number label
        accountNumberLabel.textContent = 'Mobile Number ';
        accountNumberLabel.appendChild(document.createElement('span')).className = 'required';
        accountNumberLabel.querySelector('.required').textContent = '*';
        
        // Update placeholder for mobile number
        accountNumberInput.placeholder = 'e.g., 841234567';
        accountNumberHint.textContent = 'Should be 9 digits, e.g., 841234567';
        accountNumberHint.style.color = 'var(--text-secondary)';
        
        // Get selected operator
        const operatorValue = operatorNameSelect.value;
        updateWalletInstructions(operatorValue);
    }
}

/**
 * Update wallet instructions based on selected operator
 */
function updateWalletInstructions(operatorValue) {
    let instructions = '';
    
    switch (operatorValue) {
        case 'M-PESA':
            instructions = 'Clients can pay via the M-PESA "Pagar Conta" option. They will need to enter your mobile number.';
            break;
        case 'EMOLA':
            instructions = 'Clients can send to your EMOLA account via the app. They will need to enter your mobile number.';
            break;
        case 'mKesh':
            instructions = 'Clients can pay through the mKesh app using your mobile number as the recipient.';
            break;
        case 'e-Mola':
            instructions = 'Clients can transfer money to your e-Mola account using your mobile number.';
            break;
        default:
            instructions = 'Instructions will appear based on selected mobile wallet operator.';
    }
    
    if (walletInstructionText) {
        walletInstructionText.textContent = instructions;
    }
}

/**
 * Handle account form submission
 */
function handleAccountFormSubmit(e) {
    e.preventDefault();
    
    // Validate form
    if (!accountForm.checkValidity()) {
        return;
    }
    
    // Get account type
    const accountType = accountTypeSelect.value;
    
    // Prepare account data
    const accountData = {
        account_type: accountType,
        account_holder: accountHolderInput.value,
        account_number: accountNumberInput.value,
        currency: currencySelect.value,
        is_primary: isPrimaryCheckbox.checked
    };
    
    // Add type-specific fields
    if (accountType === 'bank') {
        accountData.bank_name = bankNameSelect.value === 'other' ? bankNameOther.value : bankNameSelect.value;
        accountData.operator_name = null;
        accountData.branch = branchInput.value;
        accountData.swift_code = swiftCodeInput.value;
        accountData.bank_address = bankAddressInput.value;
    } else {
        accountData.bank_name = null;
        accountData.operator_name = operatorNameSelect.value === 'other' ? operatorNameOther.value : operatorNameSelect.value;
        accountData.branch = null;
        accountData.swift_code = null;
        accountData.bank_address = null;
    }
    
    // Check if this is an edit or create
    if (currentAccountId) {
        updateAccount(currentAccountId, accountData);
    } else {
        createAccount(accountData);
    }
    
    // Close modal
    closeAccountModal();
}

/**
 * Create a new account
 */
function createAccount(accountData) {
    // In a real app, this would send data to a server
    // For demo purposes, we'll just add it to our local data
    
    // Set primary if requested
    if (accountData.is_primary) {
        unsetAllPrimary();
    }
    
    // Create new account with ID
    const newId = Math.max(0, ...accounts.map(a => a.id)) + 1;
    const newAccount = {
        id: newId,
        ...accountData
    };
    
    // Add to accounts array
    accounts.push(newAccount);
    
    // Update UI
    filteredAccounts = [...accounts];
    applyFilters();
    updateMetrics();
    
    // Show success message
    showToast('Account created successfully', 'success');
}

/**
 * Update existing account
 */
function updateAccount(accountId, accountData) {
    // Find account index
    const index = accounts.findIndex(a => a.id === accountId);
    if (index === -1) return;
    
    // Set primary if requested
    if (accountData.is_primary) {
        unsetAllPrimary();
    }
    
    // Update account
    accounts[index] = {
        ...accounts[index],
        ...accountData
    };
    
    // Update UI
    filteredAccounts = [...accounts];
    applyFilters();
    updateMetrics();
    
    // Show success message
    showToast('Account updated successfully', 'success');
}

/**
 * Delete an account
 */
function deleteAccount() {
    if (!currentAccountId) return;
    
    // Find account index
    const index = accounts.findIndex(a => a.id === currentAccountId);
    if (index === -1) return;
    
    // Remove account
    accounts.splice(index, 1);
    
    // Update UI
    filteredAccounts = [...accounts];
    applyFilters();
    updateMetrics();
    
    // Close delete modal
    deleteModal.style.display = 'none';
    currentAccountId = null;
    
    // Show success message
    showToast('Account deleted successfully', 'success');
}

/**
 * Set an account as primary
 */
function setAsPrimary(accountId) {
    // First unset all accounts
    unsetAllPrimary();
    
    // Then set the selected account as primary
    const index = accounts.findIndex(a => a.id === accountId);
    if (index === -1) return;
    
    accounts[index].is_primary = true;
    
    // Update UI
    filteredAccounts = [...accounts];
    applyFilters();
    updateMetrics();
    
    // Show success message
    showToast('Primary account updated', 'success');
}

/**
 * Unset all primary accounts
 */
function unsetAllPrimary() {
    accounts.forEach(account => {
        account.is_primary = false;
    });
}

/**
 * Show a toast notification
 */
function showToast(message, type = 'success') {
    if (!toast || !toastMessage || !toastIcon) return;
    
    // Set message
    toastMessage.textContent = message;
    
    // Set icon based on type
    toastIcon.className = 'fas';
    
    switch (type) {
        case 'success':
            toastIcon.classList.add('fa-check-circle');
            break;
        case 'warning':
            toastIcon.classList.add('fa-exclamation-circle');
            break;
        case 'error':
            toastIcon.classList.add('fa-times-circle');
            break;
        default:
            toastIcon.classList.add('fa-info-circle');
    }
    
    // Show toast
    toast.classList.add('show');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}