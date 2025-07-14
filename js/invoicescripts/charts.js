// js/invoicescripts/charts.js
// Handles all chart setup and update logic for the invoice dashboard

function setupCharts() {
    // Clean up existing charts
    if (window.invoiceDistributionChart && typeof window.invoiceDistributionChart.destroy === 'function') {
        window.invoiceDistributionChart.destroy();
        window.invoiceDistributionChart = null;
    }
    if (window.revenueByStatusChart && typeof window.revenueByStatusChart.destroy === 'function') {
        window.revenueByStatusChart.destroy();
        window.revenueByStatusChart = null;
    }

    // Setup Invoice Distribution Chart
    const invoiceDistributionCtx = document.getElementById('invoiceDistributionChart');
    if (invoiceDistributionCtx) {
        window.invoiceDistributionChart = new Chart(invoiceDistributionCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Invoices Created Over Time',
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
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
        // Ensure the select is set to 'last30' and chart loads by default
        const periodSelect = document.getElementById('invoiceDistributionPeriod');
        if (periodSelect) {
            periodSelect.value = 'last30';
        }
        // Load default data
        updateInvoiceDistributionChart('last30');
    }

    // Setup Revenue by Status Chart
    const revenueByStatusCtx = document.getElementById('revenueByStatusChart');
    if (revenueByStatusCtx) {
        window.revenueByStatusChart = new Chart(revenueByStatusCtx, {
            type: 'doughnut',
            data: {
                labels: ['Paid', 'Pending', 'Overdue'], // Exclude 'Draft'
                datasets: [{
                    data: Array(3).fill(0), // Only 3 statuses
                    backgroundColor: [
                        '#3bb077',
                        '#f0ad4e',
                        '#e55353'
                    ],
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' }
                },
                cutout: '70%'
            }
        });
    }
}

function setupChartPeriodControls() {
    const periodSelect = document.getElementById('invoiceDistributionPeriod');
    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            updateInvoiceDistributionChart(this.value);
        });
    }
}

function updateChartPeriodButtons(activeButton, inactiveButtons) {
    activeButton.classList.add('active');
    inactiveButtons.forEach(button => button.classList.remove('active'));
}

// Utility to fetch invoice counts per period from Supabase
async function fetchInvoiceCountsByPeriod(period, customRange = null) {
    let query = window.supabase.from('invoices').select('issue_date', { count: 'exact' });
    let labels = [], counts = [];
    const today = new Date();
    if (period === 'last30') {
        // Last 30 days
        const start = new Date(today);
        start.setDate(today.getDate() - 29);
        query = query.gte('issue_date', start.toISOString().slice(0, 10)).lte('issue_date', today.toISOString().slice(0, 10));
        // We'll group by day
        labels = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            labels.push(d.toISOString().slice(5, 10));
        }
    } else if (period === 'week') {
        // This week (Mon-Sun)
        const start = new Date(today);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        start.setDate(diff);
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        query = query.gte('issue_date', start.toISOString().slice(0, 10)).lte('issue_date', end.toISOString().slice(0, 10));
        labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    } else if (period === 'month') {
        // This month, group by week
        const year = today.getFullYear();
        const month = today.getMonth();
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        query = query.gte('issue_date', start.toISOString().slice(0, 10)).lte('issue_date', end.toISOString().slice(0, 10));
        labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    } else if (period === 'quarter') {
        // This quarter, group by month
        const year = today.getFullYear();
        const quarter = Math.floor(today.getMonth() / 3);
        const start = new Date(year, quarter * 3, 1);
        const end = new Date(year, quarter * 3 + 3, 0);
        query = query.gte('issue_date', start.toISOString().slice(0, 10)).lte('issue_date', end.toISOString().slice(0, 10));
        labels = ['Month 1', 'Month 2', 'Month 3'];
    } else if (period === 'year') {
        // This year, group by month
        const year = today.getFullYear();
        const start = new Date(year, 0, 1);
        const end = new Date(year, 11, 31);
        query = query.gte('issue_date', start.toISOString().slice(0, 10)).lte('issue_date', end.toISOString().slice(0, 10));
        labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    } else if (period === 'custom' && customRange) {
        const start = new Date(customRange.startDate);
        const end = new Date(customRange.endDate);
        query = query.gte('issue_date', start.toISOString().slice(0, 10)).lte('issue_date', end.toISOString().slice(0, 10));
        // Group by day
        const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
        labels = [];
        for (let i = 0; i < days; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            labels.push(d.toISOString().slice(5, 10));
        }
    }
    // Fetch all invoices in the range
    const { data: invoices, error } = await query;
    if (error) {
        console.error('Error fetching invoices for chart:', error);
        return { labels, counts: Array(labels.length).fill(0) };
    }
    // Count per label
    let countsMap = {};
    if (period === 'last30' || period === 'custom') {
        labels.forEach(lab => { countsMap[lab] = 0; });
        invoices.forEach(inv => {
            const d = new Date(inv.issue_date);
            const label = d.toISOString().slice(5, 10);
            if (countsMap[label] !== undefined) countsMap[label]++;
        });
        counts = labels.map(lab => countsMap[lab] || 0);
    } else if (period === 'week') {
        labels.forEach(lab => { countsMap[lab] = 0; });
        invoices.forEach(inv => {
            const d = new Date(inv.issue_date);
            const day = d.getDay();
            const idx = day === 0 ? 6 : day - 1; // Sunday is last
            countsMap[labels[idx]]++;
        });
        counts = labels.map(lab => countsMap[lab] || 0);
    } else if (period === 'month') {
        // Group by week of month
        labels.forEach(lab => { countsMap[lab] = 0; });
        invoices.forEach(inv => {
            const d = new Date(inv.issue_date);
            const week = Math.floor((d.getDate() - 1) / 7);
            countsMap[labels[week]]++;
        });
        counts = labels.map(lab => countsMap[lab] || 0);
    } else if (period === 'quarter') {
        // Group by month in quarter
        labels.forEach(lab => { countsMap[lab] = 0; });
        invoices.forEach(inv => {
            const d = new Date(inv.issue_date);
            const monthInQuarter = d.getMonth() % 3;
            countsMap[labels[monthInQuarter]]++;
        });
        counts = labels.map(lab => countsMap[lab] || 0);
    } else if (period === 'year') {
        labels.forEach(lab => { countsMap[lab] = 0; });
        invoices.forEach(inv => {
            const d = new Date(inv.issue_date);
            const month = d.getMonth();
            countsMap[labels[month]]++;
        });
        counts = labels.map(lab => countsMap[lab] || 0);
    }
    return { labels, counts };
}

