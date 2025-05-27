// Invoice Form Module
class InvoiceForm {
    constructor() {
        this.supabase = window.supabase;
        this.initializeDateFields();
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
                invoice_number: invoiceData.invoiceNumber,
                issue_date: invoiceData.issueDate,
                due_date: invoiceData.dueDate,
                status: invoiceData.status || 'pending',
                currency: invoiceData.currency,
                client_data: {
                    name: invoiceData.client.name,
                    email: invoiceData.client.email,
                    address: invoiceData.client.address,
                    taxId: invoiceData.client.taxId,
                    contact: invoiceData.client.contact
                },
                items: invoiceData.items,
                totals: {
                    subtotal: invoiceData.subtotal,
                    vat: invoiceData.totalVat,
                    total: invoiceData.total
                },
                notes: invoiceData.notes,
                payment_terms: invoiceData.paymentTerms
            };

            const { data, error } = await this.supabase
                .from('invoices')
                .insert([formattedData])
                .select();

            if (error) throw error;

            showNotification('Invoice saved successfully', 'success');
            return data[0];
        } catch (error) {
            console.error('Error saving invoice:', error);
            showNotification('Error saving invoice: ' + error.message, 'error');
            throw error;
        }
    }
}

// Initialize and attach to window
const invoiceForm = new InvoiceForm();
window.invoiceForm = invoiceForm; 