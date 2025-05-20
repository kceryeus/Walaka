// js/invoicescripts/invoiceItems.js
// Handles invoice item/product row logic for the invoice module

// Invoice Items Module
class InvoiceItems {
    constructor() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('input', (e) => {
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
        });
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

        // Position suggestions box
        suggestionsBox.style.top = (rect.height) + 'px';
        suggestionsBox.style.display = 'block';

        // Add click handlers
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
        
        // Fill in the product details
        if (descriptionInput) descriptionInput.value = product.description || '';
        if (priceInput) priceInput.value = product.price || 0;
        if (quantityInput) quantityInput.value = 1; // Default quantity
        
        // Calculate totals
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
                    <button type="button" class="save-product-btn">Save & Use</button>
                </div>
            `;
            row.querySelector('td:first-child').appendChild(newProductForm);

            // Add save handler
            newProductForm.querySelector('.save-product-btn').addEventListener('click', async () => {
                await this.saveNewProduct(row);
            });
        }
        newProductForm.style.display = 'block';
        newProductForm.querySelector('.new-product-price').focus();
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
        
        row.querySelector('.item-vat').textContent = vat.toFixed(2);
        row.querySelector('.item-total').textContent = (subtotal + vat).toFixed(2);
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
        
        document.getElementById('subtotal').textContent = subtotal.toFixed(2);
        document.getElementById('totalVat').textContent = totalVat.toFixed(2);
        document.getElementById('invoiceTotal').textContent = grandTotal.toFixed(2);
    }

    addInvoiceItem() {
        const itemsTableBody = document.querySelector('#itemsTable tbody');
        const newRowHTML = `
            <tr class="item-row">
                <td>
                    <input type="text" class="item-description" placeholder="Enter item description">
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
        
        // Initialize the new row
        const newRow = itemsTableBody.lastElementChild;
        this.calculateRowTotal(newRow);
        this.updateInvoiceTotals();
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
            window.showNotification('Product saved successfully');

        } catch (error) {
            console.error('Error saving product:', error);
            window.showNotification('Error saving product: ' + error.message);
        }
    }
}

// Initialize and attach to window
const invoiceItems = new InvoiceItems();
window.invoiceItems = invoiceItems;
