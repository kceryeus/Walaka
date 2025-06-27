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
            
            // Generate a new unique invoice number only once
            const invoiceNumberField = document.getElementById('invoiceNumber');
            if (invoiceNumberField && !invoiceNumberField.dataset.generated) {
                try {
                    const generator = new window.InvoiceNumberGenerator();
                    const newInvoiceNumber = await generator.getNextNumber();
                    invoiceNumberField.value = newInvoiceNumber;
                    invoiceNumberField.dataset.generated = true; // Mark as generated
                } catch (err) {
                    console.error('Error generating invoice number:', err);
                    invoiceNumberField.value = '';
                    window.showNotification('Error generating invoice number');
                }
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

            console.log('Form elements found:', {
                clientList: !!clientList,
                invoiceNumber: !!invoiceNumber,
                issueDate: !!issueDate,
                dueDate: !!dueDate,
                currency: !!currency,
                notes: !!notes,
                paymentTerms: !!paymentTerms
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

            // Calculate totals
            const subtotal = parseFloat(document.getElementById('subtotal')?.textContent || '0');
            const totalVat = parseFloat(document.getElementById('totalVat')?.textContent || '0');
            const total = parseFloat(document.getElementById('invoiceTotal')?.textContent || '0');

            console.log('Totals calculated:', { subtotal, totalVat, total });

            // Collect items
            const items = [];
            const itemRows = document.querySelectorAll('.item-row');
            console.log('Found item rows:', itemRows.length);

            itemRows.forEach((row, index) => {
                const description = row.querySelector('.item-description')?.value;
                const quantity = parseFloat(row.querySelector('.item-quantity')?.value) || 0;
                const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
                const vat = parseFloat(row.querySelector('.item-vat')?.textContent) || 0;
                const total = parseFloat(row.querySelector('.item-total')?.textContent) || 0;

                console.log(`Item ${index + 1}:`, {
                    description,
                    quantity,
                    price,
                    vat,
                    total
                });

                if (description && quantity > 0 && price >= 0) {
                    items.push({
                        description,
                        quantity,
                        price,
                        vat,
                        total
                    });
                }
            });

            // Validate invoice has items
            if (items.length === 0) {
                throw new Error('Invoice must have at least one item');
            }

            // Construct the complete invoice data object
            const invoiceData = {
                invoiceNumber: invoiceNumber.value,
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
                subtotal: subtotal,
                totalVat: totalVat,
                total: total
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
            
            // Format data for Supabase storage
            const formattedData = {
                "invoiceNumber": invoiceData.invoiceNumber,
                issue_date: invoiceData.issueDate,
                due_date: invoiceData.dueDate,
                status: invoiceData.status || 'pending',
                currency: invoiceData.currency || 'MZN',
                client_name: invoiceData.client.name,
                subtotal: invoiceData.subtotal,
                vat_amount: invoiceData.totalVat,
                total_amount: invoiceData.total,
                notes: invoiceData.notes || '',
                payment_terms: invoiceData.paymentTerms || 'net30'
            };

            // Insert the invoice
            const { data: invoice, error: invoiceError } = await window.supabase
                .from('invoices')
                .insert([formattedData])
                .select()
                .single();

            if (invoiceError) throw invoiceError;

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
                            tax_rate: 16.00, // Default VAT rate
                            industry: 'General' // Default industry
                        }]);

                    if (productError) throw productError;
                }
            }

            showNotification('Invoice saved successfully', 'success');
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
        const mainSubtotal = parseFloat(document.getElementById('subtotal')?.textContent.replace(/[^\d.\-]/g, '') || '0');
        const mainVat = parseFloat(document.getElementById('totalVat')?.textContent.replace(/[^\d.\-]/g, '') || '0');
        const mainTotal = parseFloat(document.getElementById('invoiceTotal')?.textContent.replace(/[^\d.\-]/g, '') || '0');
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

