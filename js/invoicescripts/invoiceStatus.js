// Invoice Status Management Module

// Define valid invoice statuses and their transitions
const INVOICE_STATUS = {
    PENDING: 'pending',
    SENT: 'sent',
    PAID: 'paid',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled' // Keeping cancelled as it might be needed, but excluding from main flow
};

// Define valid status transitions
const STATUS_TRANSITIONS = {
    [INVOICE_STATUS.PENDING]: [INVOICE_STATUS.PENDING, INVOICE_STATUS.PAID, INVOICE_STATUS.OVERDUE, INVOICE_STATUS.CANCELLED], // Allow transition to any state
    [INVOICE_STATUS.PAID]: [INVOICE_STATUS.PENDING, INVOICE_STATUS.PAID, INVOICE_STATUS.OVERDUE, INVOICE_STATUS.CANCELLED], // Allow transition to any state
    [INVOICE_STATUS.OVERDUE]: [INVOICE_STATUS.PENDING, INVOICE_STATUS.PAID, INVOICE_STATUS.OVERDUE, INVOICE_STATUS.CANCELLED], // Allow transition to any state
    [INVOICE_STATUS.CANCELLED]: [INVOICE_STATUS.PENDING, INVOICE_STATUS.PAID, INVOICE_STATUS.OVERDUE] // Allow transition out of cancelled if needed, otherwise keep as []
};

// Status display configuration
const STATUS_CONFIG = {
    [INVOICE_STATUS.PENDING]: {
        label: 'Pending',
        icon: 'fa-clock',
        color: 'blue',
        canEdit: true,
        canDelete: true
    },
    [INVOICE_STATUS.PAID]: {
        label: 'Paid',
        icon: 'fa-check-circle',
        color: 'green',
        canEdit: false,
        canDelete: false
    },
    [INVOICE_STATUS.OVERDUE]: {
        label: 'Overdue',
        icon: 'fa-exclamation-circle',
        color: 'red',
        canEdit: false,
        canDelete: false
    },
    [INVOICE_STATUS.CANCELLED]: {
        label: 'Cancelled',
        icon: 'fa-ban',
        color: 'gray',
        canEdit: false,
        canDelete: false
    }
};

class InvoiceStatusManager {
    constructor(supabase) {
        this.invoiceNumber = null;
        this.currentStatus = null;
        this.supabase = supabase;
    }

    async initialize(invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
        console.log('Initializing status manager for invoice:', invoiceNumber);
        const { data: invoice, error } = await this.supabase
            .from('invoices')
            .select('status')
            .eq('invoiceNumber', invoiceNumber)
            .single();

        if (error) throw error;
        this.currentStatus = invoice.status;
        console.log('Fetched current status:', this.currentStatus);
        return this;
    }

    canTransitionTo(newStatus) {
        console.log('Checking transition from', this.currentStatus, 'to', newStatus);
        return STATUS_TRANSITIONS[this.currentStatus]?.includes(newStatus) || false;
    }

    async updateStatus(newStatus, additionalData = {}) {
        if (!this.invoiceNumber) {
            throw new Error('Invoice number not set');
        }

        if (!this.canTransitionTo(newStatus)) {
            throw new Error(`Invalid status transition from ${this.currentStatus} to ${newStatus}`);
        }

        try {
            // Get current user
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            if (userError) {
                console.error('Error getting user:', userError);
                throw new Error('Authentication error. Please log in again.');
            }

            if (!user) {
                throw new Error('No authenticated user found. Please log in to perform this action.');
            }

            // Prepare update data
            const updateData = {
                status: newStatus,
                ...(newStatus === 'paid' ? {
                    payment_date: new Date().toISOString(),
                    payment_method: additionalData.payment_method || 'manual',
                    payment_reference: additionalData.payment_reference || null
                } : {})
            };

            console.log('Attempting to update invoice status.');
            console.log('Invoice Number:', this.invoiceNumber);
            console.log('Update Data:', updateData);
            console.log('Supabase client in InvoiceStatusManager:', this.supabase);

            // Update invoice status
            const { error: updateError } = await this.supabase
                .from('invoices')
                .update(updateData)
                .eq('invoiceNumber', this.invoiceNumber);

            if (updateError) throw updateError;

            this.currentStatus = newStatus;
            this.updateUI();

            return true;
        } catch (error) {
            console.error('Error updating status:', error);
            throw error;
        }
    }

    updateUI() {
        // Update status display
        const statusElement = document.getElementById('viewInvoiceStatus');
        if (statusElement) {
            const config = STATUS_CONFIG[this.currentStatus];
            statusElement.innerHTML = `
                <i class="fas ${config.icon}"></i>
                ${config.label}
            `;
            statusElement.className = `status ${config.color}`;
        }

        // Update action buttons
        this.updateActionButtons();

        // Update metrics if available
        if (typeof window.updateMetricsDisplay === 'function') {
            window.updateMetricsDisplay();
        }

        // Update charts if available
        if (typeof window.updateCharts === 'function') {
            window.updateCharts();
        }
    }

    updateActionButtons() {
        const config = STATUS_CONFIG[this.currentStatus];
        
        // Get all status action buttons
        const buttons = {
            pending: document.getElementById('markAsPendingBtn'),
            sent: document.getElementById('markAsSentBtn'),
            paid: document.getElementById('markAsPaidBtn'),
            cancelled: document.getElementById('markAsCancelledBtn')
        };

        // Update each button's visibility and state
        Object.entries(buttons).forEach(([status, button]) => {
            if (button) {
                const canTransition = this.canTransitionTo(status);
                button.style.display = canTransition ? '' : 'none';
                button.disabled = !canTransition;
            }
        });
    }

    static getStatusConfig(status) {
        return STATUS_CONFIG[status] || STATUS_CONFIG[INVOICE_STATUS.PENDING];
    }
}

// Export the class and constants
window.InvoiceStatusManager = InvoiceStatusManager;
window.INVOICE_STATUS = INVOICE_STATUS;
window.STATUS_CONFIG = STATUS_CONFIG; 