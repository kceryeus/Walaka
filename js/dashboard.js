// Dashboard functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize drilldown buttons
    const drilldownButtons = document.querySelectorAll('.drilldown-btn');
    drilldownButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const content = document.getElementById(targetId);
            const isExpanded = this.getAttribute('aria-expanded') === 'true';
            
            // Toggle expanded state
            this.setAttribute('aria-expanded', !isExpanded);
            
            // Toggle content visibility
            if (content) {
                content.style.display = isExpanded ? 'none' : 'block';
                this.querySelector('i').className = isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-up';
            }
        });
    });

    // Initialize drilldown tabs
    const drilldownTabs = document.querySelectorAll('.drilldown-tab');
    drilldownTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const parent = this.closest('.drilldown-actions');
            parent.querySelectorAll('.drilldown-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Menu toggle functionality
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
        });
    }
});

// Function to display error messages
function displayErrorMessage(message) {
    console.error(message);
    // You can implement a more user-friendly error display here
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
        // Show a user-friendly error message
        const errorMessage = document.createElement('div');
        errorMessage.className = 'error-message';
        errorMessage.textContent = 'Unable to load dashboard data. Please try refreshing the page.';
        document.querySelector('.main-content').prepend(errorMessage);
    }
}

function updateMetricsDisplay(metrics) {
    // Update metrics display logic here
    // This will be implemented based on your specific needs
}

// Initialize dashboard when the page loads
document.addEventListener('DOMContentLoaded', initializeDashboard); 