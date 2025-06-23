// js/invoicescripts/invoiceItems.js
// Handles invoice item/product row logic for the invoice module

// Invoice Items Module
class InvoiceItems {
    constructor() {
        console.log('InvoiceItems constructor called');
        if (window.invoiceItems) {
            console.log('InvoiceItems already initialized');
            return window.invoiceItems;
        }
        this.setupEventListeners();
    }

    setupEventListeners() {
        console.log('Setting up event listeners for InvoiceItems');
        
        // Remove any existing listeners to prevent duplicates
        document.removeEventListener('input', this.handleInput);
        document.removeEventListener('click', this.handleClick);
        
        // Bind the handlers to this instance
        this.handleInput = this.handleInput.bind(this);
        this.handleClick = this.handleClick.bind(this);
        
        // Add the event listeners
        document.addEventListener('input', this.handleInput);
        document.addEventListener('click', this.handleClick);
        
        // Setup add item button
        const addItemBtn = document.getElementById('addItemBtn');
        if (addItemBtn) {
            console.log('Add item button found, setting up click handler');
            addItemBtn.addEventListener('click', () => {
                console.log('Add item button clicked');
                this.addInvoiceItem();
            });
        } else {
            console.warn('Add item button not found');
        }

        // Setup initial remove buttons
        this.setupRemoveButtons();
    }

