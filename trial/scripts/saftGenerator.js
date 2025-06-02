/**
 * Generate SAF-T export data in XML format for Mozambican tax authorities
 * @param {Object} invoiceData - The invoice data to include in the export
 * @returns {string} XML string in SAF-T MZ format
 */
function generateSAFTExport(invoiceData) {
    // Create the XML document with proper headers
    const xmlString = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:MZ_1.0">
    <Header>
        <AuditFileVersion>1.0</AuditFileVersion>
        <CompanyID>${escapeXml(invoiceData.company.nuit)}</CompanyID>
        <TaxRegistrationNumber>${escapeXml(invoiceData.company.nuit)}</TaxRegistrationNumber>
        <TaxAccountingBasis>F</TaxAccountingBasis>
        <CompanyName>${escapeXml(invoiceData.company.name)}</CompanyName>
        <CompanyAddress>
            <AddressDetail>${escapeXml(invoiceData.company.address)}</AddressDetail>
            <Country>MZ</Country>
        </CompanyAddress>
        <FiscalYear>${new Date(invoiceData.invoice.issueDate).getFullYear()}</FiscalYear>
        <StartDate>${formatDateForSAFT(new Date(invoiceData.invoice.issueDate))}</StartDate>
        <EndDate>${formatDateForSAFT(new Date(invoiceData.invoice.issueDate))}</EndDate>
        <CurrencyCode>${invoiceData.invoice.currency}</CurrencyCode>
        <DateCreated>${formatDateForSAFT(new Date())}</DateCreated>
        <TaxEntity>Global</TaxEntity>
        <ProductCompanyTaxID>${escapeXml(invoiceData.company.softwareCertNo)}</ProductCompanyTaxID>
        <SoftwareCertificateNumber>${escapeXml(invoiceData.company.softwareCertNo)}</SoftwareCertificateNumber>
        <ProductID>WALAKA Invoice Generator</ProductID>
        <ProductVersion>1.0</ProductVersion>
    </Header>
    <MasterFiles>
        <Customer>
            <CustomerID>${escapeXml(invoiceData.client.customerId || "CUST" + invoiceData.client.nuit)}</CustomerID>
            <AccountID>${escapeXml(invoiceData.client.accountId || "ACC" + invoiceData.client.nuit)}</AccountID>
            <CustomerTaxID>${escapeXml(invoiceData.client.nuit)}</CustomerTaxID>
            <CompanyName>${escapeXml(invoiceData.client.name)}</CompanyName>
            <BillingAddress>
                <AddressDetail>${escapeXml(invoiceData.client.address)}</AddressDetail>
                <Country>${escapeXml(invoiceData.client.taxCountry || "MZ")}</Country>
            </BillingAddress>
            <Email>${escapeXml(invoiceData.client.email || "")}</Email>
            <Telephone>${escapeXml(invoiceData.client.contact || "")}</Telephone>
        </Customer>
        <TaxTable>
            ${generateTaxTableEntries(invoiceData)}
        </TaxTable>
    </MasterFiles>
    <SourceDocuments>
        <SalesInvoices>
            <NumberOfEntries>1</NumberOfEntries>
            <TotalDebit>0.00</TotalDebit>
            <TotalCredit>${formatAmountForSAFT(invoiceData.invoice.totals.total)}</TotalCredit>
            <Invoice>
                <InvoiceNo>${escapeXml(invoiceData.invoice.type + " " + invoiceData.invoice.number)}</InvoiceNo>
                <DocumentStatus>
                    <InvoiceStatus>${invoiceData.invoice.documentStatus}</InvoiceStatus>
                    <InvoiceStatusDate>${formatDateTimeForSAFT(new Date(invoiceData.invoice.systemEntryDate))}</InvoiceStatusDate>
                    <SourceID>User</SourceID>
                    <SourceBilling>P</SourceBilling>
                </DocumentStatus>
                <Hash>${escapeXml(invoiceData.invoice.hash || generateInvoiceHash(invoiceData))}</Hash>
                <HashControl>1</HashControl>
                <Period>${new Date(invoiceData.invoice.issueDate).getMonth() + 1}</Period>
                <InvoiceDate>${formatDateForSAFT(new Date(invoiceData.invoice.issueDate))}</InvoiceDate>
                <InvoiceType>${invoiceData.invoice.type}</InvoiceType>
                ${invoiceData.invoice.sourceId ? `<SourceID>${escapeXml(invoiceData.invoice.sourceId)}</SourceID>` : ''}
                <SystemEntryDate>${formatDateTimeForSAFT(new Date(invoiceData.invoice.systemEntryDate))}</SystemEntryDate>
                <CustomerID>${escapeXml(invoiceData.client.customerId || "CUST" + invoiceData.client.nuit)}</CustomerID>
                ${generateLineItems(invoiceData)}
                <DocumentTotals>
                    <TaxPayable>${formatAmountForSAFT(invoiceData.invoice.totals.vat)}</TaxPayable>
                    <NetTotal>${formatAmountForSAFT(invoiceData.invoice.totals.subtotal)}</NetTotal>
                    <GrossTotal>${formatAmountForSAFT(invoiceData.invoice.totals.total)}</GrossTotal>
                    ${invoiceData.invoice.totals.discount > 0 ? 
                    `<Currency>
                        <CurrencyCode>${invoiceData.invoice.currency}</CurrencyCode>
                        <CurrencyAmount>${formatAmountForSAFT(invoiceData.invoice.totals.total)}</CurrencyAmount>
                        <ExchangeRate>1.00</ExchangeRate>
                    </Currency>` : ''}
                </DocumentTotals>
            </Invoice>
        </SalesInvoices>
    </SourceDocuments>
</AuditFile>`;

    return xmlString;
}

/**
 * Generate tax table entries based on the invoice items
 * @param {Object} invoiceData - The invoice data
 * @returns {string} XML string with tax table entries
 */
function generateTaxTableEntries(invoiceData) {
    const uniqueTaxRates = [...new Set(invoiceData.invoice.items.map(item => item.vat))];
    
    return uniqueTaxRates.map(taxRate => `
        <TaxTableEntry>
            <TaxType>IVA</TaxType>
            <TaxCountryRegion>MZ</TaxCountryRegion>
            <TaxCode>${getTaxCode(taxRate)}</TaxCode>
            <Description>IVA ${taxRate}%</Description>
            <TaxPercentage>${taxRate}</TaxPercentage>
        </TaxTableEntry>
    `).join('');
}

/**
 * Map tax rate to appropriate Mozambican tax code
 * @param {number} taxRate - The tax rate percentage
 * @returns {string} The tax code
 */
function getTaxCode(taxRate) {
    switch (taxRate) {
        case 0:
            return "ISE";  // Isento (Exempt)
        case 16:
            return "NOR";  // Normal rate
        case 5:
            return "RED";  // Reduced rate
        default:
            return "OUT";  // Other rates
    }
}

/**
 * Generate line items XML for the invoice
 * @param {Object} invoiceData - The invoice data
 * @returns {string} XML string with line items
 */
function generateLineItems(invoiceData) {
    return invoiceData.invoice.items.map((item, index) => {
        const lineNumber = index + 1;
        const productCode = `PROD${String(lineNumber).padStart(3, '0')}`;
        
        return `
        <Line>
            <LineNumber>${lineNumber}</LineNumber>
            <ProductCode>${productCode}</ProductCode>
            <ProductDescription>${escapeXml(item.description)}</ProductDescription>
            <Quantity>${item.quantity}</Quantity>
            <UnitPrice>${formatAmountForSAFT(item.price)}</UnitPrice>
            <TaxPointDate>${formatDateForSAFT(new Date(invoiceData.invoice.issueDate))}</TaxPointDate>
            <Description>${escapeXml(item.description)}</Description>
            <CreditAmount>${formatAmountForSAFT(item.total)}</CreditAmount>
            <Tax>
                <TaxType>IVA</TaxType>
                <TaxCountryRegion>MZ</TaxCountryRegion>
                <TaxCode>${getTaxCode(item.vat)}</TaxCode>
                <TaxPercentage>${item.vat}</TaxPercentage>
            </Tax>
            <TaxExemptionReason>${item.vat === 0 ? 'M99' : ''}</TaxExemptionReason>
            <SettlementAmount>${item.vat === 0 ? formatAmountForSAFT(item.total) : '0.00'}</SettlementAmount>
        </Line>`;
    }).join('');
}

/**
 * Format date for SAF-T (YYYY-MM-DD)
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
function formatDateForSAFT(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

/**
 * Format date and time for SAF-T (YYYY-MM-DDThh:mm:ss)
 * @param {Date} date - The date to format
 * @returns {string} Formatted date and time string
 */
function formatDateTimeForSAFT(date) {
    const dateStr = formatDateForSAFT(date);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${dateStr}T${hours}:${minutes}:${seconds}`;
}

/**
 * Format amount for SAF-T (2 decimal places, period as decimal separator)
 * @param {number} amount - The amount to format
 * @returns {string} Formatted amount string
 */
function formatAmountForSAFT(amount) {
    return Number(amount).toFixed(2);
}

/**
 * Escape special characters in XML content
 * @param {string} str - The string to escape
 * @returns {string} Escaped string
 */
function escapeXml(str) {
    if (!str) return '';
    
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Download SAF-T file for the invoice
 * @param {Object} invoiceData - The invoice data
 */
function downloadSAFTFile(invoiceData) {
    const xmlContent = generateSAFTExport(invoiceData);
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAFT_${invoiceData.invoice.number.replace(/\s+/g, '_')}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}