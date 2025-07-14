// Initialize Supabase client
const supabase = window.supabase;

// DOM Elements
const creditNotesTable = document.getElementById('creditNotesTable');
const createCreditNoteBtn = document.getElementById('createCreditNoteBtn');
const createCreditNoteModal = document.getElementById('createCreditNoteModal');
const creditNoteForm = document.getElementById('creditNoteForm');
const searchInput = document.querySelector('.search-box input');
const statusFilter = document.querySelector('.filter-dropdown select');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadCreditNotes();
    setupEventListeners();

    // Auto-select related invoice if coming from invoice action
    const relatedInvoice = localStorage.getItem('relatedInvoiceForCreditNote');
    if (relatedInvoice) {
        setTimeout(() => {
            const invoiceSelect = document.getElementById('relatedInvoice');
            if (invoiceSelect) {
                for (const opt of invoiceSelect.options) {
                    if (opt.textContent.includes(relatedInvoice) || opt.value === relatedInvoice) {
                        opt.selected = true;
                        break;
                    }
                }
            }
            localStorage.removeItem('relatedInvoiceForCreditNote');
        }, 800);
    }
});

function setupEventListeners() {
    // Create Credit Note Button
    createCreditNoteBtn?.addEventListener('click', () => {
        createCreditNoteModal.style.display = 'block';
    });

    // Close Modal Buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            createCreditNoteModal.style.display = 'none';
            document.getElementById('viewCreditNoteModal').style.display = 'none';
        });
    });

    // Search Input
    searchInput?.addEventListener('input', (e) => {
        filterCreditNotes(e.target.value);
    });

    // Status Filter
    statusFilter?.addEventListener('change', (e) => {
        filterCreditNotesByStatus(e.target.value);
    });

    // Form Submit
    creditNoteForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createCreditNote();
    });
}

async function loadCreditNotes() {
    try {
        const { data: creditNotes, error } = await supabase
            .from('credit_notes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayCreditNotes(creditNotes);
    } catch (error) {
        console.error('Error loading credit notes:', error);
        showNotification('Error loading credit notes', 'error');
    }
}

function displayCreditNotes(creditNotes) {
    const tbody = creditNotesTable.querySelector('tbody');
    tbody.innerHTML = '';

    creditNotes.forEach(note => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${note.credit_note_number}</td>
            <td>${note.client_name}</td>
            <td>${formatDate(note.issue_date)}</td>
            <td>${formatCurrency(note.amount)}</td>
            <td>${note.related_invoice || '-'}</td>
            <td><span class="status-badge status-${note.status.toLowerCase()}">${note.status}</span></td>
            <td class="actions-cell">
                <button class="action-btn view-btn" onclick="viewCreditNote('${note.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn edit-btn" onclick="editCreditNote('${note.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete-btn" onclick="deleteCreditNote('${note.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function createCreditNote() {
    try {
        const formData = new FormData(creditNoteForm);
        const creditNoteData = {
            credit_note_number: formData.get('creditNoteNumber'),
            client_id: formData.get('client'),
            issue_date: formData.get('issueDate'),
            amount: formData.get('amount'),
            related_invoice: formData.get('relatedInvoice'),
            reason: formData.get('reason'),
            description: formData.get('description'),
            status: 'draft'
        };

        const { error } = await supabase
            .from('credit_notes')
            .insert([creditNoteData]);

        if (error) throw error;

        showNotification('Credit note created successfully');
        createCreditNoteModal.style.display = 'none';
        creditNoteForm.reset();
        loadCreditNotes();
    } catch (error) {
        console.error('Error creating credit note:', error);
        showNotification('Error creating credit note', 'error');
    }
}

async function viewCreditNote(id) {
    try {
        const { data: note, error } = await supabase
            .from('credit_notes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const modal = document.getElementById('viewCreditNoteModal');
        const details = document.getElementById('creditNoteDetails');
        
        details.innerHTML = `
            <div class="credit-note-details">
                <div class="detail-row">
                    <span class="label">Credit Note Number:</span>
                    <span class="value">${note.credit_note_number}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Client:</span>
                    <span class="value">${note.client_name}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Issue Date:</span>
                    <span class="value">${formatDate(note.issue_date)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Amount:</span>
                    <span class="value">${formatCurrency(note.amount)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Related Invoice:</span>
                    <span class="value">${note.related_invoice || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Reason:</span>
                    <span class="value">${note.reason}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Status:</span>
                    <span class="value status-badge status-${note.status.toLowerCase()}">${note.status}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Description:</span>
                    <span class="value">${note.description || '-'}</span>
                </div>
            </div>
        `;

        modal.style.display = 'block';
    } catch (error) {
        console.error('Error viewing credit note:', error);
        showNotification('Error viewing credit note', 'error');
    }
}

async function deleteCreditNote(id) {
    if (!confirm('Are you sure you want to delete this credit note?')) return;

    try {
        const { error } = await supabase
            .from('credit_notes')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Credit note deleted successfully');
        loadCreditNotes();
    } catch (error) {
        console.error('Error deleting credit note:', error);
        showNotification('Error deleting credit note', 'error');
    }
}

function filterCreditNotes(searchTerm) {
    const rows = creditNotesTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
    });
}

function filterCreditNotesByStatus(status) {
    const rows = creditNotesTable.querySelectorAll('tbody tr');
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