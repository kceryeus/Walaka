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
        let startDate, endDate;
        
        if (typeof period === 'object' && period.period === 'custom') {
            startDate = new Date(period.startDate);
            endDate = new Date(period.endDate);
        } else {
            const dateRange = getDateRangeFromPeriod(period);
            startDate = dateRange.startDate;
            endDate = dateRange.endDate;
        }
        
        // Fetch invoices from Supabase
        let queryBuilder = window.supabase
            .from('invoices')
            .select(`
                *
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

        // Prepare CSV data (Portuguese/SAFT headers and order)
        const headers = [
            'NUIT',
            'MÊS',
            'ID Documento',
            'Tipo',
            'Série',
            'Número',
            'Série/Número',
            'Estado',
            'Referência a Documento de Origem',
            'Referência a Factura',
            'Data Emissão',
            'Data Vencimento',
            'NUIT Cliente',
            'Nome do Cliente',
            'Subtotal S/IVA',
            'Outro S/IVA',
            'IVA',
            'Razão de Isenção de IVA',
            'Total Retenção',
            'Total Desconto',
            'Total',
            'Valor Recebido',
            'IVA (%)',
            'Valor do Imposto',
            'Desconto',
            'Valor Total sem Imposto',
            'Total Incluindo Imposto',
            'Moeda',
            'Taxa Câmbio'
        ];

        function formatDatePt(date) {
            if (!date) return '';
            const d = new Date(date);
            if (isNaN(d)) return '';
            return d.toISOString().slice(0, 10);
        }

        function safe(val, def = '') {
            return val === undefined || val === null ? def : val;
        }

        const csvContent = [
            headers.join(';'),
            ...invoices.map(inv => [
                safe(inv.nuit, ''), // NUIT
                safe(inv.mes, ''), // MÊS
                safe(inv.id_documento, ''), // ID Documento
                safe(inv.tipo, ''), // Tipo
                safe(inv.serie, ''), // Série
                safe(inv.numero, ''), // Número
                (safe(inv.serie, '') && safe(inv.numero, '')) ? `${inv.serie}/${String(inv.numero).padStart(4, '0')}` : '', // Série/Número
                safe(inv.estado, ''), // Estado
                safe(inv.referencia_origem, ''), // Referência a Documento de Origem
                safe(inv.referencia_factura, ''), // Referência a Factura
                formatDatePt(inv.issue_date), // Data Emissão
                formatDatePt(inv.due_date), // Data Vencimento
                safe(inv.nuit_cliente, ''), // NUIT Cliente
                safe(inv.customer_name, inv.client_name || ''), // Nome do Cliente
                safe(inv.subtotal_sem_iva, ''), // Subtotal S/IVA
                safe(inv.outro_sem_iva, ''), // Outro S/IVA
                safe(inv.iva, ''), // IVA
                safe(inv.razao_isencao_iva, ''), // Razão de Isenção de IVA
                safe(inv.total_retencao, ''), // Total Retenção
                safe(inv.total_desconto, ''), // Total Desconto
                safe(inv.total, inv.total_amount || ''), // Total
                safe(inv.valor_recebido, ''), // Valor Recebido
                safe(inv.iva_percent, ''), // IVA (%)
                safe(inv.valor_imposto, ''), // Valor do Imposto
                safe(inv.desconto, ''), // Desconto
                safe(inv.valor_total_sem_imposto, ''), // Valor Total sem Imposto
                safe(inv.total_incluindo_imposto, ''), // Total Incluindo Imposto
                safe(inv.currency, ''), // Moeda
                safe(inv.currency_rate, '') // Taxa Câmbio
            ].join(';'))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoices_SAFT_${formatDate(new Date())}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Reset button state
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<i class="fas fa-file-csv"></i> Export CSV';
        }

        showNotification('CSV export completed successfully');
    } catch (error) {
        console.error('Error exporting CSV:', error);
        showNotification('Error exporting CSV: ' + error.message);
        
        // Reset button state on error
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
        let startDate, endDate;
        
        if (typeof period === 'object' && period.period === 'custom') {
            startDate = new Date(period.startDate);
            endDate = new Date(period.endDate);
        } else {
            const dateRange = getDateRangeFromPeriod(period);
            startDate = dateRange.startDate;
            endDate = dateRange.endDate;
        }
        
        // Fetch invoices from Supabase
        let queryBuilder = window.supabase
            .from('invoices')
            .select(`
                *,
                client:clients(*)
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

        // Reset button state
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<i class="fas fa-file-code"></i> Export SAFT';
        }

        showNotification('SAFT export completed successfully');
    } catch (error) {
        console.error('Error exporting SAFT:', error);
        showNotification('Error exporting SAFT: ' + error.message);
        
        // Reset button state on error
        const exportBtn = document.getElementById('exportSaftBtn');
        if (exportBtn) {
            exportBtn.disabled = false;
            exportBtn.innerHTML = '<i class="fas fa-file-code"></i> Export SAFT';
        }
    }
}

