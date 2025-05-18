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

async function fetchAndDisplayInvoices(page = 1, limit = 10, filters = {}) {
    try {
        // Ensure Supabase client is available
        if (!window.supabase) {
            throw new Error('Supabase client is not initialized');
        }

        // Initialize query builder
        let queryBuilder = window.supabase
            .from('invoices')
            .select('*', { count: 'exact' });

        // Apply filters
        if (filters.status && filters.status !== 'all') {
            queryBuilder = queryBuilder.eq('status', filters.status);
        }

        if (filters.clientId && filters.clientId !== 'all') {
            queryBuilder = queryBuilder.eq('client_id', filters.clientId);
        }

        if (filters.dateRange) {
            const now = new Date();
            const startDate = new Date();

            switch (filters.dateRange) {
                case 'today':
                    startDate.setHours(0, 0, 0, 0);
                    queryBuilder = queryBuilder.gte('created_at', startDate.toISOString())
                        .lte('created_at', now.toISOString());
                    break;
                case 'week':
                    startDate.setDate(startDate.getDate() - 7);
                    queryBuilder = queryBuilder.gte('created_at', startDate.toISOString());
                    break;
                case 'month':
                    startDate.setMonth(startDate.getMonth() - 1);
                    queryBuilder = queryBuilder.gte('created_at', startDate.toISOString());
                    break;
                case 'quarter':
                    startDate.setMonth(startDate.getMonth() - 3);
                    queryBuilder = queryBuilder.gte('created_at', startDate.toISOString());
                    break;
            }
        }

        if (filters.search) {
            queryBuilder = queryBuilder.or(
                `invoiceNumber.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`
            );
        }

        // Add pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        queryBuilder = queryBuilder
            .range(from, to)
            .order('created_at', { ascending: false });

        // Execute query
        const { data: invoices, error, count } = await queryBuilder;

        if (error) throw error;

        // Update table
        const tbody = document.querySelector('#invoicesTable tbody');
        if (!tbody) return;

        // Clear existing rows
        tbody.innerHTML = '';

        if (!invoices || invoices.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No invoices found</td></tr>';
            return;
        }

        // Add invoice rows
        invoices.forEach(invoice => {
            const row = `
                <tr>
                    <td>${invoice.invoiceNumber || ''}</td>
                    <td>${invoice.customer_name || ''}</td>
                    <td>${formatDate(invoice.issue_date)}</td>
                    <td>${formatDate(invoice.due_date)}</td>
                    <td>${formatCurrency(invoice.total_amount)}</td>
                    <td><span class="status ${invoice.status?.toLowerCase()}">${invoice.status || 'Pending'}</span></td>
                    <td class="actions">
                        <button class="action-btn view-btn" data-invoice="${invoice.invoiceNumber}" title="View">
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

        // Update pagination if count is available
        if (count !== null) {
            updatePaginationDisplay(page, Math.ceil(count / limit), count);
        }

        // Setup action buttons for new rows
        setupActionButtons();

    } catch (error) {
        console.error('Error fetching invoices:', error);
        const tbody = document.querySelector('#invoicesTable tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">Error loading invoices</td></tr>';
        }
        throw error;
    }
}

function showError(message) {
    const tbody = document.querySelector('#invoicesTable tbody');
    if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-error">${message}</td></tr>`;
    }
}


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
                    <td>${invoice.invoiceNumber || ''}</td>
                    <td>${invoice.customer_name || ''}</td>
                    <td>${formatDate(invoice.issue_date)}</td>
                    <td>${formatDate(invoice.due_date)}</td>
                    <td>${formatCurrency(invoice.total_amount)}</td>
                    <td><span class="status ${invoice.status?.toLowerCase() || 'pending'}">${invoice.status || 'Pending'}</span></td>
                    <td class="actions">
                        <button class="action-btn view-btn" data-invoice="${invoice.invoiceNumber}" title="View">
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