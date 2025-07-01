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
    const customRangeDiv = document.getElementById('invoiceDistributionCustomRange');
    const startDateInput = document.getElementById('invoiceDistributionStartDate');
    const endDateInput = document.getElementById('invoiceDistributionEndDate');
    const applyBtn = document.getElementById('applyInvoiceDistributionRange');

    if (periodSelect) {
        periodSelect.addEventListener('change', function() {
            if (this.value === 'custom') {
                customRangeDiv.style.display = 'inline-block';
            } else {
                customRangeDiv.style.display = 'none';
                updateInvoiceDistributionChart(this.value);
            }
        });
    }
    if (applyBtn && startDateInput && endDateInput) {
        applyBtn.addEventListener('click', function() {
            const start = startDateInput.value;
            const end = endDateInput.value;
            if (!start || !end) {
                alert('Please select both start and end dates.');
                return;
            }
            updateInvoiceDistributionChart('custom', { startDate: start, endDate: end });
        });
    }
}

function updateChartPeriodButtons(activeButton, inactiveButtons) {
    activeButton.classList.add('active');
    inactiveButtons.forEach(button => button.classList.remove('active'));
}

function updateInvoiceDistributionChart(period, customRange = null) {
    try {
        const chart = window.invoiceDistributionChart;
        if (!chart) throw new Error('Chart instance not found');
        let labels = [];
        let values = [];
        if (period === 'last30') {
            // Last 30 days
            const today = new Date();
            for (let i = 29; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                labels.push(d.toISOString().slice(5, 10)); // MM-DD
                values.push(Math.floor(Math.random() * 5)); // MOCK: Replace with real data
            }
        } else if (period === 'week') {
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            values = [5, 7, 10, 8, 12, 3, 1]; // MOCK
        } else if (period === 'month') {
            labels = Array.from({length: 4}, (_, i) => `Week ${i+1}`);
            values = [20, 30, 25, 15]; // MOCK
        } else if (period === 'quarter') {
            labels = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec'];
            values = [60, 80, 70, 50]; // MOCK
        } else if (period === 'year') {
            labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            values = Array(12).fill(0).map(() => Math.floor(Math.random() * 50)); // MOCK
        } else if (period === 'custom' && customRange) {
            // Calculate days between start and end
            const start = new Date(customRange.startDate);
            const end = new Date(customRange.endDate);
            const days = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
            for (let i = 0; i < days; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                labels.push(d.toISOString().slice(5, 10));
                values.push(Math.floor(Math.random() * 5)); // MOCK
            }
        } else {
            labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            values = Array(7).fill(0);
        }
        chart.data.labels = labels;
        chart.data.datasets[0].data = values;
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
