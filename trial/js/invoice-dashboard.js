document.addEventListener('DOMContentLoaded', async function() {
    try {
        const { data: { user } } = await supabase.auth.getSession();
        if (!user) {
            window.location.href = '/login.html';
            return;
        }

        // Check trial status
        const trialStatus = await checkTrialStatus(user.id);
        const statusEl = document.getElementById('trialStatus');
        const bannerEl = document.getElementById('trialStatusBanner');
        
        if (bannerEl) {
            if (trialStatus.error || (!trialStatus.canCreate && !trialStatus.unlimited)) {
                statusEl.textContent = `Trial expired. Please upgrade to continue.`;
                bannerEl.style.display = 'flex';
            } else if (!trialStatus.unlimited) {
                statusEl.textContent = `Trial: ${trialStatus.daysLeft} days and ${trialStatus.invoicesLeft} invoices remaining`;
                bannerEl.style.display = 'flex';
            } else {
                bannerEl.style.display = 'none';
            }
        }

        // Initialize dashboard components
        initializeCharts();
        initializeTableControls();

    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
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
