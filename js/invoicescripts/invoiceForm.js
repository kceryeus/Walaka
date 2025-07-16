// Invoice Form Module
class InvoiceForm {
    constructor() {
        this.supabase = window.supabase;
        this.exchangeRates = { MZN: 1 };
        this.currentCurrency = 'MZN';
        this.currentRate = 1;
        this.fetchingRate = false;
        this.initializeDateFields();
        this.setupCurrencyListener();
    }

    initializeDateFields() {
        const issueDate = document.getElementById('issueDate');
        const dueDate = document.getElementById('dueDate');
        
        if (issueDate && dueDate) {
            // Set issue date to today's date if not already set
            if (!issueDate.value) {
                const today = new Date();
                const formattedDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
                issueDate.value = formattedDate;
            }
            
            // Set due date based on payment terms
            this.updateDueDate();
        }
    }

    updateDueDate() {
        const issueDate = document.getElementById('issueDate');
        const dueDate = document.getElementById('dueDate');
        const paymentTerms = document.getElementById('paymentTerms');
        
        if (issueDate && dueDate && paymentTerms) {
            const selectedDate = new Date(issueDate.value);
            
            if (isNaN(selectedDate.getTime())) {
                return; // Invalid date
            }
            
            let daysToAdd = 30; // Default to Net-30
            
            switch (paymentTerms.value) {
                case 'net15':
                    daysToAdd = 15;
                    break;
                case 'net30':
                    daysToAdd = 30;
                    break;
                case 'net60':
                    daysToAdd = 60;
                    break;
                // For 'custom', let the user enter manually
                case 'custom':
                    return;
            }
            
            const newDueDate = new Date(selectedDate);
            newDueDate.setDate(newDueDate.getDate() + daysToAdd);
            
            const formattedDueDate = newDueDate.toISOString().split('T')[0]; // YYYY-MM-DD format
            dueDate.value = formattedDueDate;
        }
    }

    async resetInvoiceForm() {
        const form = document.getElementById('invoiceForm');
        if (form) {
            form.reset();
            // Set currency to MZN by default
            const currencySelect = document.getElementById('currency');
            if (currencySelect) {
                currencySelect.value = 'MZN';
            }
            // Clear all invoice items except the first row
            const itemsTableBody = document.querySelector('#itemsTable tbody');
            const rows = itemsTableBody.querySelectorAll('.item-row');
            for (let i = 1; i < rows.length; i++) {
                rows[i].remove();
            }
            // Reset the first row
            const firstRow = itemsTableBody.querySelector('.item-row');
            if (firstRow) {
                const inputs = firstRow.querySelectorAll('input');
                inputs.forEach(input => {
                    if (input.classList.contains('item-quantity')) {
                        input.value = '1';
                    } else if (input.classList.contains('item-price')) {
                        input.value = '0.00';
                    } else {
                        input.value = '';
                    }
                });
                firstRow.querySelector('.item-vat').textContent = '0.00';
                firstRow.querySelector('.item-total').textContent = '0.00';
            }
            document.getElementById('subtotal').textContent = '0.00';
            document.getElementById('totalVat').textContent = '0.00';
            document.getElementById('invoiceTotal').textContent = '0.00';
            this.initializeDateFields();
            
            // Reset pagination if available
            if (window.invoiceItemsPagination && typeof window.invoiceItemsPagination.resetPagination === 'function') {
                window.invoiceItemsPagination.resetPagination();
            }
            
            // --- Always generate a new unique invoice number for new invoice ---
            const invoiceNumberField = document.getElementById('invoiceNumber');
            // Placeholder: check for edit mode (replace with your real edit mode check)
            const isEditMode = form.dataset.editMode === 'true';
            console.log('[InvoiceForm] resetInvoiceForm called. isEditMode:', isEditMode);
            if (invoiceNumberField && !isEditMode) {
                invoiceNumberField.value = '';
                invoiceNumberField.dataset.generated = '';
                console.log('[InvoiceForm] About to generate new invoice number...');
                try {
                    const generator = new window.InvoiceNumberGenerator();
                    // Fetch user_id from Supabase session
                    let userId = null;
                    try {
                        const session = await window.supabase.auth.getSession();
                        userId = session.data?.session?.user?.id;
                        console.log('[InvoiceForm] Got userId:', userId);
                    } catch (e) {
                        console.error('[InvoiceForm] Could not fetch user session:', e);
                    }
                    let serie = document.getElementById('serie')?.value || 'A';
                    console.log('[InvoiceForm] Using serie:', serie);
                    if (!userId) throw new Error('User not authenticated. Please log in.');
                    generator.getNextNumber(userId, serie).then(newInvoiceNumber => {
                        console.log('[InvoiceForm] Setting invoice number to:', newInvoiceNumber);
                        invoiceNumberField.value = newInvoiceNumber;
                        invoiceNumberField.dataset.generated = true;
                    }).catch(err => {
                        console.error('[InvoiceForm] Error generating invoice number:', err);
                        invoiceNumberField.value = '';
                        window.showNotification('Error generating invoice number');
                    });
                } catch (err) {
                    console.error('[InvoiceForm] Error in invoice number generation block:', err);
                    invoiceNumberField.value = '';
                    window.showNotification('Error generating invoice number');
                }
            } else if (invoiceNumberField && isEditMode) {
                console.log('[InvoiceForm] Edit mode detected, not generating new invoice number.');
            }
        }
    }

