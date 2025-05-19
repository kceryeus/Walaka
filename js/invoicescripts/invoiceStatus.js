// Invoice Status Management Module

// Define valid invoice statuses and their transitions
const INVOICE_STATUS = {
    DRAFT: 'draft',
    PENDING: 'pending',
    SENT: 'sent',
    PAID: 'paid',
    OVERDUE: 'overdue',
    CANCELLED: 'cancelled'
};

// Define valid status transitions
const STATUS_TRANSITIONS = {
    [INVOICE_STATUS.DRAFT]: [INVOICE_STATUS.PENDING, INVOICE_STATUS.CANCELLED],
    [INVOICE_STATUS.PENDING]: [INVOICE_STATUS.SENT, INVOICE_STATUS.CANCELLED],
    [INVOICE_STATUS.SENT]: [INVOICE_STATUS.PAID, INVOICE_STATUS.OVERDUE, INVOICE_STATUS.CANCELLED],
    [INVOICE_STATUS.OVERDUE]: [INVOICE_STATUS.PAID, INVOICE_STATUS.CANCELLED],
    [INVOICE_STATUS.PAID]: [], // Terminal state
    [INVOICE_STATUS.CANCELLED]: [] // Terminal state
};

// Status display configuration
const STATUS_CONFIG = {
    [INVOICE_STATUS.DRAFT]: {
        label: 'Draft',
        icon: 'fa-file',
        color: 'gray',
        canEdit: true,
        canDelete: true
    },
    [INVOICE_STATUS.PENDING]: {
        label: 'Pending',
        icon: 'fa-clock',
        color: 'blue',
        canEdit: true,
        canDelete: true
    },
    [INVOICE_STATUS.SENT]: {
        label: 'Sent',
        icon: 'fa-paper-plane',
        color: 'orange',
        canEdit: false,
        canDelete: false
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
    constructor() {
        this.currentStatus = null;
        this.invoiceNumber = null;
    }

    async initialize(invoiceNumber) {
        this.invoiceNumber = invoiceNumber;
        await this.loadCurrentStatus();
    }

    async loadCurrentStatus() {
        try {
            const { data: invoice, error } = await window.supabase
                .from('invoices')
                .select('status')
                .eq('invoiceNumber', this.invoiceNumber)
                .single();

            if (error) throw error;
            this.currentStatus = invoice.status;
            return this.currentStatus;
        } catch (error) {
            console.error('Error loading invoice status:', error);
            throw error;
        }
    }

    canTransitionTo(newStatus) {
        if (!this.currentStatus || !STATUS_TRANSITIONS[this.currentStatus]) {
            return false;
        }
        return STATUS_TRANSITIONS[this.currentStatus].includes(newStatus);
    }

    async updateStatus(newStatus, metadata = {}) {
        if (!this.canTransitionTo(newStatus)) {
            throw new Error(`Invalid status transition from ${this.currentStatus} to ${newStatus}`);
        }

        try {
            // Update invoice status
            const { error: updateError } = await window.supabase
                .from('invoices')
                .update({ 
                    status: newStatus,
                    ...(newStatus === INVOICE_STATUS.PAID ? { paid_date: new Date().toISOString() } : {}),
                    ...(newStatus === INVOICE_STATUS.SENT ? { sent_date: new Date().toISOString() } : {})
                })
                .eq('invoiceNumber', this.invoiceNumber);

            if (updateError) throw updateError;

            // Add timeline event
            const { error: timelineError } = await window.supabase
                .from('invoice_timeline')
                .insert([{
                    invoiceNumber: this.invoiceNumber,
                    title: this.getStatusTitle(newStatus),
                    active: true,
                    date: new Date().toISOString(),
                    metadata: metadata
                }]);

            if (timelineError) throw timelineError;

            this.currentStatus = newStatus;
            this.updateUI();
            return true;
        } catch (error) {
            console.error('Error updating invoice status:', error);
            throw error;
        }
    }

    getStatusTitle(status) {
        switch (status) {
            case INVOICE_STATUS.DRAFT: return 'Invoice Created';
            case INVOICE_STATUS.PENDING: return 'Invoice Pending';
            case INVOICE_STATUS.SENT: return 'Invoice Sent to Client';
            case INVOICE_STATUS.PAID: return 'Payment Received';
            case INVOICE_STATUS.OVERDUE: return 'Invoice Overdue';
            case INVOICE_STATUS.CANCELLED: return 'Invoice Cancelled';
            default: return 'Status Updated';
        }
    }

    updateUI() {
        // Update status display
        const statusElement = document.getElementById('viewInvoiceStatus');
        if (statusElement) {
            const config = STATUS_CONFIG[this.currentStatus];
            statusElement.textContent = config.label;
            statusElement.className = `status ${config.color}`;
        }

        // Update action buttons
        this.updateActionButtons();

        // Refresh timeline
        this.refreshTimeline();
    }

    updateActionButtons() {
        const config = STATUS_CONFIG[this.currentStatus];
        const markPaidBtn = document.getElementById('markPaidBtn');
        const editBtn = document.getElementById('editInvoiceBtn');
        const deleteBtn = document.getElementById('deleteInvoiceBtn');

        if (markPaidBtn) {
            markPaidBtn.style.display = this.canTransitionTo(INVOICE_STATUS.PAID) ? '' : 'none';
        }

        if (editBtn) {
            editBtn.style.display = config.canEdit ? '' : 'none';
        }

        if (deleteBtn) {
            deleteBtn.style.display = config.canDelete ? '' : 'none';
        }
    }

    async refreshTimeline() {
        try {
            const timeline = await this.fetchTimeline();
            this.populateTimeline(timeline);
        } catch (error) {
            console.error('Error refreshing timeline:', error);
        }
    }

    async fetchTimeline() {
        try {
            const { data: timeline, error } = await window.supabase
                .from('invoice_timeline')
                .select('*')
                .eq('invoiceNumber', this.invoiceNumber)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return timeline || [{
                date: new Date().toISOString(),
                title: this.getStatusTitle(this.currentStatus),
                active: true
            }];
        } catch (error) {
            console.error('Error fetching timeline:', error);
            return [];
        }
    }

    populateTimeline(timeline) {
        const timelineContainer = document.querySelector('.status-timeline');
        if (!timelineContainer || !timeline.length) return;

        timelineContainer.innerHTML = timeline.map(event => `
            <div class="timeline-item${event.active ? ' active' : ''}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <span class="timeline-date">${this.formatDate(event.date)}</span>
                    <span class="timeline-title">${event.title}</span>
                </div>
            </div>
        `).join('');
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // Helper method to check if an invoice is overdue
    static isOverdue(dueDate) {
        const today = new Date();
        const due = new Date(dueDate);
        return today > due;
    }

    // Helper method to get status configuration
    static getStatusConfig(status) {
        return STATUS_CONFIG[status] || STATUS_CONFIG[INVOICE_STATUS.DRAFT];
    }
}

// Export for global use
if (typeof window !== 'undefined') {
    window.INVOICE_STATUS = INVOICE_STATUS;
    window.InvoiceStatusManager = InvoiceStatusManager;
} 