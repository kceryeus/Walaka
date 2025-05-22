// tableFilters.js
// Invoice table filtering and sorting utilities for the invoice module

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
    if (!table) {
        console.error('Invoice table not found');
        return;
    }

    // Populate client filter with data from Supabase
    async function populateClientFilter() {
        try {
            if (!window.supabase) {
                console.error('Supabase client not initialized');
                return;
            }

            const { data: clients, error } = await window.supabase
                .from('clients')
                .select('customer_id, customer_name')
                .order('customer_name', { ascending: true });

            if (error) {
                console.error('Error fetching clients:', error);
                showNotification('Error loading clients: ' + error.message);
                return;
            }

            if (!clientFilter) {
                console.error('Client filter element not found');
                return;
            }

            // Clear existing options except "All Clients"
            clientFilter.innerHTML = '<option value="all">All Clients</option>';

            if (!clients || clients.length === 0) {
                console.log('No clients found');
                return;
            }

            // Add client options
            clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.customer_id;
                option.textContent = client.customer_name;
                clientFilter.appendChild(option);
            });

            console.log('Client filter populated with', clients.length, 'clients');
        } catch (err) {
            console.error('Error populating client filter:', err);
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
                        console.log('Clients table changed, updating filter...');
                        await populateClientFilter();
                    }
                )
                .subscribe();

            // Store subscription for cleanup
            window.clientSubscription = clientSubscription;
        }
    }

    // Function to get current filter values
    function getFilterValues() {
        return {
            status: statusFilter ? statusFilter.value : 'all',
            dateRange: dateFilter ? dateFilter.value : 'all',
            clientId: clientFilter ? clientFilter.value : 'all',
            search: searchInput ? searchInput.value.trim() : ''
        };
    }

    // Function to apply filters
    async function applyFilters() {
        try {
            const filters = getFilterValues();
            console.log('Applying filters:', filters);
            
            // Always reset to page 1 when filters change
            if (typeof window.fetchAndDisplayInvoices === 'function') {
                await window.fetchAndDisplayInvoices(1, 10, filters);
            } else {
                console.error('fetchAndDisplayInvoices function not found');
            }
        } catch (error) {
            console.error('Error applying filters:', error);
            showNotification('Error applying filters: ' + error.message);
        }
    }

    // Add event listeners for filters
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            console.log('Status filter changed:', statusFilter.value);
            applyFilters();
        });
    }

    if (dateFilter) {
        dateFilter.addEventListener('change', () => {
            console.log('Date filter changed:', dateFilter.value);
            applyFilters();
        });
    }

    if (clientFilter) {
        clientFilter.addEventListener('change', () => {
            console.log('Client filter changed:', clientFilter.value);
            applyFilters();
        });
    }

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            console.log('Search input changed:', searchInput.value);
            applyFilters();
        }, 300));
    }

    // Function to reset filters
    function resetFilters() {
        if (statusFilter) statusFilter.value = 'all';
        if (dateFilter) dateFilter.value = 'month';
        if (clientFilter) clientFilter.value = 'all';
        if (searchInput) searchInput.value = '';
        applyFilters();
    }

    // Add event listeners for reset buttons
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', resetFilters);
    }
    
    if (resetFiltersLink) {
        resetFiltersLink.addEventListener('click', function(e) {
            e.preventDefault();
            resetFilters();
        });
    }

    // Initialize filters
    initializeClientFilter();
    
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
                dateRange: document.getElementById('dateFilter')?.value || 'all',
                clientId: document.getElementById('clientFilter')?.value || 'all',
                search: document.getElementById('searchInvoices')?.value.trim() || ''
            };

            // Fetch and display invoices with new sort
            await fetchAndDisplayInvoices(1, 10, filters, currentSort);
        });
    });
}

function setupActionButtons() {
    const table = document.getElementById('invoicesTable');
    if (!table) return;
    
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        // View button
        const viewBtn = row.querySelector('.view-btn');
        if (viewBtn) {
            viewBtn.onclick = function() {
                const invoiceNumber = this.getAttribute('data-invoice');
                if (window.viewInvoice) window.viewInvoice(invoiceNumber);
            };
        }

        // Send button
        const sendBtn = row.querySelector('.send-btn');
        if (sendBtn) {
            sendBtn.onclick = function() {
                const invoiceNumber = row.querySelector('.view-btn').getAttribute('data-invoice');
                if (window.sendInvoice) window.sendInvoice(invoiceNumber);
            };
        }

        // More button
        const moreBtn = row.querySelector('.more-btn');
        if (moreBtn) {
            moreBtn.onclick = function() {
                const invoiceNumber = row.querySelector('.view-btn').getAttribute('data-invoice');
                if (window.showMoreOptions) window.showMoreOptions(invoiceNumber);
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
