// js/invoicescripts/invoiceItems.js
// Handles invoice item/product row logic for the invoice module

function setupItemCalculations() {
    // Add event listeners for quantity and price changes
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('item-description')) {
            const searchTerm = e.target.value.toLowerCase().trim();
            const row = e.target.closest('.item-row');
            if (searchTerm.length < 2) {
                hideProductSuggestions(row);
                hideNewProductForm(row);
                return;
            }
            handleProductSearch(searchTerm, row);
        }
        if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-price')) {
            const row = e.target.closest('.item-row');
            if (row) {
                calculateRowTotal(row);
                updateInvoiceTotals();
            }
        }
    });
}

async function handleProductSearch(searchTerm, row) {
    try {
        const { data: products, error } = await window.supabase
            .from('products')
            .select('*')
            .ilike('description', `%${searchTerm}%`)
            .limit(5);
        if (error) return;
        if (products && products.length > 0) {
            showProductSuggestions(row, products);
            hideNewProductForm(row);
        } else {
            hideProductSuggestions(row);
            showNewProductForm(row);
        }
    } catch (err) {
        console.error('Error searching products:', err);
    }
}

function showProductSuggestions(row, products) {
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
            <div class="suggestion-price">${formatCurrency(product.price)}</div>
        </div>
    `).join('');
    suggestionsBox.style.top = (rect.height) + 'px';
    suggestionsBox.style.display = 'block';
    suggestionsBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function() {
            const product = JSON.parse(this.dataset.product);
            fillProductDetails(row, product);
            hideProductSuggestions(row);
        });
    });
}

function fillProductDetails(row, product) {
    if (!row || !product) return;
    const descriptionInput = row.querySelector('.item-description');
    const priceInput = row.querySelector('.item-price');
    const quantityInput = row.querySelector('.item-quantity');
    if (descriptionInput) descriptionInput.value = product.description || '';
    if (priceInput) priceInput.value = product.price || 0;
    if (quantityInput) quantityInput.value = 1;
    // Set VAT rate based on product tax_rate or default to 16%
    const vatRate = product.tax_rate || 0.16;
    calculateRowTotal(row);
    updateInvoiceTotals();
}

function showNewProductForm(row) {
    let newProductForm = row.querySelector('.new-product-form');
    if (!newProductForm) {
        newProductForm = document.createElement('div');
        newProductForm.className = 'new-product-form';
        newProductForm.innerHTML = `
            <h4>Add New Product</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>Price</label>
                    <input type="number" class="new-product-price" name="new-product-price" step="0.01" min="0" required>
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
        newProductForm.querySelector('.save-product-btn').addEventListener('click', async () => {
            await saveNewProduct(row);
        });
    }
    newProductForm.style.display = 'block'; // Ensure the form is visible
    newProductForm.querySelector('.new-product-price').focus(); // Focus the input field
}

function hideProductSuggestions(row) {
    const suggestionsBox = row.querySelector('.product-suggestions');
    if (suggestionsBox) suggestionsBox.style.display = 'none';
}

function hideNewProductForm(row) {
    const newProductForm = row.querySelector('.new-product-form');
    if (newProductForm) newProductForm.style.display = 'none';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: 'MZN'
    }).format(amount);
}

function calculateRowTotal(row) {
    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
    const price = parseFloat(row.querySelector('.item-price').value) || 0;
    const subtotal = quantity * price;
    const vat = subtotal * 0.16;
    row.querySelector('.item-vat').textContent = vat.toFixed(2);
    row.querySelector('.item-total').textContent = (subtotal + vat).toFixed(2);
}

function updateInvoiceTotals() {
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

function addInvoiceItem() {
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
    const newRow = itemsTableBody.lastElementChild;
    calculateRowTotal(newRow);
    updateInvoiceTotals();
}

// Setup product suggestions for invoice items (called from invoices.html)
function setupProductSuggestions() {
    // This function can be expanded as needed, but for now, ensure it exists globally
    // and can be called to re-initialize any product suggestion logic if needed.
    // If you have logic to initialize product suggestions, add it here.
}
window.setupProductSuggestions = setupProductSuggestions;
