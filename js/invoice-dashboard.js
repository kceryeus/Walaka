document.addEventListener('DOMContentLoaded', function() {
    // Toggle between dashboard and form views
    const createInvoiceBtn = document.getElementById('createInvoiceBtn');
    const dashboardView = document.getElementById('dashboard-view');
    const formView = document.getElementById('form-view');

    if (createInvoiceBtn) {
        createInvoiceBtn.addEventListener('click', function() {
            dashboardView.style.display = 'none';
            formView.style.display = 'block';
        });
    }

    // Initialize dashboard charts
    initializeCharts();

    // Handle table sorting and filtering
    initializeTableControls();
});

function initializeCharts() {
    // Initialize distribution chart
    const distributionChart = new Chart(
        document.getElementById('invoiceDistributionChart')?.getContext('2d'),
        {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Invoices',
                    data: [12, 19, 15, 17, 14, 8, 5],
                    backgroundColor: '#007ec7'
                }]
            }
        }
    );

    // Initialize revenue chart
    const revenueChart = new Chart(
        document.getElementById('revenueByStatusChart')?.getContext('2d'),
        {
            type: 'doughnut',
            data: {
                labels: ['Paid', 'Pending', 'Overdue'],
                datasets: [{
                    data: [281, 52, 25],
                    backgroundColor: ['#22c55e', '#eab308', '#ef4444']
                }]
            }
        }
    );
}

function initializeTableControls() {
    // Add table sorting and filtering logic here
    // This will be implemented based on your specific requirements
}
