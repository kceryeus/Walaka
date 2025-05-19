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
    const rows = table ? Array.from(table.querySelectorAll('tbody tr')) : [];
    if (!table || rows.length === 0) return;

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
    populateClientFilter();

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
            const statusMatch = status === 'all' || rowStatus === status;
            let dateMatch = true;
            if (date !== 'all') {
                const today = new Date();
                const oneWeek = new Date(today); oneWeek.setDate(today.getDate() - 7);
                const oneMonth = new Date(today); oneMonth.setMonth(today.getMonth() - 1);
                const oneQuarter = new Date(today); oneQuarter.setMonth(today.getMonth() - 3);
                const oneYear = new Date(today); oneYear.setFullYear(today.getFullYear() - 1);
                switch (date) {
                    case 'today': dateMatch = rowDate.toDateString() === today.toDateString(); break;
                    case 'week': dateMatch = rowDate >= oneWeek; break;
                    case 'month': dateMatch = rowDate >= oneMonth; break;
                    case 'quarter': dateMatch = rowDate >= oneQuarter; break;
                    case 'year': dateMatch = rowDate >= oneYear; break;
                }
            }
            const clientMatch = client === 'all' || rowClientId === client;
            const searchMatch = !searchText || rowInvoice.includes(searchText) || rowClientId.includes(searchText);
            const shouldShow = statusMatch && dateMatch && clientMatch && searchMatch;
            row.style.display = shouldShow ? '' : 'none';
            if (shouldShow) visibleCount++;
        });
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
        const pageInfo = document.querySelector('.page-info');
        if (pageInfo) {
            pageInfo.textContent = `Showing ${visibleCount} of ${rows.length} invoices`;
        }
    }

    if (statusFilter) statusFilter.addEventListener('change', applyFilters);
    if (dateFilter) dateFilter.addEventListener('change', applyFilters);
    if (clientFilter) clientFilter.addEventListener('change', applyFilters);
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(applyFilters, 300);
        });
    }
    function resetFilters() {
        if (statusFilter) statusFilter.value = 'all';
        if (dateFilter) dateFilter.value = 'month';
        if (clientFilter) clientFilter.value = 'all';
        if (searchInput) searchInput.value = '';
        applyFilters();
    }
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', resetFilters);
    if (resetFiltersLink) {
        resetFiltersLink.addEventListener('click', function(e) {
            e.preventDefault();
            resetFilters();
        });
    }
    setupTableSorting(table, rows);
}

function setupTableSorting(table, rows) {
    const sortIcons = table ? table.querySelectorAll('.sort-icon') : [];
    sortIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const sortKey = this.getAttribute('data-sort');
            const ascending = !this.classList.contains('ascending');
            sortIcons.forEach(i => i.classList.remove('ascending', 'descending'));
            this.classList.add(ascending ? 'ascending' : 'descending');
            rows.sort((a, b) => {
                let aVal, bVal;
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
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
                return 0;
            });
            const tbody = table.querySelector('tbody');
            rows.forEach(row => tbody.appendChild(row));
        });
    });
}

function setupActionButtons() {
    const table = document.getElementById('invoicesTable');
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        // View button
        const viewBtn = row.querySelector('.view-invoice-btn');
        if (viewBtn) {
            viewBtn.onclick = function() {
                const invoiceId = row.getAttribute('data-invoice-id');
                if (window.viewInvoice) window.viewInvoice(invoiceId);
            };
        }
        // Send button
        const sendBtn = row.querySelector('.send-invoice-btn');
        if (sendBtn) {
            sendBtn.onclick = function() {
                const invoiceId = row.getAttribute('data-invoice-id');
                if (window.sendInvoice) window.sendInvoice(invoiceId);
            };
        }
        // Status change dropdown
        const statusDropdown = row.querySelector('.status-dropdown');
        if (statusDropdown) {
            statusDropdown.onchange = function() {
                const invoiceId = row.getAttribute('data-invoice-id');
                const newStatus = statusDropdown.value;
                if (window.changeInvoiceStatus) window.changeInvoiceStatus(invoiceId, newStatus);
            };
        }
        // Add more button handlers as needed (delete, duplicate, etc.)
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