function getCurrentFormData() {
    const form = document.getElementById('invoiceForm');
    if (!form) return null;

    const items = [];
    document.querySelectorAll('#itemsTable .item-row').forEach(row => {
        items.push({
            description: row.querySelector('.item-description').value,
            quantity: parseFloat(row.querySelector('.item-quantity').value) || 0,
            unit_price: parseFloat(row.querySelector('.item-price').value) || 0,
            vat_amount: parseFloat(row.querySelector('.item-vat').textContent) || 0,
            total: parseFloat(row.querySelector('.item-total').textContent) || 0
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
        subtotal: parseFloat(document.getElementById('subtotal').textContent) || 0,
        vat_amount: parseFloat(document.getElementById('totalVat').textContent) || 0,
        total_amount: parseFloat(document.getElementById('invoiceTotal').textContent) || 0,
        currency: document.getElementById('currency').value,
        payment_terms: document.getElementById('paymentTerms').value,
        notes: document.getElementById('notes').value,
        items: items // This will be handled separately if you have an invoice_items table
    };
}

async function handleInvoiceSubmission(event) {
    event.preventDefault();
    
    try {
        // Use the InvoiceForm's saveInvoice method
        const invoice = await window.invoiceForm.saveInvoice();

        // Store for PDF generation
        window.lastSavedInvoice = invoice;

        showNotification('Invoice saved successfully!', 'success');
        
        // Close modal and refresh table
        window.modalManager.closeModal('invoiceModal');
        if (window.invoiceTable) {
            window.invoiceTable.refresh();
        }

    } catch (error) {
        console.error('Error saving invoice:', error);
        showNotification(`Error saving invoice: ${error.message}`, 'error');
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
        const qty = parseFloat(row.querySelector('.item-quantity').value);
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

  function populateReview() {
    // Fill the review summary with entered data
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
    // Items
    const itemRows = document.querySelectorAll('#itemsTable .item-row');
    let itemsHtml = '';
    itemRows.forEach(row => {
      const desc = row.querySelector('.item-description').value;
      const qty = row.querySelector('.item-quantity').value;
      const price = row.querySelector('.item-price').value;
      const vat = row.querySelector('.item-vat').textContent;
      const total = row.querySelector('.item-total').textContent;
      if (desc && qty > 0) {
        itemsHtml += `<tr><td>${desc}</td><td>${qty}</td><td>${price}</td><td>${vat}</td><td>${total}</td></tr>`;
      }
    });
    const reviewHtml = `
      <div><strong>Client:</strong> ${clientName} (${clientEmail}, NUIT: ${clientTaxId})<br><strong>Address:</strong> ${clientAddress}</div>
      <div><strong>Invoice #:</strong> ${invoiceNumber} | <strong>Issue:</strong> ${issueDate} | <strong>Due:</strong> ${dueDate}</div>
      <div><strong>Currency:</strong> ${currency} | <strong>Terms:</strong> ${paymentTerms}</div>
      <div><strong>Notes:</strong> ${notes || '—'}</div>
      <table class="items-table" style="margin-top:12px;width:100%"><thead><tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>VAT</th><th>Total</th></tr></thead><tbody>${itemsHtml}</tbody></table>
      <div style="margin-top:16px;text-align:right;">
        <button type="button" class="btn secondary-btn" id="previewInvoiceBtn">
          <i class="fas fa-eye"></i> <span data-translate="preview">Preview</span>
        </button>
      </div>
    `;
    document.getElementById('invoiceReviewSummary').innerHTML = reviewHtml;
    // Copy totals
    document.getElementById('reviewSubtotal').textContent = document.getElementById('subtotal').textContent;
    document.getElementById('reviewTotalVat').textContent = document.getElementById('totalVat').textContent;
    document.getElementById('reviewInvoiceTotal').textContent = document.getElementById('invoiceTotal').textContent;
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
    });
  });
})();