// Metrics Module
const MetricsModule = {
    async updateMetricsDisplay() {
    try {
        // Fetch all invoices
        const { data: invoices, error: invoiceError } = await window.supabase
            .from('invoices')
            .select('*');

        if (invoiceError) throw invoiceError;

        // --- Ensure overdue status is up to date before calculating metrics ---
        if (Array.isArray(invoices)) {
            if (typeof window.autoUpdateInvoiceStatuses === 'function') {
                window.autoUpdateInvoiceStatuses(invoices);
            }
        }

        // Calculate metrics using the same logic as the chart
        const totalInvoices = invoices.length;
        const totalPaid = invoices.filter(inv => inv.status === 'paid').length;
        
        // Use the same logic as getInvoiceStatusCounts for pending and overdue
        const now = new Date();
        let totalPending = 0;
        let totalOverdue = 0;
        
        invoices.forEach(inv => {
            if (inv.status === 'paid') {
                // Already counted above
            } else if (inv.status === 'overdue') {
                totalOverdue++;
            } else if (inv.status === 'pending') {
                if (inv.dueDate && new Date(inv.dueDate) < now) {
                    totalOverdue++;
                } else {
                    totalPending++;
                }
            }
            // Drafts are ignored
        });

        // Calculate percentages
            const paidPercentage = totalInvoices > 0 ? ((totalPaid / totalInvoices) * 100).toFixed(1) : '0.0';
            const pendingPercentage = totalInvoices > 0 ? ((totalPending / totalInvoices) * 100).toFixed(1) : '0.0';
            const overduePercentage = totalInvoices > 0 ? ((totalOverdue / totalInvoices) * 100).toFixed(1) : '0.0';

        // Update metrics cards
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

            console.log('Metrics updated successfully');
    } catch (error) {
        console.error('Error updating metrics:', error);
        // Set default values in case of error
            const setMetric = (selector, value) => {
                const el = document.querySelector(selector);
                if (el) el.textContent = value;
            };
            setMetric('#totalInvoicesCard .metric-value', '0');
            setMetric('#paidInvoicesCard .metric-value', '0');
            setMetric('#pendingInvoicesCard .metric-value', '0');
            setMetric('#overdueInvoicesCard .metric-value', '0');
        }
    },

    setupMetricsSubscription() {
    const subscription = window.supabase
        .channel('public:invoices')
        .on('postgres_changes', 
            {
                event: '*',
                schema: 'public',
                table: 'invoices'
            }, 
            () => {
                    this.updateMetricsDisplay();
            }
        )
        .subscribe();

    return () => {
        subscription.unsubscribe();
    };
    },

    async updateCharts() {
        try {
            // Fetch all invoices
            const { data: invoices, error: invoiceError } = await window.supabase
                .from('invoices')
                .select('*');

            if (invoiceError) throw invoiceError;

            // --- Ensure overdue status is up to date before charting ---
            if (Array.isArray(invoices)) {
                if (typeof window.autoUpdateInvoiceStatuses === 'function') {
                    window.autoUpdateInvoiceStatuses(invoices);
                }
                // Calculate weekly distribution
                const weeklyData = this.calculateWeeklyDistribution(invoices);
                if (typeof window.updateInvoiceDistributionChart === 'function') {
                    window.updateInvoiceDistributionChart('weekly', weeklyData);
                }
                // Calculate revenue by status (now with overdue updated)
                const counts = window.getInvoiceStatusCounts ? window.getInvoiceStatusCounts(invoices) : this.calculateRevenueByStatus(invoices);
                if (typeof window.updateRevenueByStatusChart === 'function') {
                    window.updateRevenueByStatusChart('monthly', counts);
                }
            }
        } catch (error) {
            console.error('Error updating charts:', error);
            this.resetCharts();
        }
    },

    calculateWeeklyDistribution(invoices) {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dailyCounts = Array(7).fill(0);
    
    invoices.forEach(invoice => {
        const date = new Date(invoice.issue_date);
        const dayIndex = date.getDay();
        dailyCounts[dayIndex]++;
    });

    // Rotate array to start from Monday
    const values = [...dailyCounts.slice(1), dailyCounts[0]];
    const labels = [...days.slice(1), days[0]];

    return { labels, values };
    },

    calculateRevenueByStatus(invoices) {
    return invoices.reduce((acc, invoice) => {
        const status = invoice.status || 'pending';
        const amount = parseFloat(invoice.total_amount) || 0;
        acc[status] = (acc[status] || 0) + amount;
        return acc;
    }, {});
    },

    resetCharts() {
    // Reset Invoice Distribution Chart
    if (window.invoiceDistributionChart) {
        window.invoiceDistributionChart.data.datasets[0].data = Array(7).fill(0);
        window.invoiceDistributionChart.update();
    }

    // Reset Revenue by Status Chart
    if (window.revenueByStatusChart) {
        window.revenueByStatusChart.data.datasets[0].data = Array(4).fill(0);
        window.revenueByStatusChart.update();
    }
    },

    setupChartSubscription() {
    const subscription = window.supabase
        .channel('public:invoices')
        .on('postgres_changes', 
            {
                event: '*',
                schema: 'public',
                table: 'invoices'
            }, 
            () => {
                    this.updateCharts();
            }
        )
        .subscribe();

    return () => {
        subscription.unsubscribe();
    };
}
};

