// Invoice Management Module JavaScript

// --- Module State & Global Initializations ---
let invoiceModuleInitialized = false;
let invoiceDistributionChartInstance = null;
let revenueByStatusChartInstance = null;

// --- 2. DOM Ready / Main Entry Point ---
document.addEventListener('DOMContentLoaded', function() {
    if (!invoiceModuleInitialized) {
        initializeInvoiceModule();
        setupEventListeners();
        setupCharts();
        updateCharts();
        setupChartSubscription();
        setupInvoiceTable();
        // Initialize client autocomplete only if element exists
        const clientList = document.getElementById('client-list');
        if (clientList) {
            setupClientAutocomplete();
            setupClientFormHandlers(clientList);
        }
        updateMetricsDisplay();
        setupMetricsSubscription();
    } else {
        // Already initialized
    }
    const issueDate = document.getElementById('issueDate');
    const dueDate = document.getElementById('dueDate');
    const today = new Date().toISOString().split('T')[0];
    if (issueDate) {
        if (!issueDate.value || new Date(issueDate.value) < new Date(today)) {
            issueDate.value = today;
        }
        issueDate.addEventListener('change', function() {
            if (issueDate.value < today) issueDate.value = today;
            if (dueDate && dueDate.value < issueDate.value) {
                dueDate.value = issueDate.value;
            }
            dueDate.min = issueDate.value;
        });
    }
    if (dueDate) {
        dueDate.min = today;
        if (!dueDate.value || new Date(dueDate.value) < new Date(today)) {
            dueDate.value = today;
        }
        dueDate.addEventListener('change', function() {
            if (dueDate.value < today) dueDate.value = today;
            if (issueDate && dueDate.value < issueDate.value) {
                dueDate.value = issueDate.value;
            }
        });
    }
});

// --- 3. Initialization Functions ---
// Initializes the invoice management module and sets up core features
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

// Sets up calculations for invoice items (quantities, prices, etc.)
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

// Sets up default values for date fields (issue date, due date)
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

// Updates the due date based on issue date and payment terms
function updateDueDate() {
    const issueDate = document.getElementById('issueDate');
    const dueDate = document.getElementById('dueDate');
    const paymentTerms = document.getElementById('paymentTerms');
    if (issueDate && dueDate && paymentTerms) {
        // Parse payment terms as number of days (e.g., '30' for net 30)
        const days = parseInt(paymentTerms.value, 10) || 0;
        const issue = new Date(issueDate.value);
        if (!isNaN(issue.getTime())) {
            const due = new Date(issue);
            due.setDate(issue.getDate() + days);
            dueDate.value = due.toISOString().split('T')[0];
            dueDate.min = issueDate.value;
        }
    }
}

// --- 4. Modal & UI Control Functions ---
// Opens a modal dialog by ID (with overlay support)
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.querySelector('.modal-overlay');
    if (modal && overlay) {
        modal.style.display = 'block';
        overlay.style.display = 'block';
        document.body.classList.add('modal-open');
    }
}

