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
                return;
            }
            this.handleProductSearch(searchTerm, row);
        }
    }

    handleClick(e) {
        // Only handle clicks outside product suggestions and new product form
        if (!e.target.closest('.item-description') && 
            !e.target.closest('.product-suggestions')) {
            const rows = document.querySelectorAll('.item-row');
            rows.forEach(row => {
                this.hideProductSuggestions(row);
            });
        }
    }

    async handleProductSearch(searchTerm, row) {
        try {
            // AI suggestion logic (debounced) - REMOVE
            // this.debouncedAISuggestion = this.debouncedAISuggestion || debounce(async (input, row) => {
            //     const aiSuggestion = await getAISuggestionForProductDescription(input);
            //     this.showAISuggestion(row, aiSuggestion);
            // }, 400);
            // this.debouncedAISuggestion(searchTerm, row);

            const { data: products, error } = await window.supabase
                .from('products')
                .select('*')
                .ilike('description', `%${searchTerm}%`)
                .limit(5);
            if (error) throw error;
            if (products && products.length > 0) {
                this.showProductSuggestions(row, products);
            } else {
                this.hideProductSuggestions(row);
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
        let html = '';
        if (products.length > 0) {
            html += products.map(product => `
                <div class="suggestion-item" data-product='${JSON.stringify(product)}'>
                    <span>${product.description}</span>
                    <span class="suggestion-price">${this.formatCurrency(product.price)}</span>
                </div>
            `).join('');
        } else {
            html += '<div class="no-suggestions">No products found.</div>';
        }
        suggestionsBox.innerHTML = html;
        suggestionsBox.style.top = (rect.height) + 'px';
        suggestionsBox.style.display = 'block';
        // Add click handlers for suggestion items (not a button)
        suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                const product = JSON.parse(item.dataset.product);
                this.fillProductDetails(row, product);
                this.hideProductSuggestions(row);
            });
        });
        // Always update shimmer after showing suggestions
        updateAddProductShimmer(input, products);
    }

    // --- REMOVE AI SUGGESTION LOGIC FOR ITEM DESCRIPTION ---
    // Comment out the showAISuggestion method
    // InvoiceItems.prototype.showAISuggestion = function(row, suggestion) { ... };
    // Comment out the getAISuggestionForProductDescription function
    // async function getAISuggestionForProductDescription(input) { ... }

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

    // Remove showNewProductForm and all inline new-product-form logic
    // Remove any references to showNewProductForm, new-product-form, save-product-btn, etc.
    // (No need to define showNewProductForm or saveNewProduct for inline use)

    hideProductSuggestions(row) {
        const suggestionsBox = row.querySelector('.product-suggestions');
        if (suggestionsBox) {
            suggestionsBox.style.display = 'none';
        }
    }

    // Remove hideNewProductForm
    // hideNewProductForm(row) {
    //     const newProductForm = row.querySelector('.new-product-form');
    //     if (newProductForm) {
    //         newProductForm.style.display = 'none';
    //     }
    // }

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

    // Remove saveNewProduct
    // async saveNewProduct(row) {
    //     try {
    //         const form = row.querySelector('.new-product-form');
    //         const description = row.querySelector('.item-description').value;
    //         const price = parseFloat(form.querySelector('.new-product-price').value);
    //         const vatRate = parseFloat(form.querySelector('.new-product-vat').value);
    //         if (!description || isNaN(price)) {
    //             throw new Error('Please fill in all required fields');
    //         }
    //         const { data: product, error } = await window.supabase
    //             .from('products')
    //             .insert([{
    //                 description,
    //                 price,
    //                 tax_rate: vatRate
    //             }])
    //             .select()
    //             .single();
    //         if (error) throw error;
    //         // Optionally update a global cache here
    //         this.fillProductDetails(row, product);
    //         this.hideNewProductForm(row);
    //         // Refresh suggestions and auto-select new product
    //         this.showProductSuggestions(row, [product]);
    //         showNotification('Product saved successfully', 'success');
    //     } catch (error) {
    //         console.error('Error saving product:', error);
    //         showNotification('Error saving product: ' + error.message, 'error');
    //     }
    // }
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