    collectInvoiceData() {
        try {
            console.log('Starting to collect invoice data...');
            
            // Get required form elements with null checks
            const clientList = document.getElementById('client-list');
            const invoiceNumber = document.getElementById('invoiceNumber');
            const issueDate = document.getElementById('issueDate');
            const dueDate = document.getElementById('dueDate');
            const currency = document.getElementById('currency');
            const notes = document.getElementById('notes');
            const paymentTerms = document.getElementById('paymentTerms');
            const serie = document.getElementById('serie')?.value || '';
            if (!serie) serie = 'A';
            const discountType = document.getElementById('discountType')?.value || 'none';
            const discountValue = parseFloat(document.getElementById('discountValue')?.value) || 0;

            console.log('Form elements found:', {
                clientList: !!clientList,
                invoiceNumber: !!invoiceNumber,
                issueDate: !!issueDate,
                dueDate: !!dueDate,
                currency: !!currency,
                notes: !!notes,
                paymentTerms: !!paymentTerms,
                serie: !!serie,
                discountType: !!discountType,
                discountValue: !!discountValue
            });

            // Validate all required fields exist
            if (!clientList || !invoiceNumber || !issueDate || !dueDate || !currency) {
                throw new Error('Required form fields are missing');
            }

            // Get client data
            const clientName = clientList.value || '';
            const clientEmail = document.getElementById('clientEmail')?.value || '';
            const clientAddress = document.getElementById('clientAddress')?.value || '';
            const clientTaxId = document.getElementById('clientTaxId')?.value || '';
            const clientContact = document.getElementById('clientContact')?.value || '';

            console.log('Client data collected:', {
                name: clientName,
                email: clientEmail,
                address: clientAddress,
                taxId: clientTaxId,
                contact: clientContact
            });

            // Get company data from settings or use defaults
            const companyData = window.companySettings || {
                name: 'Your Company Name',
                address: 'Your Company Address',
                email: 'info@yourcompany.com',
                phone: '+258 XX XXX XXXX',
                nuit: '123456789',
                logo: '' // Placeholder for logo URL
            };

            console.log('Company data:', companyData);

            // Collect items - use pagination module if available
            const items = [];
            let itemRows = [];
            
            if (window.invoiceItemsPagination && typeof window.invoiceItemsPagination.getAllItemsForPDF === 'function') {
                // Use pagination module to get all items
                itemRows = window.invoiceItemsPagination.getAllItemsForPDF();
            } else {
                // Fallback to direct DOM query
                itemRows = document.querySelectorAll('.item-row');
            }

            let hasDiscount = false;
            let subtotal = 0;
            let discountAmount = 0;
            let subtotalAfterDiscount = 0;
            let totalVat = 0;
            let total = 0;
            let invoiceDiscountType = 'none';
            let invoiceDiscountValue = 0;

            itemRows.forEach((row, index) => {
                const description = row.querySelector('.item-description')?.value;
                const quantity = parseAmount(row.querySelector('.item-quantity')?.value) || 0;
                const price = parseAmount(row.querySelector('.item-price')?.value) || 0;
                // Discount logic
                let itemDiscountType = row.querySelector('.item-discount-type')?.value || 'none';
                let itemDiscountValue = parseAmount(row.querySelector('.item-discount-value')?.value) || 0;
                let itemDiscount = 0;
                if (itemDiscountType === 'percent') {
                    itemDiscount = price * quantity * (itemDiscountValue / 100);
                } else if (itemDiscountType === 'fixed') {
                    itemDiscount = itemDiscountValue;
                }
                if (itemDiscountType !== 'none' && itemDiscountValue > 0) {
                    hasDiscount = true;
                }
                const discountedSubtotal = Math.max(price * quantity - itemDiscount, 0);
                // VAT rate logic
                let vatRate = 0.16; // default
                const vatSelect = row.querySelector('.item-vat-rate');
                if (vatSelect) {
                    if (vatSelect.value === 'other') {
                        const vatOther = row.querySelector('.item-vat-other');
                        vatRate = vatOther && vatOther.value ? parseFloat(vatOther.value) / 100 : 0;
                    } else {
                        vatRate = parseFloat(vatSelect.value);
                    }
                }
                const vat = discountedSubtotal * vatRate;
                const itemTotal = discountedSubtotal + vat;

                if (description && quantity > 0 && price >= 0) {
                    items.push({
                        description,
                        quantity,
                        price,
                        discountType: itemDiscountType,
                        discountValue: itemDiscountValue,
                        discountedSubtotal,
                        vatRate,
                        vat,
                        total: itemTotal
                    });
                    subtotal += price * quantity;
                    discountAmount += itemDiscount;
                    subtotalAfterDiscount += discountedSubtotal;
                    totalVat += vat;
                    total += itemTotal;
                }
            });

            // If all items have the same discount type/value, set at invoice level, else 'none'/0
            if (items.length > 0) {
                const allTypes = Array.from(new Set(items.map(i => i.discountType)));
                const allValues = Array.from(new Set(items.map(i => i.discountValue)));
                if (allTypes.length === 1 && allValues.length === 1) {
                    invoiceDiscountType = allTypes[0];
                    invoiceDiscountValue = allValues[0];
                }
            }
            if (!hasDiscount) {
                invoiceDiscountType = 'none';
                invoiceDiscountValue = 0;
            }

            // Construct the complete invoice data object
            const invoiceData = {
                invoiceNumber: invoiceNumber.value,
                serie,
                issueDate: issueDate.value,
                dueDate: dueDate.value,
                currency: currency.value || 'MZN',
                status: 'pending',
                client: {
                    name: clientName,
                    email: clientEmail,
                    address: clientAddress,
                    taxId: clientTaxId,
                    contact: clientContact
                },
                company: companyData,
                paymentTerms: paymentTerms.value || 'net30',
                notes: notes?.value || '',
                items: items,
                subtotal,
                discountType: invoiceDiscountType,
                discountValue: invoiceDiscountValue,
                discountAmount,
                subtotalAfterDiscount,
                totalVat,
                total
            };

            console.log('Complete invoice data:', invoiceData);

            // Validate required fields have values
            if (!invoiceData.invoiceNumber || !invoiceData.client.name) {
                throw new Error('Invoice number and client name are required');
            }

            return invoiceData;
        } catch (error) {
            console.error('Error collecting invoice data:', error);
            throw new Error('Failed to collect invoice data: ' + error.message);
        }
    }

