/**
 * Initialize payment methods functionality
 */
function initPaymentMethods() {
    // Handle payment method changes
    const paymentMethodSelect = document.getElementById('payment-method');
    const bankDetails = document.getElementById('bank-details');
    const mobileDetails = document.getElementById('mobile-details');
    const cardDetails = document.getElementById('card-details');
    
    if (!paymentMethodSelect) return;
    
    paymentMethodSelect.addEventListener('change', function() {
        // Hide all payment details sections
        bankDetails.style.display = 'none';
        mobileDetails.style.display = 'none';
        cardDetails.style.display = 'none';
        
        // Show the selected section
        const selectedMethod = this.value;
        if (selectedMethod === 'bank') {
            bankDetails.style.display = 'block';
        } else if (selectedMethod === 'mobile') {
            mobileDetails.style.display = 'block';
        } else if (selectedMethod === 'card') {
            cardDetails.style.display = 'block';
        }
    });
    
    // Initialize exchange rate updater
    const exchangeRateButton = document.getElementById('update-exchange-rate');
    if (exchangeRateButton) {
        exchangeRateButton.addEventListener('click', updateExchangeRate);
    }
    
    // Handle currency changes
    const currencySelect = document.getElementById('currency');
    if (currencySelect) {
        currencySelect.addEventListener('change', function() {
            const selectedCurrency = this.value;
            if (selectedCurrency === 'MZN') {
                document.getElementById('exchange-rate').value = '1.00';
            } else {
                // Suggest updating the exchange rate
                const shouldUpdate = confirm('Deseja atualizar a taxa de câmbio para a moeda selecionada?');
                if (shouldUpdate) {
                    updateExchangeRate();
                }
            }
        });
    }
}

/**
 * Update exchange rate (simulated for now)
 */
function updateExchangeRate() {
    const currency = document.getElementById('currency').value;
    const exchangeRateInput = document.getElementById('exchange-rate');
    
    // Show loading indicator
    exchangeRateInput.disabled = true;
    document.getElementById('update-exchange-rate').textContent = 'Atualizando...';
    
    // Simulate API call to get exchange rates
    setTimeout(() => {
        // Simulated exchange rates (in a real app, these would come from an API)
        const rates = {
            'MZN': 1.0,
            'USD': 63.5,
            'EUR': 68.2,
            'ZAR': 3.5,
            'GBP': 81.7,
            'AOA': 0.075,
            'CHF': 71.3,
            'CNY': 8.8
        };
        
        // Update exchange rate with slight randomization to simulate real market fluctuations
        const baseRate = rates[currency] || 1.0;
        const randomFactor = 0.98 + (Math.random() * 0.04); // Random factor between 0.98 and 1.02
        const newRate = (baseRate * randomFactor).toFixed(2);
        
        exchangeRateInput.value = newRate;
        exchangeRateInput.disabled = false;
        document.getElementById('update-exchange-rate').textContent = 'Atualizar';
        
        // Update displayed totals with new rate
        calculateTotals();
        
        // Show confirmation message
        alert(`Taxa de câmbio atualizada: 1 ${currency} = ${newRate} MZN`);
    }, 1500);
}

/**
 * Collect payment method data
 * @returns {Object} Payment method data
 */
function collectPaymentMethodData() {
    const paymentMethod = document.getElementById('payment-method').value;
    let data = {
        method: paymentMethod,
        reference: document.getElementById('payment-reference').value,
        dueReminder: document.getElementById('payment-due-reminder').value
    };
    
    // Add method-specific details
    if (paymentMethod === 'bank') {
        data.bank = {
            name: document.getElementById('bank-name').value,
            accountName: document.getElementById('account-name').value,
            accountNumber: document.getElementById('account-number').value,
            branchCode: document.getElementById('branch-code').value,
            swiftCode: document.getElementById('swift-code').value,
            instructions: document.getElementById('bank-instructions').value
        };
    } else if (paymentMethod === 'mobile') {
        data.mobile = {
            provider: document.getElementById('mobile-provider').value,
            number: document.getElementById('mobile-number').value,
            name: document.getElementById('mobile-name').value,
            instructions: document.getElementById('mobile-instructions').value
        };
    } else if (paymentMethod === 'card') {
        data.card = {
            acceptedCards: {
                visa: document.querySelector('input[name="card-visa"]').checked,
                mastercard: document.querySelector('input[name="card-mastercard"]').checked,
                amex: document.querySelector('input[name="card-amex"]').checked,
                other: document.querySelector('input[name="card-other"]').checked
            },
            instructions: document.getElementById('card-instructions').value
        };
    }
    
    return data;
}

/**
 * Handle recurring invoice settings
 */
function initRecurringInvoice() {
    const recurringSelect = document.getElementById('recurring-invoice');
    const recurringDetails = document.querySelectorAll('.recurring-details');
    
    if (!recurringSelect) return;
    
    recurringSelect.addEventListener('change', function() {
        const isRecurring = this.value !== 'none';
        
        // Show/hide recurring details
        recurringDetails.forEach(elem => {
            elem.style.display = isRecurring ? 'block' : 'none';
        });
        
        // Set default start date to today if not set
        if (isRecurring) {
            const startDateInput = document.getElementById('recurring-start');
            if (!startDateInput.value) {
                startDateInput.valueAsDate = new Date();
            }
        }
    });
}

/**
 * Get recurring schedule for invoice
 * @returns {Object|null} Recurring schedule data or null if not recurring
 */
function getRecurringSchedule() {
    const recurringType = document.getElementById('recurring-invoice').value;
    
    if (recurringType === 'none') {
        return null;
    }
    
    return {
        frequency: recurringType,
        startDate: document.getElementById('recurring-start').value,
        endDate: document.getElementById('recurring-end').value || null,
        count: document.getElementById('recurring-count').value || null
    };
}

/**
 * Calculate future dates for recurring invoices
 * @param {Date} startDate - The start date
 * @param {string} frequency - The frequency (weekly, monthly, quarterly, yearly)
 * @param {number} count - Number of occurrences
 * @returns {Array} Array of future dates
 */
function calculateRecurringDates(startDate, frequency, count) {
    const dates = [];
    let currentDate = new Date(startDate);
    
    for (let i = 0; i < count; i++) {
        // Create a copy of the current date to avoid modifying it
        dates.push(new Date(currentDate));
        
        // Calculate next date based on frequency
        if (frequency === 'weekly') {
            currentDate.setDate(currentDate.getDate() + 7);
        } else if (frequency === 'monthly') {
            currentDate.setMonth(currentDate.getMonth() + 1);
        } else if (frequency === 'quarterly') {
            currentDate.setMonth(currentDate.getMonth() + 3);
        } else if (frequency === 'yearly') {
            currentDate.setFullYear(currentDate.getFullYear() + 1);
        }
    }
    
    return dates;
}