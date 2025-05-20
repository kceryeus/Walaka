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
                plugins: {
                    legend: { position: 'right' }
                },
                cutout: '70%'
            }
        });
    }
}

function setupChartPeriodControls() {
    const weeklyBtn = document.getElementById('weeklyBtn');
    const monthlyBtn = document.getElementById('monthlyBtn');
    const quarterlyBtn = document.getElementById('quarterlyBtn');

    if (weeklyBtn && monthlyBtn && quarterlyBtn) {
        weeklyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [monthlyBtn, quarterlyBtn]);
            updateInvoiceDistributionChart('weekly');
        });
        monthlyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [weeklyBtn, quarterlyBtn]);
            updateInvoiceDistributionChart('monthly');
        });
        quarterlyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [weeklyBtn, monthlyBtn]);
            updateInvoiceDistributionChart('quarterly');
        });
    }

    const revenueMonthlyBtn = document.getElementById('revenueMonthlyBtn');
    const revenueYearlyBtn = document.getElementById('revenueYearlyBtn');
    if (revenueMonthlyBtn && revenueYearlyBtn) {
        revenueMonthlyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [revenueYearlyBtn]);
            updateRevenueByStatusChart('monthly');
        });
        revenueYearlyBtn.addEventListener('click', function() {
            updateChartPeriodButtons(this, [revenueMonthlyBtn]);
            updateRevenueByStatusChart('yearly');
        });
    }
}

function updateChartPeriodButtons(activeButton, inactiveButtons) {
    activeButton.classList.add('active');
    inactiveButtons.forEach(button => button.classList.remove('active'));
}

function updateInvoiceDistributionChart(period, data = null) {
    try {
        const chart = window.invoiceDistributionChart;
        if (!chart) throw new Error('Chart instance not found');
        if (data) {
            chart.data.datasets[0].data = data.values;
            chart.data.labels = data.labels;
        } else if (typeof period === 'string') {
            let labels = [];
            let values = [];
            switch (period.toLowerCase()) {
                case 'weekly':
                    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    values = [5, 7, 10, 8, 12, 3, 1];
                    break;
                case 'monthly':
                    labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                    values = [20, 30, 25, 15];
                    break;
                case 'quarterly':
                    labels = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec'];
                    values = [60, 80, 70, 50];
                    break;
                default:
                    labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    values = Array(7).fill(0);
            }
            chart.data.labels = labels;
            chart.data.datasets[0].data = values;
        }
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
                data.overdue || 0,
                data.draft || 0
            ];
        } else if (typeof period === 'string') {
            chart.data.datasets[0].data = period.toLowerCase() === 'monthly' 
                ? [65, 15, 12, 8] 
                : [78, 10, 8, 4];
        }
        chart.update();
    } catch (error) {
        console.error('Error updating revenue chart:', error);
    }
}

// Attach chart functions to window for global access
if (typeof window !== 'undefined') {
    window.setupCharts = setupCharts;
    window.setupChartPeriodControls = setupChartPeriodControls;
    window.updateChartPeriodButtons = updateChartPeriodButtons;
    window.updateInvoiceDistributionChart = updateInvoiceDistributionChart;
    window.updateRevenueByStatusChart = updateRevenueByStatusChart;
}
