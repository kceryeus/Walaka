import { settingsManager } from '../services/settingsManager.js';
import { languageManager } from '../services/languageManager.js';

/**
 * Initialize the application
 */
function initApp() {
    settingsManager.addListener((type, settings) => {
        if (type === 'invoice') {
            applyInvoiceSettings(settings.invoice);
        } else if (type === 'appearance') {
            applyAppearanceSettings(settings.appearance);
        }
    });

    initTabs();
    initInvoiceItems();
    setDefaultDates();
    initTemplateSettings();
    initEventListeners();
    
    // Set default language and currency
    const locale = languageManager.getLocale();
    document.getElementById('currency').value = locale.currency;
    
    // Format dates according to locale
    const today = new Date();
    const issueDateInput = document.getElementById('issue-date');
    issueDateInput.value = languageManager.formatDate(today);
}

function applyInvoiceSettings(settings) {
    // Apply invoice settings to the form
    document.getElementById('invoice-prefix').value = settings.prefix;
    document.getElementById('currency').value = settings.currency;
    document.getElementById('default-tax-rate').value = settings.taxRate;
    document.getElementById('payment-terms').value = settings.paymentTerms;
    document.getElementById('notes').value = settings.notes;
}

function applyAppearanceSettings(settings) {
    // Apply logo if exists
    if (settings.logo) {
        window.companyLogo = settings.logo;
        const logoPreview = document.querySelector('.logo-preview img');
        if (logoPreview) {
            logoPreview.src = settings.logo;
            logoPreview.style.display = 'block';
        }
    }
}

/**
 * Initialize tab navigation
 */
