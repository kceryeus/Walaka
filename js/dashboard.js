// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize drilldown buttons
    const drilldownButtons = document.querySelectorAll('.drilldown-btn');
    drilldownButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('data-target');
            const content = document.getElementById(targetId);
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            // Toggle expanded state
            this.setAttribute('aria-expanded', !isExpanded);
            // Toggle .active class for content
            if (content) {
                content.classList.toggle('active', !isExpanded);
            }
            // Toggle chevron icon direction
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = !isExpanded ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
            }
        });
    });

    // Initialize drilldown tabs
    const drilldownTabs = document.querySelectorAll('.drilldown-tab');
    drilldownTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            const parent = this.closest('.drilldown-actions');
            if (parent) {
                parent.querySelectorAll('.drilldown-tab').forEach(t => t.classList.remove('active'));
            }
            this.classList.add('active');
        });
    });

    // Menu toggle functionality
    // [REMOVED FOR DASHBOARD.HTML] - Sidebar toggle logic is now handled in dashboard.html to avoid conflicts with overlay and responsive logic.
    // const menuToggle = document.querySelector('.menu-toggle');
    // const sidebar = document.querySelector('.sidebar');
    // const mainContent = document.querySelector('.main-content');
    // if (menuToggle && sidebar && mainContent) {
    //     menuToggle.addEventListener('click', () => {
    //         sidebar.classList.toggle('collapsed');
    //         mainContent.classList.toggle('expanded');
    //         document.body.classList.toggle('sidebar-collapsed');
    //     });
    // }

    // Initialize notification bell
    const notificationBell = document.querySelector('.notification-bell');
    if (notificationBell) {
        notificationBell.addEventListener('click', () => {
            // Add notification functionality here
            console.log('Notification bell clicked');
        });
    }

    // Revenue Chart period buttons logic (moved here to avoid redeclaration)
    const monthlyBtn = document.getElementById('monthlyBtn');
    const quarterlyBtn = document.getElementById('quarterlyBtn');
    // Helper to update active button
    function setRevenuePeriodActive(btn) {
        [monthlyBtn, quarterlyBtn].forEach(b => b && b.classList.remove('active'));
        if (btn) btn.classList.add('active');
    }
    // Helper to fetch and update chart
    async function updateRevenueChart(period = 'monthly') {
        if (!window.supabase || !window.revenueChartInstance) return;
        try {
            const environment_id = await window.getEffectiveEnvironmentId();
            const { data: invoices, error } = await window.supabase
                .from('invoices')
                .select('total_amount, total, issue_date')
                .eq('environment_id', environment_id);
            if (error) throw error;
            if (period === 'monthly') {
                const monthlyRevenue = Array(12).fill(0);
                invoices.forEach(inv => {
                    if (!inv.issue_date) return;
                    const date = new Date(inv.issue_date);
                    const month = date.getMonth();
                    const amount = (typeof inv.total_amount === 'number' && !isNaN(inv.total_amount)) ? inv.total_amount : (Number(inv.total) || 0);
                    monthlyRevenue[month] += amount;
                });
                window.revenueChartInstance.data.labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                window.revenueChartInstance.data.datasets[0].data = monthlyRevenue;
            } else if (period === 'quarterly') {
                const quarterlyRevenue = [0, 0, 0, 0];
                invoices.forEach(inv => {
                    if (!inv.issue_date) return;
                    const date = new Date(inv.issue_date);
                    const month = date.getMonth();
                    const quarter = Math.floor(month / 3); // 0-3
                    const amount = (typeof inv.total_amount === 'number' && !isNaN(inv.total_amount)) ? inv.total_amount : (Number(inv.total) || 0);
                    quarterlyRevenue[quarter] += amount;
                });
                window.revenueChartInstance.data.labels = ['Q1', 'Q2', 'Q3', 'Q4'];
                window.revenueChartInstance.data.datasets[0].data = quarterlyRevenue;
            }
            window.revenueChartInstance.update();
        } catch (err) {
            console.error('Error updating revenue chart:', err);
        }
    }
    if (monthlyBtn && quarterlyBtn) {
        monthlyBtn.addEventListener('click', function() {
            setRevenuePeriodActive(monthlyBtn);
            updateRevenueChart('monthly');
        });
        quarterlyBtn.addEventListener('click', function() {
            setRevenuePeriodActive(quarterlyBtn);
            updateRevenueChart('quarterly');
        });
    }
    // On page load, set to monthly
    setRevenuePeriodActive(monthlyBtn);
    updateRevenueChart('monthly');

    // Add Chart.js bar click drilldown handler with debug logs
    if (window.revenueChartInstance) {
        window.revenueChartInstance.options.onClick = function(evt, elements) {
            console.log('[DEBUG] Chart.js onClick fired', {evt, elements});
            if (elements && elements.length > 0) {
                const element = elements[0];
                const index = element.index;
                const label = this.data.labels[index];
                console.log(`[DEBUG] Bar clicked: index=${index}, label=${label}`);
                // Open the revenue drilldown section
                const drilldownBtn = document.querySelector('.drilldown-btn[data-target="revenueDetail"]');
                const drilldownContent = document.getElementById('revenueDetail');
                if (drilldownBtn && drilldownContent) {
                    drilldownBtn.setAttribute('aria-expanded', 'true');
                    drilldownContent.classList.add('active');
                    // Set chevron up
                    const icon = drilldownBtn.querySelector('i');
                    if (icon) icon.className = 'fas fa-chevron-up';
                    console.log('[DEBUG] Drilldown opened for revenueDetail');
                } else {
                    console.log('[DEBUG] Drilldown button or content not found');
                }
            } else {
                console.log('[DEBUG] No chart element clicked');
            }
        };
        window.revenueChartInstance.update(); // Ensure Chart.js picks up the new handler
    } else {
        console.log('[DEBUG] revenueChartInstance not found on DOMContentLoaded');
    }

    // Function to display error messages
    function displayErrorMessage(message) {
        console.error(message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    // Function to format currency
    function formatCurrency(amount, currency = 'MZN') {
        return new Intl.NumberFormat('pt-MZ', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // Function to format date
    function formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('pt-MZ');
    }

    // Function to reset filters
    function resetFilters() {
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('dateFilter').value = 'all';
        document.getElementById('amountFilter').value = 'all';
        document.getElementById('searchInvoices').value = '';
        filterInvoices();
    }

    // Function to sort invoices
    function sortInvoices(column) {
        const tbody = document.getElementById('invoicesTableBody');
        const rows = Array.from(tbody.getElementsByTagName('tr'));
        
        sortConfig.direction = sortConfig.column === column ? 
            (sortConfig.direction === 'asc' ? 'desc' : 'asc') : 'asc';
        sortConfig.column = column;
        
        rows.sort((a, b) => {
            let aValue = a.children[getColumnIndex(column)].textContent;
            let bValue = b.children[getColumnIndex(column)].textContent;
            
            if (column === 'total') {
                aValue = parseFloat(aValue.replace(/[^0-9.-]+/g, ''));
                bValue = parseFloat(bValue.replace(/[^0-9.-]+/g, ''));
            } else if (column === 'issue_date') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            if (sortConfig.direction === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });
        
        rows.forEach(row => tbody.appendChild(row));
    }

    function getColumnIndex(column) {
        const columns = {
            'invoice_number': 0,
            'client_name': 1,
            'issue_date': 2,
            'total': 3
        };
        return columns[column] || 0;
    }

    async function initializeDashboard() {
        try {
            const metrics = await fetchMetricsData();
            updateMetricsDisplay(metrics);
        } catch (error) {
            console.error('Error initializing dashboard:', error);
            displayErrorMessage('Unable to load dashboard data. Please try refreshing the page.');
        }
    }

    function updateMetricsDisplay(metrics) {
        // Update metrics display logic here
        // This will be implemented based on your specific needs
    }

    // Initialize dashboard when the page loads
    document.addEventListener('DOMContentLoaded', initializeDashboard); 
});
