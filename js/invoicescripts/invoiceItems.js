// js/invoicescripts/invoiceItems.js
// Handles product search, product suggestions, and new product creation for the invoice module

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
        // Only handle product search input
        document.removeEventListener('input', this.handleInput);
        document.removeEventListener('click', this.handleClick);
        this.handleInput = this.handleInput.bind(this);
        this.handleClick = this.handleClick.bind(this);
        document.addEventListener('input', this.handleInput);
        document.addEventListener('click', this.handleClick);
        // Setup initial remove buttons (for removing rows, but not calculation)
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
        // Only handle product search
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
            // AI suggestion logic (debounced)
            this.debouncedAISuggestion = this.debouncedAISuggestion || debounce(async (input, row) => {
                const aiSuggestion = await getAISuggestionForProductDescription(input);
                this.showAISuggestion(row, aiSuggestion);
            }, 400);
            this.debouncedAISuggestion(searchTerm, row);

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

    showAISuggestion(row, suggestion) {
        if (!suggestion) return;
        let aiBox = row.querySelector('.ai-suggestion-box');
        if (!aiBox) {
            aiBox = document.createElement('div');
            aiBox.className = 'ai-suggestion-box';
            aiBox.style.background = '#f0f6ff';
            aiBox.style.border = '1px solid #b3d1ff';
            aiBox.style.padding = '6px 10px';
            aiBox.style.marginBottom = '2px';
            aiBox.style.cursor = 'pointer';
            aiBox.style.fontStyle = 'italic';
            row.querySelector('td:first-child').prepend(aiBox);
        }
        aiBox.textContent = 'Sugestão IA: ' + suggestion;
        aiBox.style.display = 'block';
        aiBox.onclick = () => {
            const input = row.querySelector('.item-description');
            if (input) input.value = suggestion;
            aiBox.style.display = 'none';
            // Optionally trigger input event for downstream logic
            input.dispatchEvent(new Event('input', { bubbles: true }));
        };
    }

    fillProductDetails(row, product) {
        if (!row || !product) return;
        const descriptionInput = row.querySelector('.item-description');
        const priceInput = row.querySelector('.item-price');
        const quantityInput = row.querySelector('.item-quantity');
        if (descriptionInput) descriptionInput.value = product.description || '';
        if (priceInput) priceInput.value = product.price || 0;
        if (quantityInput) quantityInput.value = 1;
        // Set discount type to 'none' and value to 0 by default
        const discountTypeInput = row.querySelector('.item-discount-type');
        const discountValueInput = row.querySelector('.item-discount-value');
        if (discountTypeInput) discountTypeInput.value = 'none';
        if (discountValueInput) discountValueInput.value = 0;
        // Trigger calculation immediately
        if (window.invoiceForm && typeof window.invoiceForm.updateItemRow === 'function') {
            window.invoiceForm.updateItemRow(row);
        }
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
                    <select class="item-discount-type">
                        <option value="none">None</option>
                        <option value="percent">Percent (%)</option>
                        <option value="fixed">Fixed</option>
                    </select>
                </td>
                <td>
                    <input type="number" class="item-discount-value" min="0" step="0.01" style="display:none;" placeholder="Discount">
                </td>
                <td>
                    <span class="item-discounted-subtotal">0.00</span>
                </td>
                <td>
                    <select class="item-vat-rate">
                        <option value="0.16">16%</option>
                        <option value="0.05">5%</option>
                        <option value="0">0% (Exempt)</option>
                        <option value="other">Other</option>
                    </select>
                    <input type="number" class="item-vat-other" min="0" max="100" step="0.01" placeholder="VAT %" style="display:none;width:60px;">
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

// --- AI Suggestion Helper ---
function debounce(fn, delay) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

async function getAISuggestionForProductDescription(input) {
    if (!input || input.length < 2) return '';
    try {
        // Use the same endpoint as walaka-assistant.js
        const url = "https://qvmtozjvjflygbkjecyj.supabase.co/functions/v1/walaka-assistant";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo";
        const messages = [
            { role: 'system', content: 'Você é um assistente de ERP. Sugira uma descrição de produto/serviço para uma linha de fatura, baseada no input parcial do utilizador. Seja breve e relevante para negócios em Moçambique.' },
            { role: 'user', content: `Descrição parcial: ${input}` }
        ];
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ messages })
        });
        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
            return data.choices[0].message.content.trim();
        }
        return '';
    } catch (e) {
        return '';
    }
}