function generateSaftXml(invoices, startDate, endDate) {
    // Helper function for safe values (same as CSV export)
    function safe(val, def = '') {
        return val === undefined || val === null ? def : val;
    }

    function formatDatePt(date) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d)) return '';
        return d.toISOString().slice(0, 10);
    }

    // This is a basic SAFT-MOZ XML structure with Portuguese/SAFT fields
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
                <!-- Portuguese/SAFT Fields -->
                <NUIT>${safe(invoice.nuit, '')}</NUIT>
                <MES>${safe(invoice.mes, '')}</MES>
                <IDDocumento>${safe(invoice.id_documento, '')}</IDDocumento>
                <Tipo>${safe(invoice.tipo, '')}</Tipo>
                <Serie>${safe(invoice.serie, '')}</Serie>
                <Numero>${safe(invoice.numero, '')}</Numero>
                <SerieNumero>${(safe(invoice.serie, '') && safe(invoice.numero, '')) ? `${invoice.serie}/${String(invoice.numero).padStart(4, '0')}` : ''}</SerieNumero>
                <Estado>${safe(invoice.estado, '')}</Estado>
                <ReferenciaDocumentoOrigem>${safe(invoice.referencia_origem, '')}</ReferenciaDocumentoOrigem>
                <ReferenciaFactura>${safe(invoice.referencia_factura, '')}</ReferenciaFactura>
                <DataEmissao>${formatDatePt(invoice.issue_date)}</DataEmissao>
                <DataVencimento>${formatDatePt(invoice.due_date)}</DataVencimento>
                <NUITCliente>${safe(invoice.nuit_cliente, '')}</NUITCliente>
                <NomeCliente>${safe(invoice.customer_name, invoice.client_name || '')}</NomeCliente>
                <SubtotalSemIVA>${safe(invoice.subtotal_sem_iva, '')}</SubtotalSemIVA>
                <OutroSemIVA>${safe(invoice.outro_sem_iva, '')}</OutroSemIVA>
                <IVA>${safe(invoice.iva, '')}</IVA>
                <RazaoIsencaoIVA>${safe(invoice.razao_isencao_iva, '')}</RazaoIsencaoIVA>
                <TotalRetencao>${safe(invoice.total_retencao, '')}</TotalRetencao>
                <TotalDesconto>${safe(invoice.total_desconto, '')}</TotalDesconto>
                <Total>${safe(invoice.total, invoice.total_amount || '')}</Total>
                <ValorRecebido>${safe(invoice.valor_recebido, '')}</ValorRecebido>
                <IVAPercent>${safe(invoice.iva_percent, '')}</IVAPercent>
                <ValorImposto>${safe(invoice.valor_imposto, '')}</ValorImposto>
                <Desconto>${safe(invoice.desconto, '')}</Desconto>
                <ValorTotalSemImposto>${safe(invoice.valor_total_sem_imposto, '')}</ValorTotalSemImposto>
                <TotalIncluindoImposto>${safe(invoice.total_incluindo_imposto, '')}</TotalIncluindoImposto>
                <Moeda>${safe(invoice.currency, '')}</Moeda>
                <TaxaCambio>${safe(invoice.currency_rate, '')}</TaxaCambio>
                
                <!-- Legacy fields for backward compatibility -->
                <InvoiceNo>${safe(invoice.invoiceNumber, '')}</InvoiceNo>
                <InvoiceDate>${formatDatePt(invoice.issue_date)}</InvoiceDate>
                <CustomerID>${safe(invoice.client_id, '')}</CustomerID>
                <CustomerName>${safe(invoice.customer_name, invoice.client_name || '')}</CustomerName>
                <TaxRegistrationNumber>${safe(invoice.nuit_cliente, '')}</TaxRegistrationNumber>
                <DocumentStatus>${safe(invoice.status, '')}</DocumentStatus>
                <TotalNet>${safe(invoice.subtotal, '')}</TotalNet>
                <TotalTax>${safe(invoice.vat_amount, '')}</TotalTax>
                <TotalGross>${safe(invoice.total_amount, '')}</TotalGross>
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
        case 'today':
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'week':
            startDate.setDate(startDate.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
        case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
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
