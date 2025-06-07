// Initialize Supabase client
const supabase = window.supabase;

// DOM Elements
const receiptsTable = document.getElementById('receiptsTable');
const createReceiptBtn = document.getElementById('createReceiptBtn');
const createReceiptModal = document.getElementById('createReceiptModal');
const receiptForm = document.getElementById('receiptForm');
const searchInput = document.querySelector('.search-box input');
const statusFilter = document.querySelector('.filter-dropdown select');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadReceipts();
    setupEventListeners();
});

function setupEventListeners() {
    // Create Receipt Button
    createReceiptBtn?.addEventListener('click', () => {
        createReceiptModal.style.display = 'block';
    });

    // Close Modal Buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            createReceiptModal.style.display = 'none';
            document.getElementById('viewReceiptModal').style.display = 'none';
        });
    });

    // Search Input
    searchInput?.addEventListener('input', (e) => {
        filterReceipts(e.target.value);
    });

    // Status Filter
    statusFilter?.addEventListener('change', (e) => {
        filterReceiptsByStatus(e.target.value);
    });

    // Form Submit
    receiptForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createReceipt();
    });
}

async function loadReceipts() {
    try {
        const { data: receipts, error } = await supabase
            .from('receipts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayReceipts(receipts);
    } catch (error) {
        console.error('Error loading receipts:', error);
        showNotification('Error loading receipts', 'error');
    }
}

function displayReceipts(receipts) {
    const tbody = receiptsTable.querySelector('tbody');
    tbody.innerHTML = '';

    receipts.forEach(receipt => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${receipt.receipt_number}</td>
            <td>${receipt.client_name}</td>
            <td>${formatDate(receipt.payment_date)}</td>
            <td>${formatCurrency(receipt.amount)}</td>
            <td>${receipt.payment_method}</td>
            <td>${receipt.related_invoice || '-'}</td>
            <td><span class="status-badge status-${receipt.status.toLowerCase()}">${receipt.status}</span></td>
            <td class="actions-cell">
                <button class="action-btn view-btn" onclick="viewReceipt('${receipt.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn edit-btn" onclick="editReceipt('${receipt.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete-btn" onclick="deleteReceipt('${receipt.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function createReceipt() {
    try {
        const formData = new FormData(receiptForm);
        const receiptData = {
            receipt_number: formData.get('receiptNumber'),
            client_id: formData.get('client'),
            payment_date: formData.get('paymentDate'),
            amount: formData.get('amount'),
            payment_method: formData.get('paymentMethod'),
            related_invoice: formData.get('relatedInvoice'),
            notes: formData.get('notes'),
            status: 'paid'
        };

        const { error } = await supabase
            .from('receipts')
            .insert([receiptData]);

        if (error) throw error;

        showNotification('Receipt created successfully');
        createReceiptModal.style.display = 'none';
        receiptForm.reset();
        loadReceipts();
    } catch (error) {
        console.error('Error creating receipt:', error);
        showNotification('Error creating receipt', 'error');
    }
}

async function viewReceipt(id) {
    try {
        const { data: receipt, error } = await supabase
            .from('receipts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const modal = document.getElementById('viewReceiptModal');
        const details = document.getElementById('receiptDetails');
        
        details.innerHTML = `
            <div class="receipt-details">
                <div class="detail-row">
                    <span class="label">Receipt Number:</span>
                    <span class="value">${receipt.receipt_number}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Client:</span>
                    <span class="value">${receipt.client_name}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Payment Date:</span>
                    <span class="value">${formatDate(receipt.payment_date)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Amount:</span>
                    <span class="value">${formatCurrency(receipt.amount)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Payment Method:</span>
                    <span class="value">${receipt.payment_method}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Related Invoice:</span>
                    <span class="value">${receipt.related_invoice || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value status-badge status-${receipt.status.toLowerCase()}">${receipt.status}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Notes:</span>
                    <span class="value">${receipt.notes || '-'}</span>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error viewing receipt:', error);
        showNotification('Error viewing receipt', 'error');
    }
}

async function deleteReceipt(id) {
    if (!confirm('Are you sure you want to delete this receipt?')) return;

    try {
        const { error } = await supabase
            .from('receipts')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Receipt deleted successfully');
        loadReceipts();
    } catch (error) {
        console.error('Error deleting receipt:', error);
        showNotification('Error deleting receipt', 'error');
    }
}

function filterReceipts(searchTerm) {
    const rows = receiptsTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
    });
}

function filterReceiptsByStatus(status) {
    const rows = receiptsTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
        if (!status) {
            row.style.display = '';
            return;
        }
        const statusCell = row.querySelector('.status-badge');
        row.style.display = statusCell.classList.contains(`status-${status}`) ? '' : 'none';
    });
}

// Utility functions
function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: 'MZN'
    }).format(amount);
}

function showNotification(message, type = 'success') {
    // Implement your notification system here
    console.log(`${type}: ${message}`);
} 