    async saveInvoice() {
        try {
            const invoiceData = this.collectInvoiceData();
            // Always fetch the latest exchange rate for non-MZN currencies before saving
            if (this.currentCurrency !== 'MZN') {
                await this.updateExchangeRate(this.currentCurrency);
            }
            // Fetch user_id from Supabase session
            let userId = null;
            try {
                const session = await window.supabase.auth.getSession();
                userId = session.data?.session?.user?.id;
            } catch (e) {
                console.error('Could not fetch user session:', e);
            }
            if (!userId) {
                throw new Error('User not authenticated. Please log in.');
            }
            // Find client_id from the selected client name (must match clients.customer_id or id)
            let clientId = null;
            if (window.clients && Array.isArray(window.clients)) {
                // Try to match by id, customer_id, name, or email
                const selectedClientName = invoiceData.client.name?.trim();
                const selectedClientEmail = invoiceData.client.email?.trim();
                // Debug: log available clients and selected value
                console.log('[InvoiceForm] Looking for client:', selectedClientName, selectedClientEmail);
                console.log('[InvoiceForm] Available clients:', window.clients);
                const selectedClient = window.clients.find(c =>
                    (c.customer_id && c.customer_id === selectedClientName) ||
                    (c.id && c.id === selectedClientName) ||
                    (c.customer_name && c.customer_name === selectedClientName) ||
                    (c.email && c.email === selectedClientEmail)
                );
                if (selectedClient) {
                    clientId = selectedClient.customer_id || selectedClient.id || null;
                    console.log('[InvoiceForm] Matched client:', selectedClient);
                } else {
                    console.error('[InvoiceForm] No client match found for:', selectedClientName, selectedClientEmail);
                    console.error('[InvoiceForm] Clients available for matching:', window.clients);
                }
            }
            if (!clientId) {
                showNotification('Client not found or missing client_id. Please select a valid client from the suggestions/autocomplete list.', 'error');
                throw new Error('Client not found or missing client_id. Please select a valid client from the suggestions/autocomplete list.');
            }
            // Optionally, get environment_id if available
            let environmentId = null;
            if (window.environmentId) {
                environmentId = window.environmentId;
            }
            // --- Map all relevant fields to DB schema ---
            const formattedData = {
                invoiceNumber: invoiceData.invoiceNumber,
                serie: invoiceData.serie,
                issue_date: invoiceData.issueDate,
                due_date: invoiceData.dueDate,
                status: invoiceData.status || 'pending',
                currency: invoiceData.currency || 'MZN',
                client_id: clientId,
                client_name: invoiceData.client.name,
                customer_name: invoiceData.client.name, // Add this for compatibility
                subtotal: invoiceData.subtotal ?? null,
                desconto: invoiceData.totalDiscount ?? null,
                total_desconto: invoiceData.totalDiscount ?? null,
                subtotal_sem_iva: invoiceData.subtotalAfterDiscount ?? null,
                iva: invoiceData.totalVat ?? null,
                vat_amount: invoiceData.totalVat ?? null,
                valor_total_sem_imposto: invoiceData.subtotalAfterDiscount ?? null,
                total_incluindo_imposto: invoiceData.total ?? null,
                total_amount: invoiceData.total ?? null,
                iva_percent: (() => {
                    const uniqueRates = Array.from(new Set(invoiceData.items.map(i => i.vatRate)));
                    if (uniqueRates.length === 1) return uniqueRates[0] * 100;
                    return null;
                })(),
                valor_imposto: invoiceData.totalVat ?? null,
                payment_terms: invoiceData.paymentTerms || 'net30',
                notes: invoiceData.notes || '',
                currency_rate: this.currentRate || 1,
                user_id: userId,
                environment_id: environmentId ?? null,
                pdf_url: null, // Will be updated after PDF is generated
                // Add any other fields you want to save
            };
            // Debug: Log the insert payload
            console.log('Insert payload:', formattedData);
            // Insert the invoice
            const { data: invoice, error: invoiceError } = await window.supabase
                .from('invoices')
                .insert([formattedData])
                .select()
                .single();
            if (invoiceError) throw invoiceError;
            // Generate and upload PDF, get pdfUrl
            let pdfUrl = null;
            if (typeof window.generateAndUploadPDF === 'function') {
                pdfUrl = await window.generateAndUploadPDF(invoiceData);
            } else {
                console.warn('generateAndUploadPDF function not implemented. PDF URL will not be saved.');
            }
            // Update invoice with pdf_url
            if (pdfUrl) {
                await window.supabase
                    .from('invoices')
                    .update({ pdf_url: pdfUrl })
                    .eq('id', invoice.id);
            }
            // --- Trigger PDF download for the user ---
            if (typeof window.generatePDF === 'function') {
                const pdfBlob = await window.generatePDF(invoiceData);
                const pdfFileName = `Invoice-${invoiceData.invoiceNumber}.pdf`;
                const downloadUrl = URL.createObjectURL(pdfBlob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = pdfFileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(downloadUrl);
            }
            // For each item, first check if it exists in products table
            for (const item of invoiceData.items) {
                // Check if product exists
                const { data: existingProduct } = await window.supabase
                    .from('products')
                    .select('id')
                    .eq('description', item.description)
                    .single();
                if (!existingProduct) {
                    // If product doesn't exist, create it
                    const { error: productError } = await window.supabase
                        .from('products')
                        .insert([{
                            description: item.description,
                            price: item.price,
                            tax_code: 'VAT',
                            tax_rate: item.vatRate * 100, // Store as percent
                            industry: 'General' // Default industry
                        }]);
                    if (productError) throw productError;
                }
            }
            // showNotification('Invoice saved successfully', 'success');
            // Create invoice notification
            // if (window.createNotification) {
            //     await window.createNotification('invoice', 'Invoice Created Successfully', `Invoice ${invoice.invoiceNumber} has been created and is ready for sending to your client.`, 'invoices.html');
            // }
            // Update trial banner if ready, or wait for readiness
            function updateTrialBannerIfReady() {
                if (window.TrialBanner && typeof window.TrialBanner.updateTrialBanner === 'function') {
                    window.TrialBanner.updateTrialBanner();
                } else {
                    window.addEventListener('trialBannerReady', () => {
                        window.TrialBanner.updateTrialBanner();
                    }, { once: true });
                }
            }
            updateTrialBannerIfReady();
            return invoice;
        } catch (error) {
            console.error('Error saving invoice:', error);
            showNotification('Error saving invoice: ' + error.message, 'error');
            throw error;
        }
    }

    setupCurrencyListener() {
        const currencySelect = document.getElementById('currency');
        if (!currencySelect) return;
        currencySelect.addEventListener('change', async (e) => {
            const newCurrency = e.target.value;
            await this.updateExchangeRate(newCurrency);
            if (window.invoiceItems && typeof window.invoiceItems.updateInvoiceTotals === 'function') {
                window.invoiceItems.updateInvoiceTotals();
            }
            this.updateReviewTotals();
        });
        // On load, fetch rate if not MZN
        if (currencySelect.value !== 'MZN') {
            this.updateExchangeRate(currencySelect.value);
        }
    }

    getConvertedAmount(mznAmount) {
        // If MZN, return as is
        if (this.currentCurrency === 'MZN') return mznAmount;
        if (!this.currentRate || isNaN(this.currentRate) || this.currentRate === 1) return null;
        // API returns: 1 MZN = X USD (so multiply MZN * rate)
        return mznAmount * this.currentRate;
    }

    async updateExchangeRate(currency) {
        if (currency === 'MZN') {
            this.currentCurrency = 'MZN';
            this.currentRate = 1;
            this.updateExchangeRateInfo();
            return;
        }
        // Cache in sessionStorage
        const cacheKey = `walaka_rates_${currency}`;
        const cached = sessionStorage.getItem(cacheKey);
        let rate = null;
        if (cached) {
            const { value, timestamp } = JSON.parse(cached);
            // 1 hour cache
            if (Date.now() - timestamp < 60 * 60 * 1000) {
                rate = value;
            }
        }
        if (!rate) {
            this.fetchingRate = true;
            try {
                // Use Open Exchange Rates as the new source
                const res = await fetch(`https://openexchangerates.org/api/latest.json?app_id=0a2208bb4ead48929a4485ae45dff65d&symbols=USD,EUR,GBP,MZN`);
                const data = await res.json();
                // The base is always USD. To get 1 MZN in the selected currency:
                // rate = (CURRENCY/MZN)
                if (data && data.rates && data.rates['MZN']) {
                    if (currency === 'USD') {
                        rate = data.rates['USD'] / data.rates['MZN'];
                    } else if (currency === 'EUR') {
                        rate = data.rates['EUR'] / data.rates['MZN'];
                    } else if (currency === 'GBP') {
                        rate = data.rates['GBP'] / data.rates['MZN'];
                    }
                }
                if (rate) {
                    sessionStorage.setItem(cacheKey, JSON.stringify({ value: rate, timestamp: Date.now() }));
                }
            } catch (err) {
                rate = null;
            }
            this.fetchingRate = false;
        }
        this.currentCurrency = currency;
        if (rate && !isNaN(rate)) {
            this.currentRate = rate;
        } else {
            this.currentRate = null;
        }
        this.updateExchangeRateInfo();
    }

    updateExchangeRateInfo() {
        const infoDiv = document.getElementById('exchangeRateInfo');
        if (!infoDiv) return;
        if (this.currentCurrency === 'MZN') {
            infoDiv.textContent = 'Base currency: Mozambican Metical (MZN)';
        } else if (this.fetchingRate) {
            infoDiv.textContent = 'Fetching latest exchange rate...';
        } else if (this.currentRate && !isNaN(this.currentRate)) {
            infoDiv.textContent = `1 MZN ≈ ${this.currentRate.toFixed(4)} ${this.currentCurrency}`;
        } else {
            infoDiv.textContent = 'Exchange rate unavailable. Showing MZN only.';
        }
    }

    updateReviewTotals() {
        // Show both MZN and selected currency in review step
        const currency = this.currentCurrency || 'MZN';
        const rate = this.currentRate || 1;
        const subtotalElem = document.getElementById('reviewSubtotal');
        const vatElem = document.getElementById('reviewTotalVat');
        const totalElem = document.getElementById('reviewInvoiceTotal');
        const mainSubtotal = parseAmount(document.getElementById('subtotal')?.textContent || '0');
        const mainVat = parseAmount(document.getElementById('totalVat')?.textContent || '0');
        const mainTotal = parseAmount(document.getElementById('invoiceTotal')?.textContent || '0');
        if (subtotalElem && vatElem && totalElem) {
            subtotalElem.textContent = new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(mainSubtotal);
            vatElem.textContent = new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(mainVat);
            totalElem.textContent = new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(mainTotal);
            // Add converted values below if not MZN
            ['reviewSubtotal','reviewTotalVat','reviewInvoiceTotal'].forEach((id, idx) => {
                let convertedDiv = document.getElementById(id + '_converted');
                if (!convertedDiv) {
                    convertedDiv = document.createElement('div');
                    convertedDiv.id = id + '_converted';
                    convertedDiv.style.fontSize = '0.95em';
                    convertedDiv.style.color = '#555';
                    document.getElementById(id).parentElement.appendChild(convertedDiv);
                }
                if (currency !== 'MZN' && rate && !isNaN(rate)) {
                    let baseVal = [mainSubtotal, mainVat, mainTotal][idx];
                    const convertedVal = this.getConvertedAmount(baseVal);
                    if (convertedVal !== null) {
                        convertedDiv.textContent = `${convertedVal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currency} (1 MZN ≈ ${rate.toFixed(4)} ${currency})`;
                    } else {
                        convertedDiv.textContent = 'Exchange rate unavailable.';
                    }
                } else {
                    convertedDiv.textContent = '';
                }
            });
        }
    }
}

// Initialize and attach to window
const invoiceForm = new InvoiceForm();
window.invoiceForm = invoiceForm;

// Helper to robustly parse amounts in European/Portuguese format (e.g., '29 000,00' -> 29000.00)
function parseAmount(str) {
    if (typeof str !== 'string') str = String(str);
    // Remove all spaces (thousands separator)
    str = str.replace(/\s/g, '');
    // Replace the last comma with a dot (decimal separator)
    const lastComma = str.lastIndexOf(',');
    if (lastComma !== -1) {
        str = str.slice(0, lastComma).replace(/,/g, '') + '.' + str.slice(lastComma + 1);
    }
    return parseFloat(str);
}

function getCurrentFormData() {
    const form = document.getElementById('invoiceForm');
    if (!form) return null;

    const items = [];
    document.querySelectorAll('#itemsTable .item-row').forEach(row => {
        items.push({
            description: row.querySelector('.item-description').value,
            quantity: parseAmount(row.querySelector('.item-quantity').value) || 0,
            unit_price: parseAmount(row.querySelector('.item-price').value) || 0,
            vat_amount: parseAmount(row.querySelector('.item-vat').textContent) || 0,
            total: parseAmount(row.querySelector('.item-total').textContent) || 0
        });
    });

    // Format dates to UTC ISO strings for PostgreSQL timestamptz
    const issueDate = new Date(document.getElementById('issueDate').value);
    const dueDate = new Date(document.getElementById('dueDate').value);

    return {
        "invoiceNumber": document.getElementById('invoiceNumber').value, // Note the exact casing
        issue_date: issueDate.toISOString(),
        due_date: dueDate.toISOString(),
        client_name: document.getElementById('client-list').value,
        status: 'pending',
        subtotal: parseAmount(document.getElementById('subtotal').textContent) || 0,
        vat_amount: parseAmount(document.getElementById('totalVat').textContent) || 0,
        total_amount: parseAmount(document.getElementById('invoiceTotal').textContent) || 0,
        currency: document.getElementById('currency').value,
        payment_terms: document.getElementById('paymentTerms').value,
        notes: document.getElementById('notes').value,
        items: items // This will be handled separately if you have an invoice_items table
    };
}

async function handleInvoiceSubmission(event) {
    event.preventDefault();
    
    // Validate item limits before submission
    if (window.invoiceItemsPagination && typeof window.invoiceItemsPagination.validateItemLimits === 'function') {
        if (!window.invoiceItemsPagination.validateItemLimits()) {
            return; // Stop submission if limits exceeded
        }
    }
    
    const submitBtn = document.querySelector('#invoiceForm button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
        // Use the InvoiceForm's saveInvoice method
        const invoice = await window.invoiceForm.saveInvoice();
        window.lastSavedInvoice = invoice;
        if (window.createNotification) {
            await window.createNotification('invoice', 'Invoice Created Successfully', `Invoice ${invoice.invoiceNumber} has been created and is ready for sending to your client.`, 'invoices.html');
        }

        // --- Send notification email to the user after invoice creation ---
        try {
            // Get the current user (account owner)
            const { data: { user } } = await window.supabase.auth.getUser();
            if (user && user.email && typeof window.sendNotificationEmail === 'function') {
                const subject = `Invoice Created: ${invoice.invoiceNumber}`;
                const message = `A new invoice (${invoice.invoiceNumber}) has been created in your account. You can view it in your dashboard.`;
                console.log('[USER NOTIFICATION EMAIL] Attempting to send notification email to user:', user.email, { subject, message });
                await window.sendNotificationEmail(user.email, subject, message);
            } else {
                console.warn('[USER NOTIFICATION EMAIL] No user email found or sendNotificationEmail not available.', { user, sendNotificationEmailType: typeof window.sendNotificationEmail });
            }
        } catch (err) {
            console.error('[USER NOTIFICATION EMAIL] Error sending notification email to user:', err);
        }

        showNotification('Invoice saved successfully!', 'success');
        window.modalManager.closeModal('invoiceModal');
        // --- Refresh invoice table after invoice creation ---
        // Comment out all usages of window.invoiceForm.resetInvoiceForm()
        // window.invoiceForm.resetInvoiceForm();
        // Comment out all usages of window.invoiceTable.refreshTable()
        // window.invoiceTable.refreshTable();
        await window.refreshDashboardUI();
    } catch (error) {
        console.error('Error saving invoice:', error);
        showNotification(`Error saving invoice: ${error.message}`, 'error');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

// Event Listeners
document.getElementById('invoiceForm')?.addEventListener('submit', handleInvoiceSubmission);

// Multi-step modal logic for Create Invoice
(function() {
  const steps = Array.from(document.querySelectorAll('#invoiceModal .step'));
  const stepIndicators = Array.from(document.querySelectorAll('#invoiceModal .step-indicator'));
  let currentStep = 0;
  let maxStepReached = 0;

  function showStep(index) {
    steps.forEach((step, i) => {
      step.style.display = i === index ? 'block' : 'none';
      step.classList.toggle('active', i === index);
    });
    stepIndicators.forEach((ind, i) => {
      ind.classList.toggle('active', i === index);
    });
    currentStep = index;
    if (index > maxStepReached) maxStepReached = index;
    // Always populate review when entering review step
    if (index === 3) populateReview();
  }

  function validateStep(index) {
    // Basic validation for each step (expand as needed)
    if (index === 0) {
      // Client info: require client name
      const clientName = document.getElementById('client-list').value.trim();
      if (!clientName) {
        showNotification('Please enter/select a client name', 'error');
        return false;
      }
    }
    if (index === 1) {
      // Invoice details: require dates
      const issueDate = document.getElementById('issueDate').value;
      const dueDate = document.getElementById('dueDate').value;
      if (!issueDate || !dueDate) {
        showNotification('Please select both issue and due dates', 'error');
        return false;
      }
    }
    if (index === 2) {
      // Items: require at least one item with description and quantity > 0
      const itemRows = document.querySelectorAll('#itemsTable .item-row');
      let valid = false;
      itemRows.forEach(row => {
        const desc = row.querySelector('.item-description').value.trim();
        const qty = parseAmount(row.querySelector('.item-quantity').value);
        if (desc && qty > 0) valid = true;
      });
      if (!valid) {
        showNotification('Please add at least one valid item', 'error');
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (!validateStep(currentStep)) return;
    if (currentStep < steps.length - 1) {
      showStep(currentStep + 1);
      if (currentStep + 1 === 3) populateReview();
    }
  }
  function prevStep() {
    if (currentStep > 0) showStep(currentStep - 1);
  }

  // --- Update review step to show per-item discount breakdown ---
  function populateReview() {
    // Fill the review summary with entered data
    console.log('[populateReview] Called, generating review table with all columns.');
    const clientName = document.getElementById('client-list').value;
    const clientEmail = document.getElementById('clientEmail').value;
    const clientTaxId = document.getElementById('clientTaxId').value;
    const clientAddress = document.getElementById('clientAddress').value;
    const invoiceNumber = document.getElementById('invoiceNumber').value;
    const issueDate = document.getElementById('issueDate').value;
    const dueDate = document.getElementById('dueDate').value;
    const currency = document.getElementById('currency').value;
    const paymentTerms = document.getElementById('paymentTerms').options[document.getElementById('paymentTerms').selectedIndex].text;
    const notes = document.getElementById('notes').value;
    const serie = document.getElementById('serie')?.value || '';
    
    // Get all items - use pagination module if available
    let itemRows = [];
    if (window.invoiceItemsPagination && typeof window.invoiceItemsPagination.getAllItemsForPDF === 'function') {
        itemRows = window.invoiceItemsPagination.getAllItemsForPDF();
    } else {
        itemRows = document.querySelectorAll('#itemsTable .item-row');
    }
    
    let itemsHtml = '';
    itemRows.forEach(row => {
      const desc = row.querySelector('.item-description').value;
      const qty = parseAmount(row.querySelector('.item-quantity').value);
      const price = parseAmount(row.querySelector('.item-price').value);
      const discountType = row.querySelector('.item-discount-type').value;
      // Always treat discountValue as 0 if type is 'none' or field is empty
      let discountValue = parseAmount(row.querySelector('.item-discount-value').value);
      if (discountType === 'none' || isNaN(discountValue) || discountValue === null) discountValue = 0;
      const discountedSubtotal = parseAmount(row.querySelector('.item-discounted-subtotal').textContent);
      const vat = parseAmount(row.querySelector('.item-vat').textContent);
      const total = parseAmount(row.querySelector('.item-total').textContent);
      let discountDisplay = '';
      if (discountType === 'percent') discountDisplay = `${discountValue}%`;
      else if (discountType === 'fixed') discountDisplay = `${discountValue}`;
      else discountDisplay = '—';
      if (desc && qty > 0) {
        itemsHtml += `<tr><td>${desc}</td><td>${qty}</td><td>${price}</td><td>${discountType}</td><td>${discountDisplay}</td><td>${discountedSubtotal}</td><td>${vat}</td><td>${total}</td></tr>`;
      }
    });
    // Always render all columns in the table header and use .items-table for styling
    let warningHtml = '';
    if (itemRows.length > 50) {
      warningHtml = `<div style="color:#dc3545;font-weight:bold;margin-bottom:8px;">You have more than 50 items. Please remove excess items to publish the invoice.</div>`;
    }
    const reviewHtml = `
      ${warningHtml}
      <div><strong>Client:</strong> ${clientName} (${clientEmail}, NUIT: ${clientTaxId})<br><strong>Address:</strong> ${clientAddress}</div>
      <div><strong>Invoice #:</strong> ${invoiceNumber} | <strong>Issue:</strong> ${issueDate} | <strong>Due:</strong> ${dueDate}</div>
      <div><strong>Currency:</strong> ${currency} | <strong>Terms:</strong> ${paymentTerms}</div>
      <div><strong>Notes:</strong> ${notes || '—'}</div>
      <div class="items-table-container">
        <table class="items-table" style="margin-top:12px;width:100%"><thead><tr><th>Description</th><th>Quantity</th><th>Unit Price</th><th>Discount Type</th><th>Discount</th><th>Discounted Subtotal</th><th>VAT</th><th>Total</th></tr></thead><tbody>
          ${Array.from(itemRows).map(row => {
            const desc = row.querySelector('.item-description').value;
            const qty = parseAmount(row.querySelector('.item-quantity').value);
            const price = parseAmount(row.querySelector('.item-price').value);
            const discountType = row.querySelector('.item-discount-type').value;
            let discountValue = parseAmount(row.querySelector('.item-discount-value').value);
            if (discountType === 'none' || isNaN(discountValue) || discountValue === null) discountValue = 0;
            const discountedSubtotal = parseAmount(row.querySelector('.item-discounted-subtotal').textContent);
            const vat = parseAmount(row.querySelector('.item-vat').textContent);
            const total = parseAmount(row.querySelector('.item-total').textContent);
            let discountDisplay = '';
            if (discountType === 'percent') discountDisplay = `${discountValue}%`;
            else if (discountType === 'fixed') discountDisplay = `${discountValue}`;
            else discountDisplay = '—';
            if (desc && qty > 0) {
              return `<tr><td>${desc}</td><td>${qty}</td><td>${price.toFixed(2)}</td><td>${discountType}</td><td>${discountDisplay}</td><td>${discountedSubtotal.toFixed(2)}</td><td>${vat.toFixed(2)}</td><td>${total.toFixed(2)}</td></tr>`;
            } else {
              return '';
            }
          }).join('')}
        </tbody></table>
      </div>
      <div class="invoice-totals" style="margin-top:16px;text-align:right;">
        <div class="totals-row"><span>Subtotal:</span> <span id="reviewSubtotal">0.00</span></div>
        <div class="totals-row"><span>Desconto:</span> <span id="reviewTotalDiscount">0.00</span></div>
        <div class="totals-row"><span>Subtotal após Desconto:</span> <span id="reviewSubtotalAfterDiscount">0.00</span></div>
        <div class="totals-row"><span>IVA:</span> <span id="reviewTotalVat">0.00</span></div>
        <div class="totals-row"><span>Total:</span> <span id="reviewInvoiceTotal">0.00</span></div>
      </div>
      <div style="margin-top:16px;text-align:right;">
        <button type="button" class="btn secondary-btn" id="previewInvoiceBtn">
          <i class="fas fa-eye"></i> <span data-translate="preview">Preview</span>
        </button>
      </div>
    `;
    const reviewSummary = document.getElementById('invoiceReviewSummary');
    if (reviewSummary) reviewSummary.innerHTML = reviewHtml;
    // Copy totals with null checks
    const reviewSubtotal = document.getElementById('reviewSubtotal');
    const reviewTotalDiscount = document.getElementById('reviewTotalDiscount');
    const reviewSubtotalAfterDiscount = document.getElementById('reviewSubtotalAfterDiscount');
    const reviewTotalVat = document.getElementById('reviewTotalVat');
    const reviewInvoiceTotal = document.getElementById('reviewInvoiceTotal');
    if (reviewSubtotal && document.getElementById('subtotal')) reviewSubtotal.textContent = document.getElementById('subtotal').textContent;
    if (reviewTotalDiscount && document.getElementById('totalDiscount')) reviewTotalDiscount.textContent = document.getElementById('totalDiscount').textContent;
    if (reviewSubtotalAfterDiscount && document.getElementById('subtotalAfterDiscount')) reviewSubtotalAfterDiscount.textContent = document.getElementById('subtotalAfterDiscount').textContent;
    if (reviewTotalVat && document.getElementById('totalVat')) reviewTotalVat.textContent = document.getElementById('totalVat').textContent;
    if (reviewInvoiceTotal && document.getElementById('invoiceTotal')) reviewInvoiceTotal.textContent = document.getElementById('invoiceTotal').textContent;
    // Attach preview button event
    setTimeout(() => {
      const previewBtn = document.getElementById('previewInvoiceBtn');
      if (previewBtn) {
        previewBtn.addEventListener('click', function() {
          if (typeof window.invoicePreview === 'object' && typeof window.invoicePreview.openPreview === 'function') {
            window.invoicePreview.openPreview();
          } else if (typeof window.openInvoicePreview === 'function') {
            window.openInvoicePreview();
          } else {
            showNotification('Preview function not found', 'error');
          }
        });
      }
    }, 100);
  }

  // Event listeners
  document.querySelectorAll('#invoiceModal .next-step').forEach(btn => {
    btn.addEventListener('click', nextStep);
  });
  document.querySelectorAll('#invoiceModal .prev-step').forEach(btn => {
    btn.addEventListener('click', prevStep);
  });

  // Stepper tab click logic
  stepIndicators.forEach((ind, i) => {
    ind.style.cursor = 'pointer';
    ind.addEventListener('click', function() {
      if (i <= maxStepReached) {
        showStep(i);
        if (i === 3) populateReview();
      }
    });
  });

  // Show first step on modal open
  document.addEventListener('DOMContentLoaded', function() {
    showStep(0);
  });

  // Optional: Reset to first step when modal is closed
  document.querySelectorAll('#invoiceModal .close-modal').forEach(btn => {
    btn.addEventListener('click', function() {
      showStep(0);
      maxStepReached = 0;
      window.modalManager.closeModal('invoiceModal');
    });
  });
})();

// --- Per-item discount logic ---
document.addEventListener('input', function(e) {
    // Discount type change
    if (e.target.classList.contains('item-discount-type')) {
        const row = e.target.closest('.item-row');
        const discountInput = row.querySelector('.item-discount-value');
        if (!discountInput) return;
        if (e.target.value === 'none') {
            discountInput.style.display = 'none';
            discountInput.value = '';
        } else {
            discountInput.style.display = 'block'; // Use block for table cell
            discountInput.removeAttribute('disabled');
            discountInput.classList.remove('hidden');
            // If value is empty, set to 0 for immediate calculation
            if (discountInput.value === '' || isNaN(parseAmount(discountInput.value))) {
                discountInput.value = 0;
            }
            discountInput.focus();
        }
        console.log('[DISCOUNT] Discount type changed:', e.target.value, 'Input display:', discountInput.style.display);
        window.invoiceForm.updateItemRow(row);
    }
    // Discount value input (update on every keystroke)
    if (e.target.classList.contains('item-discount-value')) {
        const row = e.target.closest('.item-row');
        console.log('[DISCOUNT] Discount value input:', e.target.value);
        window.invoiceForm.updateItemRow(row);
    }
    // VAT selector change
    if (e.target.classList.contains('item-vat-rate')) {
        const row = e.target.closest('.item-row');
        const vatOtherInput = row.querySelector('.item-vat-other');
        if (e.target.value === 'other') {
            vatOtherInput.style.display = 'inline-block';
            vatOtherInput.focus();
        } else {
            vatOtherInput.style.display = 'none';
            vatOtherInput.value = '';
        }
        window.invoiceForm.updateItemRow(row);
    }
    // Custom VAT value change
    if (e.target.classList.contains('item-vat-other')) {
        const row = e.target.closest('.item-row');
        window.invoiceForm.updateItemRow(row);
    }
    // Quantity or price change
    if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-price')) {
        const row = e.target.closest('.item-row');
        window.invoiceForm.updateItemRow(row);
    }
});
document.addEventListener('change', function(e) {
    // Also update on change for all relevant fields
    if (e.target.classList.contains('item-discount-type') || e.target.classList.contains('item-discount-value')) {
        const row = e.target.closest('.item-row');
        console.log('[DISCOUNT] Change event on discount field:', e.target.className, e.target.value);
        window.invoiceForm.updateItemRow(row);
    }
});

// --- Update item row calculation for per-item discount ---
InvoiceForm.prototype.updateItemRow = function(row) {
    const quantity = parseAmount(row.querySelector('.item-quantity')?.value) || 0;
    const price = parseAmount(row.querySelector('.item-price')?.value) || 0;
    // Discount logic
    let discountType = row.querySelector('.item-discount-type')?.value || 'none';
    let discountValue = parseAmount(row.querySelector('.item-discount-value')?.value);
    if (isNaN(discountValue) || discountValue === null) discountValue = 0;
    let itemDiscount = 0;
    if (discountType === 'percent') {
        itemDiscount = price * quantity * (discountValue / 100);
    } else if (discountType === 'fixed') {
        itemDiscount = discountValue;
    }
    // Prevent over-discounting
    if (itemDiscount > price * quantity) itemDiscount = price * quantity;
    const discountedSubtotal = Math.max(price * quantity - itemDiscount, 0);
    // VAT logic
    let vatRate = 0.16;
    const vatSelect = row.querySelector('.item-vat-rate');
    if (vatSelect) {
        if (vatSelect.value === 'other') {
            const vatOther = row.querySelector('.item-vat-other');
            vatRate = vatOther && vatOther.value ? parseFloat(vatOther.value) / 100 : 0;
        } else {
            vatRate = parseFloat(vatSelect.value);
        }
    }
    const vat = discountedSubtotal * vatRate;
    const total = discountedSubtotal + vat;
    console.log('[DISCOUNT] updateItemRow:', {
        quantity,
        price,
        discountType,
        discountValue,
        itemDiscount,
        discountedSubtotal,
        vatRate,
        vat,
        total
    });
    row.querySelector('.item-discounted-subtotal').textContent = discountedSubtotal.toFixed(2);
    row.querySelector('.item-vat').textContent = vat.toFixed(2);
    row.querySelector('.item-total').textContent = total.toFixed(2);
    // Optionally trigger totals update
    if (typeof this.updateReviewTotals === 'function') this.updateReviewTotals();
};

// --- Update invoice totals for per-item discount ---
InvoiceForm.prototype.updateReviewTotals = function() {
    const itemRows = document.querySelectorAll('.item-row');
    let subtotal = 0, totalDiscount = 0, subtotalAfterDiscount = 0, totalVat = 0, grandTotal = 0;
    itemRows.forEach(row => {
        const quantity = parseAmount(row.querySelector('.item-quantity')?.value) || 0;
        const price = parseAmount(row.querySelector('.item-price')?.value) || 0;
        let discountType = row.querySelector('.item-discount-type')?.value || 'none';
        let discountValue = parseAmount(row.querySelector('.item-discount-value')?.value) || 0;
        let itemDiscount = 0;
        if (discountType === 'percent') {
            itemDiscount = price * quantity * (discountValue / 100);
        } else if (discountType === 'fixed') {
            itemDiscount = discountValue;
        }
        const discountedSubtotal = Math.max(price * quantity - itemDiscount, 0);
        let vatRate = 0.16;
        const vatSelect = row.querySelector('.item-vat-rate');
        if (vatSelect) {
            if (vatSelect.value === 'other') {
                const vatOther = row.querySelector('.item-vat-other');
                vatRate = vatOther && vatOther.value ? parseFloat(vatOther.value) / 100 : 0;
            } else {
                vatRate = parseFloat(vatSelect.value);
            }
        }
        const vat = discountedSubtotal * vatRate;
        const total = discountedSubtotal + vat;
        subtotal += price * quantity;
        totalDiscount += itemDiscount;
        subtotalAfterDiscount += discountedSubtotal;
        totalVat += vat;
        grandTotal += total;
    });
    document.getElementById('subtotal').textContent = subtotal.toFixed(2);
    document.getElementById('totalDiscount').textContent = totalDiscount.toFixed(2);
    document.getElementById('subtotalAfterDiscount').textContent = subtotalAfterDiscount.toFixed(2);
    document.getElementById('totalVat').textContent = totalVat.toFixed(2);
    document.getElementById('invoiceTotal').textContent = grandTotal.toFixed(2);
    // Also update review step if present
    if (document.getElementById('reviewSubtotal')) document.getElementById('reviewSubtotal').textContent = subtotal.toFixed(2);
    if (document.getElementById('reviewTotalVat')) document.getElementById('reviewTotalVat').textContent = totalVat.toFixed(2);
    if (document.getElementById('reviewInvoiceTotal')) document.getElementById('reviewInvoiceTotal').textContent = grandTotal.toFixed(2);
};

// --- Ensure serie field always defaults to 'A' ---
document.addEventListener('DOMContentLoaded', function() {
    const serieInput = document.getElementById('serie');
    if (serieInput && !serieInput.value) serieInput.value = 'A';
});

// Patch: When a new item row is added, immediately trigger updateItemRow for that row
const origAddInvoiceItem = window.invoiceItems && window.invoiceItems.addInvoiceItem;
if (origAddInvoiceItem) {
  window.invoiceItems.addInvoiceItem = function() {
    origAddInvoiceItem.apply(this, arguments);
    // Get the last row and trigger calculation
    const itemsTableBody = document.querySelector('#itemsTable tbody');
    const newRow = itemsTableBody && itemsTableBody.lastElementChild;
    if (newRow && typeof window.invoiceForm.updateItemRow === 'function') {
      // If discount type is 'none', always treat discount value as 0
      const discountType = newRow.querySelector('.item-discount-type')?.value;
      if (discountType === 'none') {
        const discountInput = newRow.querySelector('.item-discount-value');
        if (discountInput) discountInput.value = '';
      }
      window.invoiceForm.updateItemRow(newRow);
    }
  };
}
// When switching discount type, always trigger calculation update for the row
// (already handled by event listeners, but ensure updateItemRow is always called)
document.addEventListener('change', function(e) {
    if (e.target.classList.contains('item-discount-type')) {
        const row = e.target.closest('.item-row');
        window.invoiceForm.updateItemRow(row);
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const serieInput = document.getElementById('serie');
    const invoiceNumberField = document.getElementById('invoiceNumber');
    if (serieInput && invoiceNumberField) {
        serieInput.addEventListener('input', async function() {
            try {
                const generator = new window.InvoiceNumberGenerator();
                // Fetch user_id from Supabase session
                let userId = null;
                try {
                    const session = await window.supabase.auth.getSession();
                    userId = session.data?.session?.user?.id;
                } catch (e) {
                    console.error('Could not fetch user session:', e);
                }
                let serie = serieInput.value || 'A';
                if (!userId) throw new Error('User not authenticated. Please log in.');
                const newInvoiceNumber = await generator.getNextNumber(userId, serie);
                invoiceNumberField.value = newInvoiceNumber;
            } catch (err) {
                console.error('Error generating invoice number:', err);
                invoiceNumberField.value = '';
                window.showNotification('Error generating invoice number');
            }
        });
    }
});

// Ensure the close-modal button in #invoiceModal closes the modal via modalManager and logs the event
const invoiceModalCloseBtn = document.querySelector('#invoiceModal .close-modal');
if (invoiceModalCloseBtn) {
  invoiceModalCloseBtn.addEventListener('click', function() {
    console.log('[InvoiceForm] Close button clicked for invoiceModal');
    console.log('[InvoiceForm] Modal stack before close:', window.modalManager.modalStack.map(m => m.id));
    window.modalManager.closeModal('invoiceModal');
    console.log('[InvoiceForm] Modal stack after close:', window.modalManager.modalStack.map(m => m.id));
  });
}