// Export functions to global scope
window.updateMetricsDisplay = MetricsModule.updateMetricsDisplay.bind(MetricsModule);
window.setupMetricsSubscription = MetricsModule.setupMetricsSubscription.bind(MetricsModule);
window.updateCharts = MetricsModule.updateCharts.bind(MetricsModule);
window.setupChartSubscription = MetricsModule.setupChartSubscription.bind(MetricsModule);

async function updateInvoiceDistributionChart(period) {
    console.log('updateInvoiceDistributionChart called with:', {
        period: period,
        type: typeof period,
        stack: new Error().stack
    });

    try {
        if (!window.invoiceDistributionChart) {
            throw new Error('Chart instance not found');
        }

        // Type validation with detailed logging
        if (typeof period !== 'string') {
            console.error('Invalid period type:', {
                received: period,
                type: typeof period,
                stack: new Error().stack
            });
            return;
        }

        // Log right before toLowerCase()
        console.log('About to process period:', period);
        const lowerPeriod = period.toLowerCase();

        let labels = [];
        let data = [];

        switch (lowerPeriod) {
            case 'weekly':
                labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                data = [5, 7, 10, 8, 12, 3, 1];
                break;
            case 'monthly':
                labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
                data = [25, 38, 42, 35];
                break;
            case 'quarterly':
                labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                data = [42, 38, 55, 40, 45, 42, 38, 35, 42, 48, 50, 65];
                break;
            default:
                console.error('Invalid period value:', lowerPeriod);
                return;
        }

        window.invoiceDistributionChart.data.labels = labels;
        window.invoiceDistributionChart.data.datasets[0].data = data;
        window.invoiceDistributionChart.update();
        console.log('Chart updated successfully with period:', lowerPeriod);

    } catch (error) {
        console.error('Error updating distribution chart:', {
            error: error.message,
            period: period,
            stack: error.stack
        });
    }
}

function updateRevenueByStatusChart(period) {
    console.log('updateRevenueByStatusChart called with:', {
        period: period,
        type: typeof period,
        stack: new Error().stack
    });

    try {
        if (!window.revenueByStatusChart) {
            throw new Error('Chart instance not found');
        }

        // Type validation with detailed logging
        if (typeof period !== 'string') {
            console.error('Invalid period type:', {
                received: period,
                type: typeof period,
                stack: new Error().stack
            });
            return;
        }

        // Log right before toLowerCase()
        console.log('About to process period:', period);
        const lowerPeriod = period.toLowerCase();

        const data = lowerPeriod === 'monthly' ? [65, 15, 12, 8] : [78, 10, 8, 4];
        window.revenueByStatusChart.data.datasets[0].data = data;
        window.revenueByStatusChart.update();
        console.log('Chart updated successfully with period:', lowerPeriod);

    } catch (error) {
        console.error('Error updating revenue chart:', {
            error: error.message,
            period: period,
            stack: error.stack
        });
    }
}