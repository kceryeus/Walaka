import { getCurrentEnvironmentId } from './js/environment-utils.js';

document.addEventListener('DOMContentLoaded', () => {
    const createReceiptBtn = document.getElementById('createReceiptBtn');
    const createReceiptModal = document.getElementById('createReceiptModal');
    const viewReceiptModal = document.getElementById('viewReceiptModal');
    const receiptForm = document.getElementById('receiptForm');
    const receiptsTableBody = document.querySelector('#receiptsTable tbody');
    const modalOverlay = document.querySelector('.modal-overlay');

    // --- Modal Functions ---
    const openModal = (modal) => {
        modal.style.display = 'block';
        modalOverlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    };

    const closeModal = (modal) => {
        modal.style.display = 'none';
        modalOverlay.style.display = 'none';
        document.body.style.overflow = '';
    };

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', () => {
            const modal = btn.closest('.modal');
            closeModal(modal);
        });
    });

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            document.querySelectorAll('.modal').forEach(modal => closeModal(modal));
        }
    });

    // --- Event Listeners ---
    createReceiptBtn.addEventListener('click', () => openModal(createReceiptModal));

    receiptForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        // (Collect form data and save to Supabase)
        const receiptData = {
            receipt_number: document.getElementById('receiptNumber').value,
            client: document.getElementById('client').value,
            payment_date: document.getElementById('paymentDate').value,
            amount: parseFloat(document.getElementById('amount').value),
            payment_method: document.getElementById('paymentMethod').value,
            related_invoice: document.getElementById('relatedInvoice').value,
            // ... other fields ...
        };

        try {
            const environment_id = await getCurrentEnvironmentId();
            const { data, error } = await supabase
                .from('receipts') // Replace with your table name
                .insert([{ ...receiptData, environment_id }])
                .select();

            if (error) throw error;

            closeModal(createReceiptModal);
            fetchAndDisplayReceipts(); // Refresh the table
            receiptForm.reset();

        } catch (error) {
            console.error('Error saving receipt:', error);
            alert('Could not save receipt.');
        }
    });

    // --- Fetch and Display Receipts ---
    async function fetchAndDisplayReceipts() {
        try {
            const environment_id = await getCurrentEnvironmentId();
            const { data: receipts, error } = await supabase
                .from('receipts') // Replace with your table name
                .select('*')
                .eq('environment_id', environment_id)
                .order('payment_date', { ascending: false });

            if (error) throw error;

            receiptsTableBody.innerHTML = ''; // Clear existing rows

            receipts.forEach(receipt => {
                const row = `
                    <tr>
                        <td>${receipt.receipt_number}</td>
                        <td>${receipt.client}</td>
                        <td>${receipt.payment_date}</td>
                        <td>${receipt.amount}</td>
                        <td>${receipt.payment_method}</td>
                        <td>${receipt.related_invoice || '-'}</td>
                        <td>
                            <button class="btn secondary-btn view-receipt-btn" data-id="${receipt.id}">View</button>
                        </td>
                    </tr>
                `;
                receiptsTableBody.innerHTML += row;
            });

            // Add event listeners to the "View" buttons (after they're added to the DOM)
            document.querySelectorAll('.view-receipt-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const receiptId = btn.getAttribute('data-id');
                    fetchAndDisplayReceiptDetails(receiptId);
                });
            });

        } catch (error) {
            console.error('Error fetching receipts:', error);
            receiptsTableBody.innerHTML = '<tr><td colspan="7">Could not load receipts.</td></tr>';
        }
    }

    // --- View Receipt Details ---
    async function fetchAndDisplayReceiptDetails(receiptId) {
        try {
            const environment_id = await getCurrentEnvironmentId();
            const { data: receipt, error } = await supabase
                .from('receipts') // Replace with your table name
                .select('*')
                .eq('id', receiptId)
                .eq('environment_id', environment_id)
                .single();

            if (error) throw error;

            const detailsDiv = document.getElementById('receiptDetails');
            detailsDiv.innerHTML = `
                <p><strong>Receipt Number:</strong> ${receipt.receipt_number}</p>
                <p><strong>Client:</strong> ${receipt.client}</p>
                <p><strong>Payment Date:</strong> ${receipt.payment_date}</p>
                <p><strong>Amount Received:</strong> ${receipt.amount}</p>
                <p><strong>Payment Method:</strong> ${receipt.payment_method}</p>
                <p><strong>Related Invoice:</strong> ${receipt.related_invoice || 'N/A'}</p>
                `;

            openModal(viewReceiptModal);

        } catch (error) {
            console.error('Error fetching receipt details:', error);
            alert('Could not load receipt details.');
        }
    }

    // --- Initialization ---
    fetchAndDisplayReceipts();
});