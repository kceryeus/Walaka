// tableFilters.js
// Invoice table filtering and sorting utilities for the invoice module

function setupTableFilters() {
    // Get filter elements
    const statusFilter = document.getElementById('statusFilter');
    const dateRangeFilter = document.getElementById('dateRangeFilter');
    const clientFilter = document.getElementById('clientFilter');
    const searchInput = document.getElementById('searchInvoices');
    const clearFiltersBtn = document.getElementById('clearFilters');
    const resetFiltersLink = document.getElementById('resetFiltersLink');

    // Get table elements
    const table = document.getElementById('invoicesTable');
    if (!table) {
        console.error('Invoice table not found');
        return;
    }

    // --- Ensure invoiceTable module is initialized ---
    if (window.invoiceTable && typeof window.invoiceTable.init === 'function') {
        window.invoiceTable.init();
    }

    // Add event listeners for filters
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            console.log('[DEBUG] Status filter changed:', statusFilter.value);
            updateAndApplyFilters();
        });
    }
    if (dateRangeFilter) {
        dateRangeFilter.addEventListener('change', function() {
            console.log('[DEBUG] Date range filter changed:', dateRangeFilter.value);
            if (dateRangeFilter.value === 'custom') {
                // Show the date range modal
                $('#dateRangeModal').modal('show');
            } else {
                updateAndApplyFilters();
            }
        });
    }
    if (clientFilter) {
        clientFilter.addEventListener('change', function() {
            console.log('[DEBUG] Client filter changed:', clientFilter.value);
            updateAndApplyFilters();
        });
    }
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            console.log('[DEBUG] Search input changed:', searchInput.value);
            updateAndApplyFilters();
        });
    }

    // --- Unified function to update invoiceTable filters and refresh table ---
    function updateAndApplyFilters() {
        if (!window.invoiceTable) {
            console.log('[DEBUG] window.invoiceTable not found');
            return;
        }
        // Always use the correct keys for the table module
        const filterState = {
            status: statusFilter ? statusFilter.value : 'all',
            dateRange: dateRangeFilter ? dateRangeFilter.value : 'all',
            client: clientFilter ? clientFilter.value : 'all',
            search: searchInput ? searchInput.value.trim() : ''
        };
        console.log('[DEBUG] updateAndApplyFilters called. Current filter state:', filterState);
        window.invoiceTable.currentFilters = filterState;
        if (typeof window.invoiceTable.fetchAndDisplayInvoices === 'function') {
            console.log('[DEBUG] Calling fetchAndDisplayInvoices with:', filterState);
            window.invoiceTable.fetchAndDisplayInvoices(1, 10, filterState);
        } else {
            console.log('[DEBUG] fetchAndDisplayInvoices function not found on window.invoiceTable');
        }
    }

    // Function to reset filters
    function resetFilters() {
        if (statusFilter) statusFilter.value = 'all';
        if (dateRangeFilter) dateRangeFilter.value = 'all';
        if (clientFilter) clientFilter.value = 'all';
        if (searchInput) searchInput.value = '';
        console.log('[DEBUG] Reset filters called');
        updateAndApplyFilters();
    }

    // Add event listeners for reset buttons
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function() {
            console.log('[DEBUG] Clear filters button clicked');
            resetFilters();
        });
    }
    if (resetFiltersLink) {
        resetFiltersLink.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('[DEBUG] Reset filters link clicked');
            resetFilters();
        });
    }

    // Populate client filter with data from Supabase
    async function populateClientFilter() {
        try {
            if (!window.supabase) {
                console.error('[DEBUG] Supabase client not initialized');
                return;
            }

            const { data: clients, error } = await window.supabase
                .from('clients')
                .select('customer_id, customer_name')
                .order('customer_name', { ascending: true });

            if (error) {
                console.error('[DEBUG] Error fetching clients:', error);
                showNotification('Error loading clients: ' + error.message);
                return;
            }

            if (!clientFilter) {
                console.error('[DEBUG] Client filter element not found');
                return;
            }

            // Clear existing options except "All Clients"
            clientFilter.innerHTML = '<option value="all">All Clients</option>';

            if (!clients || clients.length === 0) {
                console.log('[DEBUG] No clients found');
                return;
            }

            // Add client options
            clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.customer_id;
                option.textContent = client.customer_name;
                clientFilter.appendChild(option);
            });

            console.log('[DEBUG] Client filter populated with', clients.length, 'clients');
        } catch (err) {
            console.error('[DEBUG] Error populating client filter:', err);
            showNotification('Error loading clients: ' + err.message);
        }
    }

    // Initialize client filter and set up subscription for updates
    async function initializeClientFilter() {
        await populateClientFilter();

        // Subscribe to client changes
        if (window.supabase) {
            const clientSubscription = window.supabase
                .channel('clients_changes')
                .on('postgres_changes', 
                    { event: '*', schema: 'public', table: 'clients' },
                    async () => {
                        console.log('[DEBUG] Clients table changed, updating filter...');
                        await populateClientFilter();
                    }
                )
                .subscribe();

            // Store subscription for cleanup
            window.clientSubscription = clientSubscription;
        }
    }

    // Initialize filters and trigger initial fetch
    initializeClientFilter().then(() => {
        console.log('[DEBUG] Initial filter setup complete, triggering first fetch');
        updateAndApplyFilters();
    });
    // Setup table sorting
    setupTableSorting(table);
}

// Debounce function to limit how often a function can be called
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

