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
    if (!table) return;

    // Populate client filter with data from Supabase
    async function populateClientFilter() {
        try {
            if (!window.supabase) throw new Error('Supabase client not initialized');
            const { data: clients, error } = await window.supabase
                .from('clients')
                .select('customer_id, customer_name')
                .order('customer_name', { ascending: true });
            if (error) throw error;
            if (clientFilter) {
                clientFilter.innerHTML = '<option value="all">All Clients</option>';
                clients.forEach(client => {
                    const option = document.createElement('option');
                    option.value = client.customer_id;
                    option.textContent = client.customer_name;
                    clientFilter.appendChild(option);
                });
            }
        } catch (err) {
            console.error('Error populating client filter:', err);
        }
    }

    // Initialize client filter
    populateClientFilter();

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
        const filters = getFilterValues();
        // Always reset to page 1 when filters change
        await fetchAndDisplayInvoices(1, 10, filters);
    }

    // Add event listeners for filters
    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (dateFilter) dateFilter.addEventListener('change', applyFilters);
    if (clientFilter) clientFilter.addEventListener('change', applyFilters);
    if (searchInput) {
        searchInput.addEventListener('input', debounce(applyFilters, 300));
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
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', resetFilters);
    if (resetFiltersLink) {
        resetFiltersLink.addEventListener('click', function(e) {
            e.preventDefault();
            resetFilters();
        });
    }

    // Setup table sorting
    setupTableSorting(table);
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
