
async function fetchMetricsData() {
    try {
        // Fetch invoices data
        const invoicesResponse = await fetch('api/invoices');
        const invoices = await invoicesResponse.json();

        // Fetch clients data from clients/clients.html
        const clientsResponse = await fetch('clients/clients.html');
        const clientsData = await clientsResponse.text();
        const parser = new DOMParser();
        const clientsDoc = parser.parseFromString(clientsData, 'text/html');
        const clients = Array.from(clientsDoc.querySelectorAll('.client-row'));

        // Calculate metrics
        const metrics = {
            invoices: {
                total: invoices.length,
                new: invoices.filter(inv => isNew(inv.date)).length,
                sent: invoices.filter(inv => inv.status === 'sent').length,
                paid: invoices.filter(inv => inv.status === 'paid').length,
                overdue: invoices.filter(inv => isOverdue(inv)).length,
                percentageChange: calculatePercentageChange(invoices)
            },
            revenue: {
                total: calculateTotalRevenue(invoices),
                byCategory: calculateRevenueByCategory(invoices),
                percentageChange: calculateRevenueChange(invoices)
            },
            expenses: {
                total: calculateTotalExpenses(invoices),
                byCategory: calculateExpensesByCategory(invoices),
                percentageChange: calculateExpensesChange(invoices)
            },
            clients: {
                total: clients.length,
                active: clients.filter(c => isActiveClient(c)).length,
                inactive: clients.filter(c => !isActiveClient(c)).length,
                new: clients.filter(c => isNewClient(c)).length,
                percentageChange: calculateClientsChange(clients)
            }
        };

        updateMetricsDisplay(metrics);
    } catch (error) {
        console.error('Error fetching metrics data:', error);
        displayErrorMessage('Failed to load metrics data');
    }
}

function updateMetricsDisplay(metrics) {
    // Update Invoices Card
    document.querySelector('#totalInvoicesCard .metric-value').textContent = metrics.invoices.total;
    document.querySelector('#totalInvoicesCard .metric-change').textContent = 
        `${metrics.invoices.percentageChange > 0 ? '+' : ''}${metrics.invoices.percentageChange}%`;
    
    // Update drilldown data for invoices
    updateInvoicesDrilldown(metrics.invoices);

    // Update Revenue Card
    document.querySelector('#revenueCard .metric-value').textContent = 
        formatCurrency(metrics.revenue.total);
    document.querySelector('#revenueCard .metric-change').textContent = 
        `${metrics.revenue.percentageChange > 0 ? '+' : ''}${metrics.revenue.percentageChange}%`;
    
    // Update drilldown data for revenue
    updateRevenueDrilldown(metrics.revenue);

    // Update Expenses Card
    document.querySelector('#expensesCard .metric-value').textContent = 
        formatCurrency(metrics.expenses.total);
    document.querySelector('#expensesCard .metric-change').textContent = 
        `${metrics.expenses.percentageChange > 0 ? '+' : ''}${metrics.expenses.percentageChange}%`;
    
    // Update drilldown data for expenses
    updateExpensesDrilldown(metrics.expenses);

    // Update Clients Card
    document.querySelector('#clientsCard .metric-value').textContent = metrics.clients.total;
    document.querySelector('#clientsCard .metric-change').textContent = 
        `${metrics.clients.percentageChange > 0 ? '+' : ''}${metrics.clients.percentageChange}%`;
    
    // Update drilldown data for clients
    updateClientsDrilldown(metrics.clients);
}

function updateInvoicesDrilldown(invoicesData) {
    const drilldownData = document.querySelector('#totalInvoicesDetail .drilldown-data');
    drilldownData.innerHTML = `
        <div class="drilldown-item">
            <span data-lang="newInvoices">New Invoices</span>
            <span>${invoicesData.new}</span>
        </div>
        <div class="drilldown-item">
            <span data-lang="sentInvoices">Sent Invoices</span>
            <span>${invoicesData.sent}</span>
        </div>
        <div class="drilldown-item">
            <span data-lang="paidInvoices">Paid Invoices</span>
            <span>${invoicesData.paid}</span>
        </div>
        <div class="drilldown-item">
            <span data-lang="overdueInvoices">Overdue Invoices</span>
            <span>${invoicesData.overdue}</span>
        </div>
    `;
}

// Helper functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

function isNew(date) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(date) >= thirtyDaysAgo;
}

function isOverdue(invoice) {
    return invoice.dueDate < new Date() && invoice.status !== 'paid';
}

function isActiveClient(clientElement) {
    return clientElement.querySelector('.status').textContent.trim().toLowerCase() === 'active';
}

function isNewClient(clientElement) {
    const dateStr = clientElement.querySelector('.registration-date').textContent;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return new Date(dateStr) >= thirtyDaysAgo;
}

// Initialize metrics data when the page loads
document.addEventListener('DOMContentLoaded', fetchMetricsData);

// Refresh metrics every 5 minutes
setInterval(fetchMetricsData, 300000);