function setupTableSorting(table) {
    const sortIcons = table.querySelectorAll('.sort-icon');
    let currentSort = {
        column: 'created_at',
        direction: 'desc'
    };

    sortIcons.forEach(icon => {
        icon.addEventListener('click', async function() {
            const sortKey = this.getAttribute('data-sort');
            const ascending = !this.classList.contains('ascending');
            
            // Update sort icons
            sortIcons.forEach(i => i.classList.remove('ascending', 'descending'));
            this.classList.add(ascending ? 'ascending' : 'descending');

            // Update current sort
            currentSort = {
                column: sortKey,
                direction: ascending ? 'asc' : 'desc'
            };

            // Get current filters
            const filters = {
                status: document.getElementById('statusFilter')?.value || 'all',
                dateRange: document.getElementById('dateRangeFilter')?.value || 'all',
                clientId: document.getElementById('clientFilter')?.value || 'all',
                search: document.getElementById('searchInvoices')?.value.trim() || ''
            };

            // Fetch and display invoices with new sort
            if (window.invoiceTable && typeof window.invoiceTable.fetchAndDisplayInvoices === 'function') {
                await window.invoiceTable.fetchAndDisplayInvoices(1, 10, filters);
            } else {
                console.error('invoiceTable or fetchAndDisplayInvoices function not found');
            }
        });
    });
}

function setupActionButtons() {
    const table = document.getElementById('invoicesTable');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        // View button (now opens PDF in new tab)
        const viewBtn = row.querySelector('.view-btn');
        if (viewBtn) {
            viewBtn.onclick = function() {
                const invoiceNumber = this.getAttribute('data-invoice');
                window.invoiceActions.viewPdf(invoiceNumber);
            };
        }

        // Download button (now downloads PDF directly)
        const downloadBtn = row.querySelector('.download-btn');
        if (downloadBtn) {
            downloadBtn.onclick = function() {
                const invoiceNumber = row.querySelector('.view-btn').getAttribute('data-invoice');
                window.invoiceActions.downloadPdf(invoiceNumber);
            };
        }

        // More button (dropdown)
        const moreBtn = row.querySelector('.more-btn');
        if (moreBtn) {
            moreBtn.onclick = function() {
                const invoiceNumber = row.querySelector('.view-btn').getAttribute('data-invoice');
                const dropdown = document.createElement('div');
                dropdown.className = 'dropdown-menu';
                dropdown.innerHTML = `
                    <button class="dropdown-item" data-action="view">
                        <i class="fas fa-eye"></i>
                        <span>View Invoice</span>
                    </button>
                    <button class="dropdown-item" data-action="download">
                        <i class="fas fa-download"></i>
                        <span>Download PDF</span>
                    </button>
                    <button class="dropdown-item" data-action="email">
                        <i class="fas fa-envelope"></i>
                        <span>Send Email</span>
                    </button>
                `;

                // Handle dropdown item clicks
                dropdown.addEventListener('click', async function(e) {
                    const action = e.target.closest('.dropdown-item')?.dataset.action;
                    if (!action) return;

                    switch (action) {
                        case 'view':
                            // Open PDF in new window without downloading
                            window.invoiceActions.viewPdf(invoiceNumber);
                            break;
                        case 'download':
                            // Direct download without opening
                            window.invoiceActions.downloadPdf(invoiceNumber);
                            break;
                        case 'email':
                            // Get current PDF and attach to email
                            try {
                                const emailModal = document.getElementById('emailInvoiceModal');
                                if (emailModal) {
                                    // Fetch invoice data first
                                    const { data: invoice } = await window.supabase
                                        .from('invoices')
                                        .select('*, clients(*)')
                                        .eq('invoiceNumber', invoiceNumber)
                                        .single();
                                    
                                    if (invoice && invoice.clients?.email) {
                                        document.getElementById('emailTo').value = invoice.clients.email;
                                        document.getElementById('emailSubject').value = `Invoice ${invoiceNumber}`;
                                        document.getElementById('emailMessage').value = `Dear ${invoice.clients.customer_name},\n\nPlease find attached invoice ${invoiceNumber}.\n\nBest regards`;
                                        
                                        // Store invoice number for later use
                                        emailModal.dataset.invoiceNumber = invoiceNumber;
                                        
                                        window.modalManager.openModal('emailInvoiceModal');
                                    }
                                }
                            } catch (err) {
                                console.error('Error preparing email:', err);
                                showNotification('Error preparing email', 'error');
                            }
                            break;
                    }
                    
                    // Close dropdown after action
                    dropdown.remove();
                });

                // Position and show dropdown
                document.body.appendChild(dropdown);
                const rect = moreBtn.getBoundingClientRect();
                dropdown.style.position = 'absolute';
                dropdown.style.top = `${rect.bottom + window.scrollY}px`;
                dropdown.style.left = `${rect.left}px`;

                // Close dropdown when clicking outside
                const closeDropdown = (e) => {
                    if (!dropdown.contains(e.target) && !moreBtn.contains(e.target)) {
                        dropdown.remove();
                        document.removeEventListener('click', closeDropdown);
                    }
                };
                setTimeout(() => document.addEventListener('click', closeDropdown), 0);
            };
        }
    });
}

function updateInvoiceRow(row, invoice) {
    // Get status configuration
    const statusConfig = window.InvoiceStatusManager.getStatusConfig(invoice.status);
    
    // Update status cell with icon and color
    const statusCell = row.querySelector('td:nth-child(6)');
    if (statusCell) {
        statusCell.innerHTML = `
            <span class="status ${statusConfig.color}">
                <i class="fas ${statusConfig.icon}"></i>
                ${statusConfig.label}
            </span>
        `;
    }
    
    // Update other cells as needed
    // ... rest of the existing row update code ...
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.setupTableFilters = setupTableFilters;
    window.setupTableSorting = setupTableSorting;
    window.setupActionButtons = setupActionButtons;
}