// Closes all open modals (with overlay support)
function closeAllModals() {
    const viewInvoiceModal = document.getElementById('viewInvoiceModal');
    const invoiceModal = document.getElementById('invoiceModal');
    const overlay = document.querySelector('.modal-overlay');
    // If we're in preview mode, just close the preview
    if (viewInvoiceModal && viewInvoiceModal.style.display === 'block' && invoiceModal.style.display === 'none') {
        viewInvoiceModal.style.display = 'none';
        if (overlay) overlay.style.display = 'none';
        document.body.classList.remove('modal-open');
        return;
    }
    // Otherwise close everything
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    if (overlay) overlay.style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Shows a notification message to the user
function showNotification(message) {
    // Implementation depends on your notification UI
    alert(message); // Placeholder: replace with custom notification UI if available
}

// --- 5. Data Fetching & Supabase Integration ---
// Fetches invoice details from Supabase by invoice number
async function fetchInvoiceDetails(invoiceNumber) {
    try {
        const { data: invoice, error } = await window.supabase
            .from('invoices')
            .select('*, clients(*)')
            .eq('invoiceNumber', invoiceNumber)
            .single();
        if (error) throw error;
        return invoice;
    } catch (err) {
        showNotification('Error fetching invoice details: ' + err.message);
        return null;
    }
}

// Fetches and displays invoices with optional pagination and filters
async function fetchAndDisplayInvoices(page = 1, limit = 10, filters = {}) {
    try {
        let queryBuilder = window.supabase
            .from('invoices')
            .select('*', { count: 'exact' });
        // Apply filters (status, clientId, dateRange, search)
        if (filters.status && filters.status !== 'all') {
            queryBuilder = queryBuilder.eq('status', filters.status);
        }
        if (filters.clientId && filters.clientId !== 'all') {
            queryBuilder = queryBuilder.eq('client_id', filters.clientId);
        }
        // ...add more filter logic as needed...
        // Pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        queryBuilder = queryBuilder.range(from, to);
        const { data: invoices, error, count } = await queryBuilder;
        if (error) throw error;
        // ...call UI update/rendering here...
        return { invoices, count };
    } catch (err) {
        showNotification('Error fetching invoices: ' + err.message);
        return { invoices: [], count: 0 };
    }
}

// Saves an invoice to Supabase (and uploads PDF if needed)
async function saveInvoice(invoiceData, pdfBlob) {
    try {
        // Get user session
        const { data: { session }, error: sessionError } = await window.supabase.auth.getSession();
        if (sessionError || !session) throw new Error('Authentication required');
        // Upload PDF to Supabase Storage
        const pdfFileName = `${invoiceData.invoiceNumber.replace(/\s+/g, '_')}.pdf`;
        const { error: uploadError } = await window.supabase.storage
            .from('invoice_pdfs')
            .upload(pdfFileName, pdfBlob, {
                contentType: 'application/pdf',
                upsert: true,
                cacheControl: '3600',
                owner: session.user.id
            });
        if (uploadError) throw new Error('Failed to upload PDF');
        // Get public URL for the uploaded PDF
        const { data: { publicUrl } } = window.supabase.storage
            .from('invoice_pdfs')
            .getPublicUrl(pdfFileName);
        // Save invoice data to database
        const { data: invoice, error: insertError } = await window.supabase
            .from('invoices')
            .insert([{ ...invoiceData, pdf_url: publicUrl, user_id: session.user.id }])
            .select()
            .single();
        if (insertError) throw insertError;
        showNotification('Invoice saved successfully!');
        return invoice;
    } catch (error) {
        showNotification('Error saving invoice: ' + (error.message || 'Unknown error'));
        return null;
    }
}

// --- 6. Data Processing & Calculation Functions ---
// Calculates the total for a single invoice item row (with VAT logic)
function calculateRowTotal(row) {
    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const subtotal = quantity * price;
    const vat = subtotal * 0.16; // Default VAT rate 16%
    row.querySelector('.item-vat').textContent = vat.toFixed(2);
    row.querySelector('.item-total').textContent = (subtotal + vat).toFixed(2);
}

// Updates the invoice totals (subtotal, VAT, total) with correct logic
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

// Adds a new invoice item row to the table
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

// Processes invoice data for charting or analytics
function processInvoiceDataForCharts(invoices) {
    // Example: group by status or week, return summary data
    const summary = {};
    invoices.forEach(inv => {
        const status = inv.status || 'pending';
        summary[status] = (summary[status] || 0) + (parseFloat(inv.total_amount) || 0);
    });
    return summary;
}

// Product suggestion and row helpers
function handleProductSearch(searchTerm, row) {
    // Implementation would fetch/filter products and show suggestions
    // Placeholder: showProductSuggestions(row, filteredProducts);
}

function showProductSuggestions(row, products) {
    const input = row.querySelector('.item-description');
    const rect = input.getBoundingClientRect();
    let suggestionsBox = row.querySelector('.product-suggestions');
    if (!suggestionsBox) {
        suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'product-suggestions';
        row.appendChild(suggestionsBox);
    }
    suggestionsBox.innerHTML = products.map(product => `
        <div class="suggestion-item" data-product='${JSON.stringify(product)}'>
            <div>${product.description}</div>
            <div class="suggestion-price">${formatCurrency(product.price)}</div>
        </div>
    `).join('');
    suggestionsBox.style.top = (rect.height) + 'px';
    suggestionsBox.style.display = 'block';
    suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            const product = JSON.parse(this.dataset.product);
            fillProductDetails(row, product);
            suggestionsBox.style.display = 'none';
        });
    });
}

