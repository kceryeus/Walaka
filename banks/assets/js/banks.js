import { supabase } from '../../../js/supabaseClient.js';

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
        // Let auth handler manage authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user) {
            // Redirect will be handled by supabaseClient.js auth state listener
            return;
        }
        
        userId = user.id;
        
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
    toastCloseBtn.addEventListener('click', () => {
        toast.classList.remove('show');
    });
    
    // Handle sign out
    document.getElementById('sign-out-btn').addEventListener('click', handleSignOut);
}

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
    } else {
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
    const accountType = accountTypeSelect.value;
    
    if (accountType === 'bank') {
        bankFields.style.display = 'block';
        walletFields.style.display = 'none';
        document.querySelector('.bank-additional-fields').style.display = 'block';
        document.querySelector('.wallet-instructions').style.display = 'none';
        accountNumberLabel.textContent = 'Account Number';
        accountNumberHint.textContent = 'Enter your bank account number';
    } else {
        bankFields.style.display = 'none';
        walletFields.style.display = 'block';
        document.querySelector('.bank-additional-fields').style.display = 'none';
        document.querySelector('.wallet-instructions').style.display = 'block';
        accountNumberLabel.textContent = 'Mobile Number';
        accountNumberHint.textContent = 'Enter mobile number (e.g., 84xxxxxxx)';
    }
}

/**
 * Handle account form submission
 */
async function handleAccountFormSubmit(e) {
    e.preventDefault();
    
    try {
        // Get form values
        const accountType = accountTypeSelect.value;
        const accountHolder = accountHolderInput.value.trim();
        const accountNumber = accountNumberInput.value.trim();
        const currency = currencySelect.value;
        const isPrimary = isPrimaryCheckbox.checked;
        
        // Account type specific values
        let bankName = '';
        let operatorName = '';
        let branch = '';
        let swiftCode = '';
        let bankAddress = '';
        let instructions = '';
        
        if (accountType === 'bank') {
            bankName = bankNameSelect.value === 'other' 
                ? bankNameOther.value.trim() 
                : bankNameSelect.value;
            branch = branchInput.value.trim();
            swiftCode = swiftCodeInput.value.trim();
            bankAddress = bankAddressInput.value.trim();
        } else {
            operatorName = operatorNameSelect.value === 'other' 
                ? operatorNameOther.value.trim() 
                : operatorNameSelect.value;
            instructions = walletInstructions.value.trim();
        }
        
        // Basic validation
        if (!accountHolder) {
            throw new Error('Account holder name is required');
        }
        
        if (!accountNumber) {
            throw new Error(`${accountType === 'bank' ? 'Account number' : 'Mobile number'} is required`);
        }
        
        if (accountType === 'bank' && !bankName) {
            throw new Error('Bank name is required');
        }
        
        if (accountType === 'wallet' && !operatorName) {
            throw new Error('Mobile operator is required');
        }
        
        // Validate mobile number format (Mozambique)
        if (accountType === 'wallet') {
            // Basic validation for Mozambique mobile numbers
            const mobileRegex = /^(84|85|86|87)\d{7}$/;
            if (!mobileRegex.test(accountNumber)) {
                throw new Error('Invalid mobile number format. Use format: 84xxxxxxx');
            }
        }
        
        // If setting as primary, update all other accounts
        if (isPrimary) {
            await unsetAllPrimary();
        }
        
        // Build the account object
        const accountData = {
            user_id: userId,
            account_type: accountType,
            account_holder: accountHolder,
            account_number: accountNumber,
            currency: currency,
            is_primary: isPrimary,
            bank_name: accountType === 'bank' ? bankName : null,
            operator_name: accountType === 'wallet' ? operatorName : null,
            branch: accountType === 'bank' ? branch : null,
            swift_code: accountType === 'bank' ? swiftCode : null,
            bank_address: accountType === 'bank' ? bankAddress : null,
            instructions: accountType === 'wallet' ? instructions : null
        };
        
        // Save or update the account
        if (currentAccountId) {
            await updateAccount(currentAccountId, accountData);
        } else {
            await createAccount(accountData);
        }
        
        // Close modal and refresh
        closeAccountModal();
        await loadAccounts();
        
        // Show success message
        showToast(
            currentAccountId 
                ? 'Account updated successfully' 
                : 'Account created successfully', 
            'success'
        );
    } catch (error) {
        console.error('Form submission error:', error);
        showToast(error.message, 'error');
    }
}

/**
 * Create a new account
 */
async function createAccount(accountData) {
    try {
        const { data, error } = await supabase
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
        const { data, error } = await supabase
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
        const { error } = await supabase
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
        const { error } = await supabase
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
        const { error } = await supabase
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
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('Error fetching user:', error.message);
            return;
        }
        
        if (user) {
            const { data: profileData, error: profileError } = await supabase
                .from('users')
                .select('username, logo')
                .eq('id', user.id);
            
            if (profileError) {
                console.error('Error fetching profile:', profileError.message);
                return;
            }
            
            const userNameSpan = document.getElementById('user-name');
            if (userNameSpan) {
                userNameSpan.textContent = profileData[0]?.username || 'User';
            }
            
            const userAvatar = document.querySelector('.avatar');
            if (userAvatar && profileData[0]?.logo) {
                userAvatar.innerHTML = `<img src="${profileData[0].logo}" alt="User Logo" style="width: 100%; height: 100%; border-radius: 50%;">`;
            }
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
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
 * Handle sign out - redirect will be handled by auth state listener
 */
async function handleSignOut() {
    try {
        await supabase.auth.signOut();
    } catch (error) {
        console.error('Error signing out:', error);
        showToast('Error signing out: ' + error.message, 'error');
    }
}