async function updateInvoiceDistributionChart(period, customRange = null) {
    try {
        const chart = window.invoiceDistributionChart;
        if (!chart) {
            console.error('Chart instance not found');
            return;
        }
        // Fetch real data
        const { labels, counts } = await fetchInvoiceCountsByPeriod(period, customRange);
        chart.data.labels = labels;
        chart.data.datasets[0].data = counts;
        chart.update();
    } catch (error) {
        console.error('Error updating distribution chart:', error);
    }
}

function updateRevenueByStatusChart(period, data = null) {
    try {
        const chart = window.revenueByStatusChart;
        if (!chart) throw new Error('Chart instance not found');
        if (data) {
            chart.data.datasets[0].data = [
                data.paid || 0,
                data.pending || 0,
                data.overdue || 0
                // Exclude draft
            ];
        } else if (typeof period === 'string') {
            chart.data.datasets[0].data = period.toLowerCase() === 'monthly' 
                ? [65, 15, 12] // Only 3 values
                : [78, 10, 8];
        }
        chart.update();
    } catch (error) {
        console.error('Error updating revenue chart:', error);
    }
}

/**
 * Classifies invoices and returns counts for Paid, Pending, Overdue.
 * @param {Array} invoices - Array of invoice objects with status and dueDate.
 * @returns {Object} { paid, pending, overdue }
 */
function getInvoiceStatusCounts(invoices) {
    const now = new Date();
    let paid = 0, pending = 0, overdue = 0;
    invoices.forEach(inv => {
        if (inv.status === 'paid') {
            paid++;
        } else if (inv.status === 'overdue') {
            overdue++;
        } else if (inv.status === 'pending') {
            if (inv.dueDate && new Date(inv.dueDate) < now) {
                overdue++;
            } else {
                pending++;
            }
        }
        // Drafts are ignored
    });
    return { paid, pending, overdue };
}

/**
 * Updates invoice statuses: sets status to 'overdue' if pending and dueDate has passed.
 * @param {Array} invoices - Array of invoice objects with status and dueDate.
 */
function autoUpdateInvoiceStatuses(invoices) {
    const now = new Date();
    invoices.forEach(inv => {
        // Accept both dueDate and due_date, and handle string/Date
        const due = inv.dueDate || inv.due_date;
        if (
            inv.status === 'pending' &&
            due &&
            !isNaN(new Date(due).getTime()) &&
            new Date(due) < now
        ) {
            inv.status = 'overdue';
        }
    });
}

// Example usage when updating the chart:
// const counts = getInvoiceStatusCounts(invoiceArray);
// updateRevenueByStatusChart(null, counts);

// Example usage before updating charts:
// autoUpdateInvoiceStatuses(invoiceArray);
// const counts = getInvoiceStatusCounts(invoiceArray);
// updateRevenueByStatusChart(null, counts);

// Attach chart functions to window for global access
if (typeof window !== 'undefined') {
    window.setupCharts = setupCharts;
    window.setupChartPeriodControls = setupChartPeriodControls;
    window.updateChartPeriodButtons = updateChartPeriodButtons;
    window.updateInvoiceDistributionChart = updateInvoiceDistributionChart;
    window.updateRevenueByStatusChart = updateRevenueByStatusChart;
    window.autoUpdateInvoiceStatuses = autoUpdateInvoiceStatuses;
    window.getInvoiceStatusCounts = getInvoiceStatusCounts;
}