function fillProductDetails(row, product) {
    if (!row || !product) return;
    const descriptionInput = row.querySelector('.item-description');
    const priceInput = row.querySelector('.item-price');
    const quantityInput = row.querySelector('.item-quantity');
    if (descriptionInput) descriptionInput.value = product.description;
    if (priceInput) priceInput.value = product.price;
    if (quantityInput) quantityInput.value = 1;
    // Set VAT rate based on product tax_rate or default to 16%
    // (Assume VAT is always 16% for now)
    calculateRowTotal(row);
    updateInvoiceTotals();
}

function showNewProductForm(row) {
    let newProductForm = row.querySelector('.new-product-form');
    if (!newProductForm) {
        newProductForm = document.createElement('div');
        newProductForm.className = 'new-product-form';
        row.appendChild(newProductForm);
    }
    newProductForm.style.display = 'block';
}

function hideProductSuggestions(row) {
    const suggestionsBox = row.querySelector('.product-suggestions');
    if (suggestionsBox) suggestionsBox.style.display = 'none';
}

function hideNewProductForm(row) {
    const newProductForm = row.querySelector('.new-product-form');
    if (newProductForm) newProductForm.style.display = 'none';
}

// --- 7. UI Update & Rendering Functions ---
// Renders the list of invoices in the UI
function renderInvoiceList(invoices) {
    const tbody = document.querySelector('#invoicesTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    if (!invoices || invoices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No invoices found</td></tr>';
        return;
    }
    invoices.forEach(invoice => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${invoice.invoiceNumber || ''}</td>
            <td>${invoice.client?.customer_name || ''}</td>
            <td>${formatDate(invoice.issue_date)}</td>
            <td>${formatDate(invoice.due_date)}</td>
            <td>${formatCurrency(invoice.total_amount, invoice.currency)}</td>
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
        `;
        tbody.appendChild(row);
    });
}

// Updates the invoice metrics on the dashboard
function updateInvoiceMetrics(metrics) {
    // Example: update UI elements with metrics data
    document.getElementById('totalInvoices').textContent = metrics.totalInvoices || 0;
    document.getElementById('totalRevenue').textContent = formatCurrency(metrics.totalRevenue || 0, 'MZN');
    // ...add more metric updates as needed...
}

// Updates pagination controls in the UI
function updatePaginationDisplay(currentPage, totalPages, totalItems) {
    // Example: update pagination UI elements
    document.getElementById('paginationInfo').textContent = `Page ${currentPage} of ${totalPages} (${totalItems} items)`;
    // ...add more pagination logic as needed...
}

// --- 10. Metrics & Chart Data Loading Functions ---
// Fetches metrics (total invoices, revenue, etc.) from Supabase and updates dashboard
async function updateMetricsDisplay() {
    try {
        // Fetch all invoices from Supabase
        const { data: invoices, error: invoiceError } = await window.supabase
            .from('invoices')
            .select('*');
        if (invoiceError) throw invoiceError;

        // Calculate metrics
        const totalInvoices = invoices.length;
        const totalPaid = invoices.filter(inv => inv.status === 'paid').length;
        const totalPending = invoices.filter(inv => inv.status === 'pending').length;
        const totalOverdue = invoices.filter(inv => inv.status === 'overdue').length;
        const paidPercentage = totalInvoices > 0 ? ((totalPaid / totalInvoices) * 100).toFixed(1) : '0.0';
        const pendingPercentage = totalInvoices > 0 ? ((totalPending / totalInvoices) * 100).toFixed(1) : '0.0';
        const overduePercentage = totalInvoices > 0 ? ((totalOverdue / totalInvoices) * 100).toFixed(1) : '0.0';
        const totalRevenue = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const revenueThisMonth = invoices.filter(inv => {
            const d = new Date(inv.issue_date);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        }).reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
        const averageInvoiceAmount = totalInvoices > 0 ? (totalRevenue / totalInvoices) : 0;

        // Update metrics cards in the DOM
        const setMetric = (selector, value) => {
            const el = document.querySelector(selector);
            if (el) el.textContent = value;
        };
        setMetric('#totalInvoicesCard .metric-value', totalInvoices);
        setMetric('#paidInvoicesCard .metric-value', totalPaid);
        setMetric('#paidInvoicesCard .metric-footer .metric-label', `${paidPercentage}% of Total`);
        setMetric('#pendingInvoicesCard .metric-value', totalPending);
        setMetric('#pendingInvoicesCard .metric-footer .metric-label', `${pendingPercentage}% of Total`);
        setMetric('#overdueInvoicesCard .metric-value', totalOverdue);
        setMetric('#overdueInvoicesCard .metric-footer .metric-label', `${overduePercentage}% of Total`);
        setMetric('#totalRevenueCard .metric-value', formatCurrency(totalRevenue));
        setMetric('#revenueThisMonthCard .metric-value', formatCurrency(revenueThisMonth));
        setMetric('#averageInvoiceAmountCard .metric-value', formatCurrency(averageInvoiceAmount));
    } catch (error) {
        showNotification('Error loading metrics: ' + error.message);
        // Set default values in case of error
        const setMetric = (selector, value) => {
            const el = document.querySelector(selector);
            if (el) el.textContent = value;
        };
        setMetric('#totalInvoicesCard .metric-value', '0');
        setMetric('#paidInvoicesCard .metric-value', '0');
        setMetric('#pendingInvoicesCard .metric-value', '0');
        setMetric('#overdueInvoicesCard .metric-value', '0');
        setMetric('#totalRevenueCard .metric-value', formatCurrency(0));
        setMetric('#revenueThisMonthCard .metric-value', formatCurrency(0));
        setMetric('#averageInvoiceAmountCard .metric-value', formatCurrency(0));
    }
}

// Subscribes to metrics changes (if using Supabase real-time)
function setupMetricsSubscription() {
    if (!window.supabase) return;
    window.supabase
        .channel('public:invoices')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
            updateMetricsDisplay();
        })
        .subscribe();
}

// Fetches data for charts (e.g., revenue by status, invoice distribution)
async function updateCharts() {
    try {
        // Fetch all invoices from Supabase
        const { data: invoices, error } = await window.supabase
            .from('invoices')
            .select('*');
        if (error) throw error;
        if (Array.isArray(invoices)) {
            processInvoiceDataForCharts(invoices);
        }
    } catch (err) {
        showNotification('Error loading chart data: ' + err.message);
        resetCharts();
    }
}

// Initializes chart instances (using Chart.js or similar)
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
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
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
                plugins: { legend: { position: 'right' } },
                cutout: '70%'
            }
        });
    }
}

// Subscribes to chart data changes
function setupChartSubscription() {
    if (!window.supabase) return;
    window.supabase
        .channel('public:invoices')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
            updateCharts();
        })
        .subscribe();
}

// Updates the revenue by status chart
function updateRevenueByStatusChart(data) {
    if (!revenueByStatusChartInstance) return;
    // Data: { paid, pending, overdue, draft }
    const chart = revenueByStatusChartInstance;
    chart.data.datasets[0].data = [
        data.paid || 0,
        data.pending || 0,
        data.overdue || 0,
        data.draft || 0
    ];
    chart.update();
}

// Updates the invoice distribution chart
function updateInvoiceDistributionChart(data) {
    if (!invoiceDistributionChartInstance) return;
    // Data: { labels, values }
    const chart = invoiceDistributionChartInstance;
    chart.data.labels = data.labels;
    chart.data.datasets[0].data = data.values;
    chart.update();
}

// --- Chart Period Controls ---
function setupChartPeriodControls() {
    // Invoice Distribution Chart period buttons
    const weeklyBtn = document.getElementById('weeklyBtn');
    const monthlyBtn = document.getElementById('monthlyBtn');
    const quarterlyBtn = document.getElementById('quarterlyBtn');
    // Defensive: check if buttons exist
    if (weeklyBtn && monthlyBtn && quarterlyBtn) {
        weeklyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [monthlyBtn, quarterlyBtn]);
            updateInvoiceDistributionChartByPeriod('weekly');
        });
        monthlyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [weeklyBtn, quarterlyBtn]);
            updateInvoiceDistributionChartByPeriod('monthly');
        });
        quarterlyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [weeklyBtn, monthlyBtn]);
            updateInvoiceDistributionChartByPeriod('quarterly');
        });
    }
    // Revenue by Status Chart period buttons (if present)
    const revenueMonthlyBtn = document.getElementById('revenueMonthlyBtn');
    const revenueYearlyBtn = document.getElementById('revenueYearlyBtn');
    if (revenueMonthlyBtn && revenueYearlyBtn) {
        revenueMonthlyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [revenueYearlyBtn]);
            updateRevenueByStatusChartByPeriod('monthly');
        });
        revenueYearlyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [revenueMonthlyBtn]);
            updateRevenueByStatusChartByPeriod('yearly');
        });
    }
}

function updateChartPeriodButtons(activeButton, inactiveButtons) {
    if (!activeButton) return;
    activeButton.classList.add('active');
    if (Array.isArray(inactiveButtons)) {
        inactiveButtons.forEach(btn => btn && btn.classList.remove('active'));
    }
}

// Helper: update Invoice Distribution Chart by period
function updateInvoiceDistributionChartByPeriod(period) {
    // Fetch invoices and process for the selected period
    window.supabase
        .from('invoices')
        .select('*')
        .then(({ data: invoices, error }) => {
            if (error) {
                showNotification('Error loading invoices for chart: ' + error.message);
                return;
            }
            const chartData = calculateDistributionDataForPeriod(invoices, period);
            updateInvoiceDistributionChart(chartData);
        });
}

// Helper: update Revenue by Status Chart by period
function updateRevenueByStatusChartByPeriod(period) {
    window.supabase
        .from('invoices')
        .select('*')
        .then(({ data: invoices, error }) => {
            if (error) {
                showNotification('Error loading invoices for chart: ' + error.message);
                return;
            }
            const chartData = calculateRevenueByStatusForPeriod(invoices, period);
            updateRevenueByStatusChart(chartData);
        });
}

// Calculate distribution data for a given period
function calculateDistributionDataForPeriod(invoices, period) {
    // Returns { labels, values }
    const now = new Date();
    let startDate;
    let labels = [];
    let values = [];
    switch (period) {
        case 'weekly':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            values = Array(7).fill(0);
            invoices.forEach(inv => {
                const d = new Date(inv.issue_date);
                if (d >= startDate) {
                    let day = d.getDay();
                    // Convert Sunday (0) to last
                    day = day === 0 ? 6 : day - 1;
                    values[day]++;
                }
            });
            break;
        case 'monthly':
            // Last 4 weeks
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            values = Array(4).fill(0);
            const fourWeeksAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 27);
            invoices.forEach(inv => {
                const d = new Date(inv.issue_date);
                if (d >= fourWeeksAgo) {
                    const week = Math.floor((now - d) / (7 * 24 * 60 * 60 * 1000));
                    if (week >= 0 && week < 4) values[3 - week]++;
                }
            });
            break;
        case 'quarterly':
            // Last 12 months
            labels = [];
            values = [];
            for (let i = 0; i < 12; i++) {
                const month = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
                labels.push(month.toLocaleString('default', { month: 'short' }));
                values.push(0);
            }
            invoices.forEach(inv => {
                const d = new Date(inv.issue_date);
                const diffMonths = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
                if (diffMonths >= -11 && diffMonths <= 0) {
                    values[diffMonths + 11]++;
                }
            });
            break;
        default:
            labels = [];
            values = [];
    }
    return { labels, values };
}

// Calculate revenue by status for a given period
function calculateRevenueByStatusForPeriod(invoices, period) {
    // Returns { paid, pending, overdue, draft }
    const now = new Date();
    let filtered = invoices;
    if (period === 'monthly') {
        filtered = invoices.filter(inv => {
            const d = new Date(inv.issue_date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    } else if (period === 'yearly') {
        filtered = invoices.filter(inv => {
            const d = new Date(inv.issue_date);
            return d.getFullYear() === now.getFullYear();
        });
    }
    return {
        paid: filtered.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0),
        pending: filtered.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0),
        overdue: filtered.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0),
        draft: filtered.filter(inv => inv.status === 'draft').reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0)
    };
}

// --- 11. Data Collection Functions ---
// Collects all invoice form data into a single object
function collectInvoiceData() {
    const invoiceForm = document.getElementById('invoiceForm');
    if (!invoiceForm) return {};
    const formData = new FormData(invoiceForm);
    const invoiceData = {};
    for (const [key, value] of formData.entries()) {
        invoiceData[key] = value;
    }
    invoiceData.items = collectInvoiceItems();
    // Calculate totals
    invoiceData.subtotal = parseFloat(document.getElementById('subtotal').textContent) || 0;
    invoiceData.totalVat = parseFloat(document.getElementById('totalVat').textContent) || 0;
    invoiceData.total = parseFloat(document.getElementById('invoiceTotal').textContent) || 0;
    return invoiceData;
}

// Collects all invoice item rows into an array
function collectInvoiceItems() {
    const rows = document.querySelectorAll('.item-row');
    const items = [];
    rows.forEach(row => {
        items.push({
            description: row.querySelector('.item-description').value,
            quantity: parseFloat(row.querySelector('.item-quantity').value) || 0,
            price: parseFloat(row.querySelector('.item-price').value) || 0,
            vat: parseFloat(row.querySelector('.item-vat').textContent) || 0,
            total: parseFloat(row.querySelector('.item-total').textContent) || 0
        });
    });
    return items;
}

// Example usage: const invoiceData = collectInvoiceData();
// Use this in saveInvoice, preview, or export functions.

// --- 3. Initialization Functions ---
function setupEventListeners() {
    // Create Invoice Button
    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    if (createInvoiceBtn) {
        createInvoiceBtn.addEventListener('click', function() {
            openModal('invoiceModal');
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
                showNotification('Error submitting form: ' + error.message);
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
            previewContainer.innerHTML = `<div class="invoice-a4">${invoiceHTML}</div>`;
            document.getElementById('viewInvoiceModal').style.display = 'block';
        });
    }
    // Template selector
    const templateSelector = document.getElementById('templateSelector');
    if (templateSelector) {
        templateSelector.addEventListener('change', function() {
            // ...implementation for template change...
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

// --- Table Filters Setup ---
function setupTableFilters() {
    // Placeholder: implement filter logic if needed
    // For now, this prevents ReferenceError and allows the app to run
}

// --- 10. Metrics & Chart Data Loading Functions ---
// Fetches metrics (total invoices, revenue, etc.) from Supabase and updates dashboard
async function updateMetricsDisplay() {
    try {
        // Fetch all invoices from Supabase
        const { data: invoices, error: invoiceError } = await window.supabase
            .from('invoices')
            .select('*');
        if (invoiceError) throw invoiceError;

        // Calculate metrics
        const totalInvoices = invoices.length;
        const totalPaid = invoices.filter(inv => inv.status === 'paid').length;
        const totalPending = invoices.filter(inv => inv.status === 'pending').length;
        const totalOverdue = invoices.filter(inv => inv.status === 'overdue').length;
        const paidPercentage = totalInvoices > 0 ? ((totalPaid / totalInvoices) * 100).toFixed(1) : '0.0';
        const pendingPercentage = totalInvoices > 0 ? ((totalPending / totalInvoices) * 100).toFixed(1) : '0.0';
        const overduePercentage = totalInvoices > 0 ? ((totalOverdue / totalInvoices) * 100).toFixed(1) : '0.0';
        const totalRevenue = invoices.reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const revenueThisMonth = invoices.filter(inv => {
            const d = new Date(inv.issue_date);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
        }).reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0);
        const averageInvoiceAmount = totalInvoices > 0 ? (totalRevenue / totalInvoices) : 0;

        // Update metrics cards in the DOM
        const setMetric = (selector, value) => {
            const el = document.querySelector(selector);
            if (el) el.textContent = value;
        };
        setMetric('#totalInvoicesCard .metric-value', totalInvoices);
        setMetric('#paidInvoicesCard .metric-value', totalPaid);
        setMetric('#paidInvoicesCard .metric-footer .metric-label', `${paidPercentage}% of Total`);
        setMetric('#pendingInvoicesCard .metric-value', totalPending);
        setMetric('#pendingInvoicesCard .metric-footer .metric-label', `${pendingPercentage}% of Total`);
        setMetric('#overdueInvoicesCard .metric-value', totalOverdue);
        setMetric('#overdueInvoicesCard .metric-footer .metric-label', `${overduePercentage}% of Total`);
        setMetric('#totalRevenueCard .metric-value', formatCurrency(totalRevenue));
        setMetric('#revenueThisMonthCard .metric-value', formatCurrency(revenueThisMonth));
        setMetric('#averageInvoiceAmountCard .metric-value', formatCurrency(averageInvoiceAmount));
    } catch (error) {
        showNotification('Error loading metrics: ' + error.message);
        // Set default values in case of error
        const setMetric = (selector, value) => {
            const el = document.querySelector(selector);
            if (el) el.textContent = value;
        };
        setMetric('#totalInvoicesCard .metric-value', '0');
        setMetric('#paidInvoicesCard .metric-value', '0');
        setMetric('#pendingInvoicesCard .metric-value', '0');
        setMetric('#overdueInvoicesCard .metric-value', '0');
        setMetric('#totalRevenueCard .metric-value', formatCurrency(0));
        setMetric('#revenueThisMonthCard .metric-value', formatCurrency(0));
        setMetric('#averageInvoiceAmountCard .metric-value', formatCurrency(0));
    }
}

// Subscribes to metrics changes (if using Supabase real-time)
function setupMetricsSubscription() {
    if (!window.supabase) return;
    window.supabase
        .channel('public:invoices')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
            updateMetricsDisplay();
        })
        .subscribe();
}

// Fetches data for charts (e.g., revenue by status, invoice distribution)
async function updateCharts() {
    try {
        // Fetch all invoices from Supabase
        const { data: invoices, error } = await window.supabase
            .from('invoices')
            .select('*');
        if (error) throw error;
        if (Array.isArray(invoices)) {
            processInvoiceDataForCharts(invoices);
        }
    } catch (err) {
        showNotification('Error loading chart data: ' + err.message);
        resetCharts();
    }
}

// Initializes chart instances (using Chart.js or similar)
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
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });
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
                plugins: { legend: { position: 'right' } },
                cutout: '70%'
            }
        });
    }
}

// Subscribes to chart data changes
function setupChartSubscription() {
    if (!window.supabase) return;
    window.supabase
        .channel('public:invoices')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
            updateCharts();
        })
        .subscribe();
}

// Updates the revenue by status chart
function updateRevenueByStatusChart(data) {
    if (!revenueByStatusChartInstance) return;
    // Data: { paid, pending, overdue, draft }
    const chart = revenueByStatusChartInstance;
    chart.data.datasets[0].data = [
        data.paid || 0,
        data.pending || 0,
        data.overdue || 0,
        data.draft || 0
    ];
    chart.update();
}

// Updates the invoice distribution chart
function updateInvoiceDistributionChart(data) {
    if (!invoiceDistributionChartInstance) return;
    // Data: { labels, values }
    const chart = invoiceDistributionChartInstance;
    chart.data.labels = data.labels;
    chart.data.datasets[0].data = data.values;
    chart.update();
}

// --- Chart Period Controls ---
function setupChartPeriodControls() {
    // Invoice Distribution Chart period buttons
    const weeklyBtn = document.getElementById('weeklyBtn');
    const monthlyBtn = document.getElementById('monthlyBtn');
    const quarterlyBtn = document.getElementById('quarterlyBtn');
    // Defensive: check if buttons exist
    if (weeklyBtn && monthlyBtn && quarterlyBtn) {
        weeklyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [monthlyBtn, quarterlyBtn]);
            updateInvoiceDistributionChartByPeriod('weekly');
        });
        monthlyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [weeklyBtn, quarterlyBtn]);
            updateInvoiceDistributionChartByPeriod('monthly');
        });
        quarterlyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [weeklyBtn, monthlyBtn]);
            updateInvoiceDistributionChartByPeriod('quarterly');
        });
    }
    // Revenue by Status Chart period buttons (if present)
    const revenueMonthlyBtn = document.getElementById('revenueMonthlyBtn');
    const revenueYearlyBtn = document.getElementById('revenueYearlyBtn');
    if (revenueMonthlyBtn && revenueYearlyBtn) {
        revenueMonthlyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [revenueYearlyBtn]);
            updateRevenueByStatusChartByPeriod('monthly');
        });
        revenueYearlyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [revenueMonthlyBtn]);
            updateRevenueByStatusChartByPeriod('yearly');
        });
    }
}

function updateChartPeriodButtons(activeButton, inactiveButtons) {
    if (!activeButton) return;
    activeButton.classList.add('active');
    if (Array.isArray(inactiveButtons)) {
        inactiveButtons.forEach(btn => btn && btn.classList.remove('active'));
    }
}

// Helper: update Invoice Distribution Chart by period
function updateInvoiceDistributionChartByPeriod(period) {
    // Fetch invoices and process for the selected period
    window.supabase
        .from('invoices')
        .select('*')
        .then(({ data: invoices, error }) => {
            if (error) {
                showNotification('Error loading invoices for chart: ' + error.message);
                return;
            }
            const chartData = calculateDistributionDataForPeriod(invoices, period);
            updateInvoiceDistributionChart(chartData);
        });
}

// Helper: update Revenue by Status Chart by period
function updateRevenueByStatusChartByPeriod(period) {
    window.supabase
        .from('invoices')
        .select('*')
        .then(({ data: invoices, error }) => {
            if (error) {
                showNotification('Error loading invoices for chart: ' + error.message);
                return;
            }
            const chartData = calculateRevenueByStatusForPeriod(invoices, period);
            updateRevenueByStatusChart(chartData);
        });
}

// Calculate distribution data for a given period
function calculateDistributionDataForPeriod(invoices, period) {
    // Returns { labels, values }
    const now = new Date();
    let startDate;
    let labels = [];
    let values = [];
    switch (period) {
        case 'weekly':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            values = Array(7).fill(0);
            invoices.forEach(inv => {
                const d = new Date(inv.issue_date);
                if (d >= startDate) {
                    let day = d.getDay();
                    // Convert Sunday (0) to last
                    day = day === 0 ? 6 : day - 1;
                    values[day]++;
                }
            });
            break;
        case 'monthly':
            // Last 4 weeks
            labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
            values = Array(4).fill(0);
            const fourWeeksAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 27);
            invoices.forEach(inv => {
                const d = new Date(inv.issue_date);
                if (d >= fourWeeksAgo) {
                    const week = Math.floor((now - d) / (7 * 24 * 60 * 60 * 1000));
                    if (week >= 0 && week < 4) values[3 - week]++;
                }
            });
            break;
        case 'quarterly':
            // Last 12 months
            labels = [];
            values = [];
            for (let i = 0; i < 12; i++) {
                const month = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
                labels.push(month.toLocaleString('default', { month: 'short' }));
                values.push(0);
            }
            invoices.forEach(inv => {
                const d = new Date(inv.issue_date);
                const diffMonths = (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
                if (diffMonths >= -11 && diffMonths <= 0) {
                    values[diffMonths + 11]++;
                }
            });
            break;
        default:
            labels = [];
            values = [];
    }
    return { labels, values };
}

// Calculate revenue by status for a given period
function calculateRevenueByStatusForPeriod(invoices, period) {
    // Returns { paid, pending, overdue, draft }
    const now = new Date();
    let filtered = invoices;
    if (period === 'monthly') {
        filtered = invoices.filter(inv => {
            const d = new Date(inv.issue_date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    } else if (period === 'yearly') {
        filtered = invoices.filter(inv => {
            const d = new Date(inv.issue_date);
            return d.getFullYear() === now.getFullYear();
        });
    }
    return {
        paid: filtered.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0),
        pending: filtered.filter(inv => inv.status === 'pending').reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0),
        overdue: filtered.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0),
        draft: filtered.filter(inv => inv.status === 'draft').reduce((sum, inv) => sum + (parseFloat(inv.total_amount) || 0), 0)
    };
}
