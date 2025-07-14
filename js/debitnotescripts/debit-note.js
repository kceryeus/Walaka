// Initialize Supabase client
const supabase = window.supabase;

// DOM Elements
const debitNotesTable = document.getElementById('debitNotesTable');
const createDebitNoteBtn = document.getElementById('createDebitNoteBtn');
const createDebitNoteModal = document.getElementById('createDebitNoteModal');
const debitNoteForm = document.getElementById('debitNoteForm');
const searchInput = document.querySelector('.search-box input');
const statusFilter = document.querySelector('.filter-dropdown select');

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadDebitNotes();
    setupEventListeners();
});

function setupEventListeners() {
    // Create Debit Note Button
    createDebitNoteBtn?.addEventListener('click', () => {
        createDebitNoteModal.style.display = 'block';
    });

    // Close Modal Buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            createDebitNoteModal.style.display = 'none';
            document.getElementById('viewDebitNoteModal').style.display = 'none';
        });
    });

    // Search Input
    searchInput?.addEventListener('input', (e) => {
        filterDebitNotes(e.target.value);
    });

    // Status Filter
    statusFilter?.addEventListener('change', (e) => {
        filterDebitNotesByStatus(e.target.value);
    });

    // Form Submit
    debitNoteForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        await createDebitNote();
    });
}

async function loadDebitNotes() {
    try {
        const { data: debitNotes, error } = await supabase
            .from('debit_notes')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayDebitNotes(debitNotes);
    } catch (error) {
        console.error('Error loading debit notes:', error);
        showNotification('Error loading debit notes', 'error');
    }
}

function displayDebitNotes(debitNotes) {
    const tbody = debitNotesTable.querySelector('tbody');
    tbody.innerHTML = '';

    debitNotes.forEach(note => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${note.debit_note_number}</td>
            <td>${note.client_name}</td>
            <td>${formatDate(note.issue_date)}</td>
            <td>${formatCurrency(note.amount)}</td>
            <td>${note.related_invoice || '-'}</td>
            <td><span class="status-badge status-${note.status.toLowerCase()}">${note.status}</span></td>
            <td class="actions-cell">
                <button class="action-btn view-btn" onclick="viewDebitNote('${note.id}')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn edit-btn" onclick="editDebitNote('${note.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete-btn" onclick="deleteDebitNote('${note.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function createDebitNote() {
    try {
        const formData = new FormData(debitNoteForm);
        const debitNoteData = {
            debit_note_number: formData.get('debitNoteNumber'),
            client_id: formData.get('client'),
            issue_date: formData.get('issueDate'),
            amount: formData.get('amount'),
            related_invoice: formData.get('relatedInvoice'),
            reason: formData.get('reason'),
            description: formData.get('description'),
            status: 'draft'
        };

        const { error } = await supabase
            .from('debit_notes')
            .insert([debitNoteData]);

        if (error) throw error;

        showNotification('Debit note created successfully');
        createDebitNoteModal.style.display = 'none';
        debitNoteForm.reset();
        loadDebitNotes();
    } catch (error) {
        console.error('Error creating debit note:', error);
        showNotification('Error creating debit note', 'error');
    }
}

async function viewDebitNote(id) {
    try {
        const { data: note, error } = await supabase
            .from('debit_notes')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const modal = document.getElementById('viewDebitNoteModal');
        const details = document.getElementById('debitNoteDetails');
        
        details.innerHTML = `
            <div class="debit-note-details">
                <div class="detail-row">
                    <span class="label">Debit Note Number:</span>
                    <span class="value">${note.debit_note_number}</span>
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
        console.error('Error viewing debit note:', error);
        showNotification('Error viewing debit note', 'error');
    }
}

async function deleteDebitNote(id) {
    if (!confirm('Are you sure you want to delete this debit note?')) return;

    try {
        const { error } = await supabase
            .from('debit_notes')
            .delete()
            .eq('id', id);

        if (error) throw error;

        showNotification('Debit note deleted successfully');
        loadDebitNotes();
    } catch (error) {
        console.error('Error deleting debit note:', error);
        showNotification('Error deleting debit note', 'error');
    }
}

function filterDebitNotes(searchTerm) {
    const rows = debitNotesTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
    });
}

function filterDebitNotesByStatus(status) {
    const rows = debitNotesTable.querySelectorAll('tbody tr');
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