// --- REMOVE AI SUGGESTION LOGIC FOR ITEM DESCRIPTION ---
// Comment out the debouncedAISuggestion and showAISuggestion logic in handleProductSearch
// handleProductSearch(searchTerm, row) {
//     try {
//         // AI suggestion logic (debounced) - REMOVE
//         // this.debouncedAISuggestion = this.debouncedAISuggestion || debounce(async (input, row) => {
//         //     const aiSuggestion = await getAISuggestionForProductDescription(input);
//         //     this.showAISuggestion(row, aiSuggestion);
//         // }, 400);
//         // this.debouncedAISuggestion(searchTerm, row);

//         window.supabase
//             .from('products')
//             .select('*')
//             .ilike('description', `%${searchTerm}%`)
//             .limit(5)
//             .then(({ data: products, error }) => {
//                 if (error) throw error;
//                 if (products && products.length > 0) {
//                     this.showProductSuggestions(row, products);
//                     this.hideNewProductForm(row);
//                 } else {
//                     this.hideProductSuggestions(row);
//                     this.showNewProductForm(row);
//                 }
//             });
//     } catch (err) {
//         console.error('Error searching products:', err);
//         showNotification('Error searching products: ' + err.message, 'error');
//     }
// }
// Comment out the showAISuggestion method
// InvoiceItems.prototype.showAISuggestion = function(row, suggestion) { ... };
// Comment out the getAISuggestionForProductDescription function
// async function getAISuggestionForProductDescription(input) { ... }

// Helper to update shimmer on Add Product button
function updateAddProductShimmer(input, products) {
    const addProductBtn = document.getElementById('addProductBtn');
    if (!addProductBtn) return;
    addProductBtn.style.marginLeft = '18px';
    const inputValue = input.value.trim().toLowerCase();
    const hasMatch = inputValue.length > 0 && products.some(p => p.description && p.description.toLowerCase().includes(inputValue));
    if (inputValue.length > 0 && !hasMatch) {
        addProductBtn.classList.add('shimmer-blue-add-product');
        console.log('[AddProductShimmer] SHIMMER ON:', inputValue, '(no match)');
    } else {
        addProductBtn.classList.remove('shimmer-blue-add-product');
        console.log('[AddProductShimmer] SHIMMER OFF:', inputValue, '(match or empty)');
    }
}

// Simpler, reliable shimmer animation for Add Product button (pulse effect)
if (typeof window !== 'undefined') {
    const style = document.createElement('style');
    style.innerHTML = `
#addProductBtn.shimmer-blue-add-product {
  position: relative;
  border: 2px solid #3b82f6;
  animation: shimmer-blue-pulse 2.5s cubic-bezier(0.4,0,0.2,1) infinite;
  box-shadow: 0 0 0 0 #3b82f6;
}
@keyframes shimmer-blue-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(59,130,246,0.10); }
  50%  { box-shadow: 0 0 0 4px rgba(59,130,246,0.13); }
  100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.10); }
}
#addProductBtn { margin-left: 18px !important; }
`;
    document.head.appendChild(style);
}

// Show suggestions on focus, even if input is empty
if (typeof window !== 'undefined') {
    document.addEventListener('focusin', function(e) {
        if (e.target.classList && e.target.classList.contains('item-description')) {
            const row = e.target.closest('.item-row');
            // If input is empty, show all products (or a default set)
            const searchTerm = e.target.value.trim();
            if (searchTerm.length < 2) {
                // Fetch all or default products
                window.supabase
                    .from('products')
                    .select('*')
                    .limit(10)
                    .then(({ data: products, error }) => {
                        if (!error && products) {
                            if (window.invoiceItems && typeof window.invoiceItems.showProductSuggestions === 'function') {
                                window.invoiceItems.showProductSuggestions(row, products);
                            }
                        }
                    });
            }
        }
    });
}

// Also update shimmer on every input event
if (typeof window !== 'undefined') {
    document.addEventListener('input', function(e) {
        if (e.target.classList && e.target.classList.contains('item-description')) {
            const row = e.target.closest('.item-row');
            // Use the latest products from the last suggestion fetch, or fetch all if needed
            // For reliability, fetch products matching the input
            const searchTerm = e.target.value.trim();
            if (window.supabase) {
                window.supabase
                    .from('products')
                    .select('*')
                    .ilike('description', `%${searchTerm}%`)
                    .then(({ data: products, error }) => {
                        if (!error && products) {
                            updateAddProductShimmer(e.target, products);
                        }
                    });
            }
        }
    });
}
