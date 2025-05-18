// export.js
// Invoice CSV and XML (SAFT-MOZ) export utilities

function exportInvoicesAsCsv(invoices, periodLabel = 'all') {
    if (!Array.isArray(invoices) || invoices.length === 0) {
        alert('No invoices to export.');
        return;
    }
    const headers = [
        'Invoice Number', 'Client Name', 'Issue Date', 'Due Date', 'Currency', 'Subtotal', 'VAT', 'Total', 'Status'
    ];
    const rows = invoices.map(inv => [
        inv.invoiceNumber,
        inv.client?.customer_name || '',
        inv.issueDate,
        inv.dueDate,
        inv.currency,
        inv.subtotal,
        inv.totalVat,
        inv.total,
        inv.status
    ]);
    const csvContent = [headers, ...rows].map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoices_export_${periodLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Placeholder for XML/SAFT-MOZ export
function exportInvoicesAsXml(invoices, periodLabel = 'all') {
    // In a real implementation, use the official SAFT-MOZ schema and required fields
    // This is a placeholder for demonstration
    alert('SAFT-MOZ XML export is not implemented yet.');
    // Example: generateSAFTExport(invoices) and download as .xml
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.exportInvoicesAsCsv = exportInvoicesAsCsv;
    window.exportInvoicesAsXml = exportInvoicesAsXml;
}
