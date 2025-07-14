// Fetch metrics data from Supabase
async function fetchMetricsData() {
    try {
        const { data: invoices, error: invoicesError } = await window.supabase
            .from('invoices')
            .select('*');

        if (invoicesError) throw invoicesError;

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

        return metrics;
    } catch (error) {
        console.error('Error fetching metrics data:', error);
        throw error;
    }
}

function updateMetricsDisplay(metrics) {
    // Update Invoices Card
    document.querySelector('#totalInvoicesCard .metric-value').textContent = metrics.invoices.total;
    document.querySelector('#totalInvoicesCard .metric-change').textContent = formatPercentage(metrics.invoices.percentageChange);
    
    // Only update drilldown data for invoices (sent invoices)
    updateInvoicesDrilldown(metrics.invoices);

    // (No updates for revenue, expenses, or clients drilldown)
    // document.querySelector('#revenueCard .metric-value').textContent = 
    //     formatCurrency(metrics.revenue.total);
    // document.querySelector('#revenueCard .metric-change').textContent = 
    //     `${metrics.revenue.percentageChange > 0 ? '+' : ''}${metrics.revenue.percentageChange}%`;
    // updateRevenueDrilldown(metrics.revenue);
    // document.querySelector('#expensesCard .metric-value').textContent = 
    //     formatCurrency(metrics.expenses.total);
    // document.querySelector('#expensesCard .metric-change').textContent = 
    //     `${metrics.expenses.percentageChange > 0 ? '+' : ''}${metrics.expenses.percentageChange}%`;
    // updateExpensesDrilldown(metrics.expenses);
    // document.querySelector('#clientsCard .metric-value').textContent = metrics.clients.total;
    // document.querySelector('#clientsCard .metric-change').textContent = 
    //     `${metrics.clients.percentageChange > 0 ? '+' : ''}${metrics.clients.percentageChange}%`;
    // updateClientsDrilldown(metrics.clients);
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

function updateRevenueDrilldown(revenueData) {
    const drilldownData = document.querySelector('#revenueDetail .drilldown-data');
    if (!drilldownData) return;
    if (revenueData.categories) {
        drilldownData.innerHTML = Object.entries(revenueData.categories).map(
            ([cat, value]) => `
                <div class="drilldown-item">
                    <span>${cat}</span>
                    <span>${formatCurrency(value)}</span>
                </div>
            `
        ).join('');
    } else {
        drilldownData.innerHTML = `
            <div class="drilldown-item">
                <span>Revenue</span>
                <span>${formatCurrency(revenueData.total)}</span>
            </div>
        `;
    }
}

// Helper functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: 'MZN',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatPercentage(val) {
    if (val > 0) return `+${val.toFixed(1)}%`;
    if (val < 0) return `${val.toFixed(1)}%`;
    return '0%';
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

// Calculation functions
function calculatePercentageChange(invoices) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthInvoices = invoices.filter(inv => {
        const date = new Date(inv.issue_date);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const lastMonthInvoices = invoices.filter(inv => {
        const date = new Date(inv.issue_date);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });
    const current = currentMonthInvoices.length;
    const last = lastMonthInvoices.length;
    if (last === 0 && current === 0) return 0;
    if (last === 0 && current > 0) return 100;
    return Number(((current - last) / last * 100).toFixed(1));
}

function calculateTotalRevenue(invoices) {
    return invoices.reduce((total, inv) => total + (Number(inv.total) || 0), 0);
}

function calculateRevenueByCategory(invoices) {
    const categories = {};
    invoices.forEach(inv => {
        const category = inv.category || 'Other';
        categories[category] = (categories[category] || 0) + (Number(inv.total) || 0);
    });
    return categories;
}

function calculateRevenueChange(invoices) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthRevenue = invoices
        .filter(inv => {
            const date = new Date(inv.issue_date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((total, inv) => total + (Number(inv.total) || 0), 0);
    const lastMonthRevenue = invoices
        .filter(inv => {
            const date = new Date(inv.issue_date);
            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
        })
        .reduce((total, inv) => total + (Number(inv.total) || 0), 0);
    if (lastMonthRevenue === 0 && currentMonthRevenue === 0) return 0;
    if (lastMonthRevenue === 0 && currentMonthRevenue > 0) return 100;
    return Number(((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1));
}

function calculateTotalExpenses(invoices) {
    // For now, return 0 as we don't have expenses data
    return 0;
}

function calculateExpensesByCategory(invoices) {
    // For now, return empty object as we don't have expenses data
    return {};
}

function calculateExpensesChange(invoices) {
    // For now, return 0 as we don't have expenses data
    return 0;
}

function calculateClientsChange(clients) {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const currentMonthClients = clients.filter(c => {
        const date = new Date(c.querySelector('.registration-date').textContent);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const lastMonthClients = clients.filter(c => {
        const date = new Date(c.querySelector('.registration-date').textContent);
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });
    const current = currentMonthClients.length;
    const last = lastMonthClients.length;
    if (last === 0 && current === 0) return 0;
    if (last === 0 && current > 0) return 100;
    return Number(((current - last) / last * 100).toFixed(1));
}

// Initialize metrics data when the page loads
document.addEventListener('DOMContentLoaded', fetchMetricsData);

// Refresh metrics every 5 minutes
setInterval(fetchMetricsData, 300000);
