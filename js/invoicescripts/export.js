// export.js
// Invoice CSV and XML (SAFT-MOZ) export utilities

async function exportInvoicesAsCsv(period = 'all') {
    try {
        // Show loading state
        const exportBtn = document.getElementById('exportCsvBtn');
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
        }

        // Get date range based on period
        const { startDate, endDate } = getDateRangeFromPeriod(period);
        
        // Fetch invoices from Supabase
        let queryBuilder = window.supabase
            .from('invoices')
            .select(`
                invoiceNumber,
                customer_name,
                issue_date,
                due_date,
                currency,
                subtotal,
                total_vat,
                total_amount,
                status,
                payment_method,
                payment_date,
                notes
            `);

        // Apply date filter if not 'all'
        if (period !== 'all') {
            queryBuilder = queryBuilder
                .gte('issue_date', startDate.toISOString())
                .lte('issue_date', endDate.toISOString());
        }

        const { data: invoices, error } = await queryBuilder;

        if (error) throw error;

        if (!invoices || invoices.length === 0) {
            showNotification('No invoices found for the selected period.');
            return;
        }

        // Prepare CSV data
        const headers = [
            'Invoice Number',
            'Client Name',
            'Issue Date',
            'Due Date',
            'Currency',
            'Subtotal',
            'VAT',
            'Total',
            'Status',
            'Payment Method',
            'Payment Date',
            'Notes'
        ];

        const rows = invoices.map(inv => [
            inv.invoiceNumber,
            inv.customer_name,
            formatDate(inv.issue_date),
            formatDate(inv.due_date),
            inv.currency,
            formatNumber(inv.subtotal),
            formatNumber(inv.total_vat),
            formatNumber(inv.total_amount),
            inv.status,
            inv.payment_method || '',
            inv.payment_date ? formatDate(inv.payment_date) : '',
            inv.notes || ''
        ]);

        // Generate CSV content
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\r\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoices_export_${period}_${formatDate(new Date())}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification('CSV export completed successfully');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Error exporting invoices: ' + error.message);
    } finally {
        // Reset button state
        const exportBtn = document.getElementById('exportCsvBtn');
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<i class="fas fa-file-csv"></i> Export CSV';
        }
    }
}

async function exportInvoicesAsSaft(period = 'all') {
    try {
        // Show loading state
        const exportBtn = document.getElementById('exportSaftBtn');
        if (exportBtn) {
            exportBtn.disabled = true;
            exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
        }

        // Get date range based on period
        const { startDate, endDate } = getDateRangeFromPeriod(period);
        
        // Fetch invoices from Supabase
        let queryBuilder = window.supabase
            .from('invoices')
            .select(`
                *,
                client:clients(*)
            `);

        // Apply date filter if not 'all'
        if (period !== 'all' && period.period !== 'custom') {
            queryBuilder = queryBuilder
                .gte('issue_date', startDate.toISOString())
                .lte('issue_date', endDate.toISOString());
        } else if (period.period === 'custom') {
             queryBuilder = queryBuilder
                .gte('issue_date', new Date(period.startDate).toISOString())
                .lte('issue_date', new Date(period.endDate).toISOString());
        }

        const { data: invoices, error } = await queryBuilder;

        if (error) throw error;

        if (!invoices || invoices.length === 0) {
            showNotification('No invoices found for the selected period.');
            return;
        }

        // Generate SAFT XML
        const saftXml = generateSaftXml(invoices, startDate, endDate);

        // Create and download file
        const blob = new Blob([saftXml], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `SAFT_${formatDate(new Date())}.xml`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification('SAFT file export completed successfully');
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Error exporting SAFT file: ' + error.message);
    } finally {
        // Reset button state
        const exportBtn = document.getElementById('exportSaftBtn');
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<i class="fas fa-file-code"></i> Export SAFT';
        }
    }
}

function generateSaftXml(invoices, startDate, endDate) {
    // This is a basic SAFT-MOZ XML structure
    // You should implement the full SAFT-MOZ schema according to official documentation
    return `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04_01">
    <Header>
        <AuditFileVersion>1.04_01</AuditFileVersion>
        <CompanyID>YOUR_COMPANY_ID</CompanyID>
        <TaxRegistrationNumber>YOUR_TAX_ID</TaxRegistrationNumber>
        <PeriodStart>${formatDate(startDate)}</PeriodStart>
        <PeriodEnd>${formatDate(endDate)}</PeriodEnd>
        <CurrencyCode>MZN</CurrencyCode>
        <DateCreated>${formatDate(new Date())}</DateCreated>
        <CompanyName>YOUR_COMPANY_NAME</CompanyName>
    </Header>
    <SourceDocuments>
        <SalesInvoices>
            ${invoices.map(invoice => `
            <Invoice>
                <InvoiceNo>${invoice.invoiceNumber}</InvoiceNo>
                <InvoiceDate>${formatDate(invoice.issue_date)}</InvoiceDate>
                <CustomerID>${invoice.client?.customer_id || ''}</CustomerID>
                <CustomerName>${invoice.client?.customer_name || ''}</CustomerName>
                <TaxRegistrationNumber>${invoice.client?.customer_tax_id || ''}</TaxRegistrationNumber>
                <DocumentStatus>${invoice.status}</DocumentStatus>
                <TotalNet>${invoice.subtotal}</TotalNet>
                <TotalTax>${invoice.total_vat}</TotalTax>
                <TotalGross>${invoice.total_amount}</TotalGross>
            </Invoice>
            `).join('')}
        </SalesInvoices>
    </SourceDocuments>
</AuditFile>`;
}

function getDateRangeFromPeriod(period) {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
        case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
        case 'semester':
            startDate.setMonth(startDate.getMonth() - 6);
            break;
        case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        default: // 'all'
            startDate.setFullYear(2000); // A reasonable start date
    }

    return { startDate, endDate };
}

function formatDate(date) {
    if (!date) return '';
    return date.toISOString().split('T')[0];
}

function formatNumber(number) {
    return Number(number).toFixed(2);
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.exportInvoicesAsCsv = exportInvoicesAsCsv;
    window.exportInvoicesAsSaft = exportInvoicesAsSaft;
}