function initTabs() {
    const tabLinks = document.querySelectorAll('.tab-link');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Remove active class from all tabs
            tabLinks.forEach(tab => tab.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all tab content
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Show the related tab content
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

/**
 * Initialize invoice items functionality
 */
function initInvoiceItems() {
    // Add initial row
    addInvoiceItem();
    
    // Add item button event
    document.getElementById('add-item').addEventListener('click', function() {
        addInvoiceItem();
    });
}

/**
 * Add a new invoice item row
 * @param {Object} item - Optional item data
 */
function addInvoiceItem(item = {}) {
    const template = document.getElementById('item-template');
    const clone = document.importNode(template.content, true);
    const container = document.getElementById('invoice-items');
    
    // Set values if provided
    if (item.description) {
        clone.querySelector('.item-description').value = item.description;
    }
    if (item.quantity) {
        clone.querySelector('.item-quantity').value = item.quantity;
    }
    if (item.price) {
        clone.querySelector('.item-price').value = item.price;
    }
    if (item.vat) {
        clone.querySelector('.item-vat').value = item.vat;
    }
    
    // Set up event listeners
    const row = clone.querySelector('.item-row');
    
    row.querySelector('.item-quantity').addEventListener('input', function() {
        calculateItemTotal(row);
    });
    
    row.querySelector('.item-price').addEventListener('input', function() {
        calculateItemTotal(row);
    });
    
    row.querySelector('.item-vat').addEventListener('input', function() {
        calculateItemTotal(row);
    });
    
    row.querySelector('.remove-item').addEventListener('click', function() {
        row.remove();
        calculateTotals();
    });
    
    // Add to container
    container.appendChild(clone);
    
    // Calculate initial total
    calculateItemTotal(container.lastElementChild);
}

/**
 * Calculate total for an invoice item
 * @param {HTMLElement} itemRow - The item row element
 */
function calculateItemTotal(itemRow) {
    const quantity = parseFloat(itemRow.querySelector('.item-quantity').value) || 0;
    const price = parseFloat(itemRow.querySelector('.item-price').value) || 0;
    const vatRate = parseFloat(itemRow.querySelector('.item-vat').value) || 0;
    
    // Calculate total using invoiceCalculator.js
    const total = calculateItemPrice(quantity, price, vatRate);
    
    // Format and display total
    const currency = document.getElementById('currency').value || 'MZN';
    itemRow.querySelector('.item-total').value = formatCurrency(total, currency).replace(currency, '').trim();
    
    // Update overall totals
    calculateTotals();
}

/**
 * Calculate totals for the invoice
 */
function calculateTotals() {
    const currency = document.getElementById('currency').value || 'MZN';
    const items = collectItems();
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    
    // Calculate subtotal and VAT
    const subtotal = calculateSubtotal(items);
    const vatAmount = calculateVAT(items);
    
    // Calculate grand total
    const total = calculateTotal(subtotal, vatAmount, discount);
    
    // Update display
    document.getElementById('subtotal-display').textContent = formatCurrency(subtotal, currency);
    document.getElementById('vat-display').textContent = formatCurrency(vatAmount, currency);
    document.getElementById('discount-display').textContent = formatCurrency(discount, currency);
    document.getElementById('total-display').textContent = formatCurrency(total, currency);
}

/**
 * Collect all items from the invoice form
 * @returns {Array} Array of item objects
 */
function collectItems() {
    const items = [];
    const itemRows = document.querySelectorAll('#invoice-items .item-row');
    
    itemRows.forEach(row => {
        const description = row.querySelector('.item-description').value;
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        const vat = parseFloat(row.querySelector('.item-vat').value) || 0;
        const total = calculateItemPrice(quantity, price, vat);
        
        items.push({
            description,
            quantity,
            price,
            vat,
            total
        });
    });
    
    return items;
}

/**
 * Set default dates (today for issue date, +30 days for due date)
 */
function setDefaultDates() {
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + 30);
    
    const issueDateInput = document.getElementById('issue-date');
    const dueDateInput = document.getElementById('due-date');
    
    issueDateInput.valueAsDate = today;
    dueDateInput.valueAsDate = dueDate;
    
    // Update due date when issue date changes
    issueDateInput.addEventListener('change', updateDueDate);
}

/**
 * Update due date based on issue date and payment terms
 */
function updateDueDate() {
    const issueDate = new Date(document.getElementById('issue-date').value);
    const paymentTerms = document.getElementById('payment-terms').value;
    const dueDateInput = document.getElementById('due-date');
    
    if (isNaN(issueDate.getTime())) {
        return;
    }
    
    const dueDate = new Date(issueDate);
    
    // Set due date based on payment terms
    if (paymentTerms === 'Due on Receipt') {
        // Same as issue date
    } else if (paymentTerms === 'Net 15') {
        dueDate.setDate(issueDate.getDate() + 15);
    } else if (paymentTerms === 'Net 30') {
        dueDate.setDate(issueDate.getDate() + 30);
    } else if (paymentTerms === 'Net 45') {
        dueDate.setDate(issueDate.getDate() + 45);
    } else if (paymentTerms === 'Net 60') {
        dueDate.setDate(issueDate.getDate() + 60);
    }
    
    dueDateInput.valueAsDate = dueDate;
}

/**
 * Initialize template settings
 */
function initTemplateSettings() {
    // Template selection
    const templateOptions = document.querySelectorAll('.template-option');
    
    templateOptions.forEach(option => {
        option.addEventListener('click', function() {
            templateOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    // Color selection
    const colorOptions = document.querySelectorAll('.color-option');
    
    colorOptions.forEach(option => {
        option.addEventListener('click', function() {
            colorOptions.forEach(opt => opt.classList.remove('selected'));
            this.classList.add('selected');
            
            // Update primary color
            document.documentElement.style.setProperty('--primary-color', this.getAttribute('data-color'));
        });
    });
}

/**
 * Initialize event listeners for buttons
 */
function initEventListeners() {
    // Payment terms change
    document.getElementById('payment-terms').addEventListener('change', updateDueDate);
    
    // Currency change
    document.getElementById('currency').addEventListener('change', function() {
        calculateTotals();
    });
    
    // Preview button
    document.getElementById('preview-invoice').addEventListener('click', showInvoiceModal);
    
    // Close preview
    document.getElementById('close-preview').addEventListener('click', closeInvoiceModal);
    document.querySelector('.close-modal').addEventListener('click', closeInvoiceModal);
    
    // Print button
    document.getElementById('print-invoice').addEventListener('click', printInvoice);
    
    // Download PDF button
    document.getElementById('download-invoice').addEventListener('click', function() {
        generatePDF();
    });
    
    // Email invoice button
    document.getElementById('email-invoice').addEventListener('click', function() {
        const invoiceData = collectInvoiceData();
        if (!invoiceData.client.email) {
            alert('Por favor, adicione um email de cliente válido antes de enviar a factura.');
            return;
        }
        
        // Confirm before sending
        if (confirm(`Deseja enviar esta factura por email para ${invoiceData.client.email}?`)) {
            sendInvoiceEmail(invoiceData, invoiceData.invoice.email);
        }
    });
    
    // Process payment button
    document.getElementById('process-payment').addEventListener('click', function() {
        const invoiceData = collectInvoiceData();
        processPayment(invoiceData);
    });
    
    // Add SAFT Export button to preview modal
    const previewModalButtons = document.querySelector('#preview-modal .modal-content div');
    const saftButton = document.createElement('button');
    saftButton.id = 'saft-export';
    saftButton.className = 'btn';
    saftButton.style.backgroundColor = '#9C27B0';
    saftButton.textContent = 'SAF-T Export';
    previewModalButtons.insertBefore(saftButton, document.getElementById('close-preview'));
    
    // SAFT Export button event
    document.getElementById('saft-export').addEventListener('click', function() {
        const invoiceData = collectInvoiceData();
        downloadSAFTFile(invoiceData);
    });
    
    // Reset form button
    document.getElementById('reset-form').addEventListener('click', function() {
        if (confirm('Are you sure you want to reset the form? All data will be lost.')) {
            resetInvoiceForm();
        }
    });
    
    // Save invoice button (Generate PDF)
    document.getElementById('save-invoice').addEventListener('click', function() {
        generatePDF();
    });
    
    // Logo upload
    document.getElementById('company-logo').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                // Store logo data URL for later use
                window.companyLogo = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Discount input
    document.getElementById('discount').addEventListener('input', calculateTotals);
}

/**
 * Reset the invoice form
 */
function resetInvoiceForm() {
    document.getElementById('invoice-form').reset();
    
    // Reset items
    const itemsContainer = document.getElementById('invoice-items');
    itemsContainer.innerHTML = '';
    
    // Add a new empty item
    addInvoiceItem();
    
    // Reset dates
    setDefaultDates();
    
    // Reset totals
    calculateTotals();
    
    // Reset template selection
    const templateOptions = document.querySelectorAll('.template-option');
    templateOptions.forEach(opt => opt.classList.remove('selected'));
    document.querySelector('[data-template="template02"]').classList.add('selected');
    
    // Reset color selection
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(opt => opt.classList.remove('selected'));
    document.querySelector('[data-color="#4CAF50"]').classList.add('selected');
    document.documentElement.style.setProperty('--primary-color', '#4CAF50');
    
    // Reset logo
    window.companyLogo = null;
}

/**
 * Show the invoice preview modal
 */
function showInvoiceModal() {
    updatePreview();
    document.getElementById('preview-modal').style.display = 'block';
}

/**
 * Close the invoice preview modal
 */
function closeInvoiceModal() {
    document.getElementById('preview-modal').style.display = 'none';
}

/**
 * Update the preview iframe with current data
 */
function updatePreview() {
    const invoiceData = collectInvoiceData();
    const templateName = getSelectedTemplate();
    
    // Load template and populate it
    loadTemplate(templateName)
        .then(templateContent => {
            // Create a document parser
            const parser = new DOMParser();
            const doc = parser.parseFromString(templateContent, 'text/html');
            
            // Populate template with data
            populateTemplate(doc, templateContent, invoiceData);
            
            // Get the updated HTML
            const serializer = new XMLSerializer();
            const updatedHTML = serializer.serializeToString(doc);
            
            // Set iframe content
            const iframe = document.getElementById('preview-iframe');
            iframe.srcdoc = updatedHTML;
        })
        .catch(error => {
            console.error('Error updating preview:', error);
            alert('Failed to generate preview. Please check the console for errors.');
        });
}

/**
 * Collect all invoice data from the form
 * @returns {Object} The invoice data
 */
function collectInvoiceData() {
    const items = collectItems();
    const currency = document.getElementById('currency').value || 'MZN';
    const discount = parseFloat(document.getElementById('discount').value) || 0;
    
    // Calculate totals
    const subtotal = calculateSubtotal(items);
    const vatAmount = calculateVAT(items);
    const total = calculateTotal(subtotal, vatAmount, discount);
    
    // Set system entry date if not already set
    const systemEntryDateInput = document.getElementById('system-entry-date');
    if (!systemEntryDateInput.value) {
        const now = new Date();
        // Format: YYYY-MM-DDTHH:MM
        const formattedDate = now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0') + 'T' +
            String(now.getHours()).padStart(2, '0') + ':' +
            String(now.getMinutes()).padStart(2, '0');
        systemEntryDateInput.value = formattedDate;
    }
    
    // Get exchange rate
    const exchangeRate = parseFloat(document.getElementById('exchange-rate').value) || 1.0;
    
    // Get recurring schedule if applicable
    const recurringSchedule = getRecurringSchedule();
    
    // Get payment method data
    const paymentMethodData = collectPaymentMethodData();
    
    // Get email settings
    const emailSettings = collectEmailSettings();
    
    // Get custom template settings
    const customHeader = document.getElementById('custom-header') ? document.getElementById('custom-header').value : '';
    const customFooter = document.getElementById('custom-footer') ? document.getElementById('custom-footer').value : '';
    const templateFont = document.getElementById('template-font') ? document.getElementById('template-font').value : 'inter';
    
    return {
        company: {
            name: document.getElementById('company-name').value,
            address: document.getElementById('company-address').value,
            nuit: document.getElementById('company-nuit').value,
            email: document.getElementById('company-email').value,
            phone: document.getElementById('company-phone').value,
            softwareCertNo: document.getElementById('software-cert-no').value
        },
        client: {
            name: document.getElementById('client-name').value,
            address: document.getElementById('client-address').value,
            nuit: document.getElementById('client-nuit').value,
            taxCountry: document.getElementById('client-tax-country').value,
            customerId: document.getElementById('client-customer-id').value,
            accountId: document.getElementById('client-account-id').value,
            email: document.getElementById('client-email').value,
            contact: document.getElementById('client-contact').value
        },
        invoice: {
            number: document.getElementById('invoice-number').value,
            type: document.getElementById('invoice-type').value,
            issueDate: document.getElementById('issue-date').value,
            dueDate: document.getElementById('due-date').value,
            systemEntryDate: document.getElementById('system-entry-date').value,
            projectName: document.getElementById('project-name').value,
            paymentTerms: document.getElementById('payment-terms').value,
            currency: currency,
            exchangeRate: exchangeRate,
            documentStatus: document.getElementById('document-status').value,
            sourceId: document.getElementById('source-id').value,
            recurring: recurringSchedule,
            items: items,
            notes: document.getElementById('notes').value,
            totals: {
                subtotal: subtotal,
                vat: vatAmount,
                discount: discount,
                total: total
            },
            payment: paymentMethodData,
            email: emailSettings
        },
        template: {
            name: getSelectedTemplate(),
            color: getSelectedColor(),
            font: templateFont,
            logo: window.companyLogo || null,
            customHeader: customHeader,
            customFooter: customFooter
        }
    };
}

/**
 * Get the selected template
 * @returns {string} The selected template name
 */
function getSelectedTemplate() {
    const selectedTemplate = document.querySelector('.template-option.selected');
    return selectedTemplate ? selectedTemplate.getAttribute('data-template') : 'template02';
}

/**
 * Get the selected color
 * @returns {string} The selected color code
 */
function getSelectedColor() {
    const selectedColor = document.querySelector('.color-option.selected');
    return selectedColor ? selectedColor.getAttribute('data-color') : '#4CAF50';
}

/**
 * Print the invoice
 */
function printInvoice() {
    const iframe = document.getElementById('preview-iframe');
    iframe.contentWindow.print();
}

/**
 * Format currency value
 * @param {number} value - The value to format
 * @param {string} currency - The currency code
 * @returns {string} The formatted currency string
 */
function formatCurrency(value, currency = 'MZN') {
    return languageManager.formatCurrency(value);
}

/**
 * Process payment for the invoice
 * @param {Object} invoiceData - The invoice data
 */
function processPayment(invoiceData) {
    const paymentMethod = invoiceData.invoice.payment.method;
    const invoiceNumber = invoiceData.invoice.number;
    const totalAmount = invoiceData.invoice.totals.total;
    const currency = invoiceData.invoice.currency;
    
    // Create a modal for payment processing
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '2000';
    
    const content = document.createElement('div');
    content.style.backgroundColor = 'var(--card-color)';
    content.style.borderRadius = '8px';
    content.style.padding = '25px';
    content.style.width = '80%';
    content.style.maxWidth = '600px';
    
    // Format amount
    const formatter = new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: currency
    });
    
    const formattedAmount = formatter.format(totalAmount);
    
    // Create payment content based on method
    let paymentContent = '';
    
    if (paymentMethod === 'bank') {
        const bankName = invoiceData.invoice.payment.bank.name;
        const accountName = invoiceData.invoice.payment.bank.accountName;
        const accountNumber = invoiceData.invoice.payment.bank.accountNumber;
        const branchCode = invoiceData.invoice.payment.bank.branchCode;
        
        paymentContent = `
            <h3>Detalhes da Transferência Bancária</h3>
            <p>Por favor, transfira ${formattedAmount} para a seguinte conta:</p>
            <div style="background-color: rgba(0,0,0,0.05); padding: 15px; border-radius: 4px; margin: 15px 0;">
                <p><strong>Banco:</strong> ${bankName}</p>
                <p><strong>Nome da Conta:</strong> ${accountName}</p>
                <p><strong>Número da Conta:</strong> ${accountNumber}</p>
                <p><strong>Código da Agência:</strong> ${branchCode}</p>
                ${invoiceData.invoice.payment.bank.swiftCode ? `<p><strong>Código SWIFT/BIC:</strong> ${invoiceData.invoice.payment.bank.swiftCode}</p>` : ''}
            </div>
            <p>Use a referência: <strong>${invoiceNumber}</strong></p>
        `;
    } else if (paymentMethod === 'mobile') {
        const provider = invoiceData.invoice.payment.mobile.provider;
        const mobileNumber = invoiceData.invoice.payment.mobile.number;
        const mobileName = invoiceData.invoice.payment.mobile.name;
        
        paymentContent = `
            <h3>Detalhes do Pagamento Móvel</h3>
            <p>Por favor, envie ${formattedAmount} para:</p>
            <div style="background-color: rgba(0,0,0,0.05); padding: 15px; border-radius: 4px; margin: 15px 0;">
                <p><strong>Provedor:</strong> ${provider}</p>
                <p><strong>Número:</strong> ${mobileNumber}</p>
                <p><strong>Nome:</strong> ${mobileName}</p>
            </div>
            <p>Use a referência: <strong>${invoiceNumber}</strong></p>
        `;
    } else if (paymentMethod === 'card') {
        // For card payments, we would normally integrate with a payment gateway
        // For demo purposes, show a simulated card payment form
        paymentContent = `
            <h3>Pagamento com Cartão</h3>
            <p>Total a pagar: ${formattedAmount}</p>
            <div style="margin: 20px 0;">
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Número do Cartão</label>
                    <input type="text" placeholder="1234 5678 9012 3456" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                </div>
                <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 5px;">Data de Validade</label>
                        <input type="text" placeholder="MM/AA" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                    </div>
                    <div style="flex: 1;">
                        <label style="display: block; margin-bottom: 5px;">CVV</label>
                        <input type="text" placeholder="123" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                    </div>
                </div>
                <div style="margin-bottom: 15px;">
                    <label style="display: block; margin-bottom: 5px;">Nome no Cartão</label>
                    <input type="text" placeholder="NOME COMPLETO" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: 4px;">
                </div>
            </div>
        `;
    } else if (paymentMethod === 'cash') {
        paymentContent = `
            <h3>Pagamento em Dinheiro</h3>
            <p>Por favor, pague ${formattedAmount} em dinheiro.</p>
            <p>Referência da Fatura: <strong>${invoiceNumber}</strong></p>
        `;
    } else if (paymentMethod === 'check') {
        paymentContent = `
            <h3>Pagamento com Cheque</h3>
            <p>Por favor, emita um cheque no valor de ${formattedAmount}.</p>
            <p>Pagável a: <strong>${invoiceData.company.name}</strong></p>
            <p>Referência da Fatura: <strong>${invoiceNumber}</strong></p>
        `;
    }
    
    // Set content HTML
    content.innerHTML = `
        <h2 style="margin-top: 0;">Processar Pagamento</h2>
        <p>Fatura #${invoiceNumber}</p>
        <p>Total: ${formattedAmount}</p>
        
        ${paymentContent}
        
        <div style="text-align: right; margin-top: 20px;">
            <button id="close-payment-modal" style="background-color: #F44336; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Cancelar</button>
            <button id="confirm-payment" style="background-color: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-left: 10px;">Confirmar Pagamento</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('close-payment-modal').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    document.getElementById('confirm-payment').addEventListener('click', function() {
        // Simulate payment processing
        showLoading('Processando pagamento...');
        
        setTimeout(() => {
            hideLoading();
            document.body.removeChild(modal);
            alert(`Pagamento para a factura #${invoiceNumber} processado com sucesso!`);
            
            // Optionally mark the invoice as paid
            // markInvoiceAsPaid(invoiceNumber);
        }, 2000);
    });
}