    setupRemoveButtons() {
        console.log('Setting up remove buttons');
        const removeButtons = document.querySelectorAll('.remove-item-btn');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Remove button clicked directly');
                const row = button.closest('.item-row');
                if (row) {
                    console.log('Found row to remove');
                    this.removeInvoiceItem(row);
                }
            });
        });
    }

    handleInput(e) {
        if (e.target.classList.contains('item-description')) {
            const searchTerm = e.target.value.toLowerCase().trim();
            const row = e.target.closest('.item-row');
            
            if (searchTerm.length < 2) {
                this.hideProductSuggestions(row);
                this.hideNewProductForm(row);
                return;
            }

            this.handleProductSearch(searchTerm, row);
        }

        if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-price')) {
            const row = e.target.closest('.item-row');
            if (row) {
                this.calculateRowTotal(row);
                this.updateInvoiceTotals();
            }
        }
    }

    handleClick(e) {
        // Only handle clicks outside product suggestions and new product form
        if (!e.target.closest('.item-description') && 
            !e.target.closest('.product-suggestions') && 
            !e.target.closest('.new-product-form')) {
            const rows = document.querySelectorAll('.item-row');
            rows.forEach(row => {
                this.hideProductSuggestions(row);
                this.hideNewProductForm(row);
            });
        }
    }

    async handleProductSearch(searchTerm, row) {
        try {
            const { data: products, error } = await window.supabase
                .from('products')
                .select('*')
                .ilike('description', `%${searchTerm}%`)
                .limit(5);

            if (error) throw error;

            if (products && products.length > 0) {
                this.showProductSuggestions(row, products);
                this.hideNewProductForm(row);
            } else {
                this.hideProductSuggestions(row);
                this.showNewProductForm(row);
            }
        } catch (err) {
            console.error('Error searching products:', err);
            showNotification('Error searching products: ' + err.message, 'error');
        }
    }

    showProductSuggestions(row, products) {
        const input = row.querySelector('.item-description');
        const rect = input.getBoundingClientRect();
        
        let suggestionsBox = row.querySelector('.product-suggestions');
        if (!suggestionsBox) {
            suggestionsBox = document.createElement('div');
            suggestionsBox.className = 'product-suggestions';
            row.querySelector('td:first-child').appendChild(suggestionsBox);
        }

        suggestionsBox.innerHTML = products.map(product => `
            <div class="suggestion-item" data-product='${JSON.stringify(product)}'>
                <div>${product.description}</div>
                <div class="suggestion-price">${this.formatCurrency(product.price)}</div>
            </div>
        `).join('');

        suggestionsBox.style.top = (rect.height) + 'px';
        suggestionsBox.style.display = 'block';

        suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const product = JSON.parse(item.dataset.product);
                this.fillProductDetails(row, product);
                this.hideProductSuggestions(row);
            });
        });
    }

    fillProductDetails(row, product) {
        if (!row || !product) return;

        const descriptionInput = row.querySelector('.item-description');
        const priceInput = row.querySelector('.item-price');
        const quantityInput = row.querySelector('.item-quantity');
        
        if (descriptionInput) descriptionInput.value = product.description || '';
        if (priceInput) priceInput.value = product.price || 0;
        if (quantityInput) quantityInput.value = 1;
        
        this.calculateRowTotal(row);
        this.updateInvoiceTotals();
    }

    showNewProductForm(row) {
        let newProductForm = row.querySelector('.new-product-form');
        if (!newProductForm) {
            newProductForm = document.createElement('div');
            newProductForm.className = 'new-product-form';
            newProductForm.innerHTML = `
                <h4>Add New Product</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Price</label>
                        <input type="number" class="new-product-price" step="0.01" min="0" required>
                    </div>
                    <div class="form-group">
                        <label>VAT Rate</label>
                        <select class="new-product-vat">
                            <option value="0.16">16%</option>
                            <option value="0.05">5%</option>
                            <option value="0">Exempt</option>
                        </select>
                    </div>
                    <button type="button" class="save-product-btn">Save Product</button>
                </div>
            `;
            row.querySelector('td:first-child').appendChild(newProductForm);

            newProductForm.querySelector('.save-product-btn').addEventListener('click', async () => {
                await this.saveNewProduct(row);
            });
        }
        newProductForm.style.display = 'block';
    }

    hideProductSuggestions(row) {
        const suggestionsBox = row.querySelector('.product-suggestions');
        if (suggestionsBox) {
            suggestionsBox.style.display = 'none';
        }
    }

    hideNewProductForm(row) {
        const newProductForm = row.querySelector('.new-product-form');
        if (newProductForm) {
            newProductForm.style.display = 'none';
        }
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('pt-MZ', {
            style: 'currency',
            currency: 'MZN'
        }).format(amount);
    }

    calculateRowTotal(row) {
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.item-price').value) || 0;
        
        const subtotal = quantity * price;
        const vat = subtotal * 0.16; // 16% VAT
        
        row.querySelector('.item-vat').textContent = this.formatCurrency(vat);
        row.querySelector('.item-total').textContent = this.formatCurrency(subtotal + vat);
    }

    updateInvoiceTotals() {
        const rows = document.querySelectorAll('.item-row');
        let subtotal = 0;
        let totalVat = 0;
        
        rows.forEach(row => {
            const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
            const price = parseFloat(row.querySelector('.item-price').value) || 0;
            
            const rowSubtotal = quantity * price;
            const rowVat = rowSubtotal * 0.16;
            
            subtotal += rowSubtotal;
            totalVat += rowVat;
        });
        
        const grandTotal = subtotal + totalVat;
        document.getElementById('subtotal').textContent = this.formatCurrency(subtotal);
        document.getElementById('totalVat').textContent = this.formatCurrency(totalVat);
        document.getElementById('invoiceTotal').textContent = this.formatCurrency(grandTotal);

        // Show converted total if not MZN
        const currency = window.invoiceForm?.currentCurrency || 'MZN';
        const rate = window.invoiceForm?.currentRate;
        let converted = '';
        let convertedTotal = null;
        if (currency !== 'MZN' && rate && !isNaN(rate)) {
            convertedTotal = window.invoiceForm.getConvertedAmount(grandTotal);
            if (convertedTotal !== null) {
                converted = `${convertedTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${currency} (1 MZN ≈ ${rate.toFixed(4)} ${currency})`;
            } else {
                converted = 'Exchange rate unavailable.';
            }
        }
        let convertedDiv = document.getElementById('convertedTotalInfo');
        if (!convertedDiv) {
            convertedDiv = document.createElement('div');
            convertedDiv.id = 'convertedTotalInfo';
            convertedDiv.style.fontSize = '0.95em';
            convertedDiv.style.color = '#555';
            document.getElementById('invoiceTotal').parentElement.appendChild(convertedDiv);
        }
        convertedDiv.textContent = converted;
    }

    addInvoiceItem() {
        console.log('Adding new invoice item');
        const itemsTableBody = document.querySelector('#itemsTable tbody');
        if (!itemsTableBody) {
            console.error('Items table body not found');
            return;
        }

        const newRowHTML = `
            <tr class="item-row">
                <td>
                    <div class="item-description-wrapper">
                        <input type="text" class="item-description" placeholder="Enter item description">
                        <div class="product-suggestions" style="display: none;"></div>
                    </div>
                </td>
                <td>
                    <input type="number" class="item-quantity" value="1" min="1" step="1">
                </td>
                <td>
                    <input type="number" class="item-price" value="0.00" min="0" step="0.01">
                </td>
                <td>
                    <span class="item-vat">0.00</span>
                </td>
                <td>
                    <span class="item-total">0.00</span>
                </td>
                <td>
                    <button type="button" class="remove-item-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
        
        itemsTableBody.insertAdjacentHTML('beforeend', newRowHTML);
        console.log('New row added to table');
        
        const newRow = itemsTableBody.lastElementChild;
        
        // Setup remove button for the new row
        const removeBtn = newRow.querySelector('.remove-item-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('New remove button clicked');
                this.removeInvoiceItem(newRow);
            });
        }
        
        this.calculateRowTotal(newRow);
        this.updateInvoiceTotals();
    }

    removeInvoiceItem(row) {
        console.log('removeInvoiceItem called for row:', row);
        
        const itemsTableBody = document.querySelector('#itemsTable tbody');
        if (!itemsTableBody) {
            console.error('Table body not found');
            return;
        }
        
        const rows = itemsTableBody.querySelectorAll('.item-row');
        console.log('Current number of rows:', rows.length);
        
        if (rows.length <= 1) {
            console.log('Cannot remove last row');
            showNotification('Cannot remove the last item row', 'warning');
            return;
        }
        
        try {
            console.log('Removing row');
            row.remove();
            console.log('Row removed successfully');
            this.updateInvoiceTotals();
            console.log('Totals updated');
        } catch (error) {
            console.error('Error removing row:', error);
            showNotification('Error removing item: ' + error.message, 'error');
        }
    }

    async saveNewProduct(row) {
        try {
            const form = row.querySelector('.new-product-form');
            const description = row.querySelector('.item-description').value;
            const price = parseFloat(form.querySelector('.new-product-price').value);
            const vatRate = parseFloat(form.querySelector('.new-product-vat').value);

            if (!description || isNaN(price)) {
                throw new Error('Please fill in all required fields');
            }

            const { data: product, error } = await window.supabase
                .from('products')
                .insert([{
                    description,
                    price,
                    tax_rate: vatRate
                }])
                .select()
                .single();

            if (error) throw error;

            this.fillProductDetails(row, product);
            this.hideNewProductForm(row);
            showNotification('Product saved successfully', 'success');

        } catch (error) {
            console.error('Error saving product:', error);
            showNotification('Error saving product: ' + error.message, 'error');
        }
    }
}

// Export to window object
if (typeof window !== 'undefined') {
    console.log('Initializing InvoiceItems');
    window.InvoiceItems = InvoiceItems;
    
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('DOM loaded, initializing InvoiceItems');
            window.invoiceItems = new InvoiceItems();
        });
    } else {
        console.log('DOM already loaded, initializing InvoiceItems immediately');
        window.invoiceItems = new InvoiceItems();
    }
}
