// Invoice Actions Module
class InvoiceActions {
    constructor() {
        this.supabase = window.supabase;
        this.statusManager = window.InvoiceStatusManager;
    }

    async markAsPaid(invoiceNumber) {
        try {
            // Update invoice status
            const { error: updateError } = await this.supabase
                .from('invoices')
                .update({ 
                    status: 'paid', 
                    paid_date: new Date().toISOString() 
                })
                .eq('invoiceNumber', invoiceNumber);

            if (updateError) throw updateError;

            // Add timeline event
            const { error: timelineError } = await this.supabase
                .from('invoice_timeline')
                .insert([{
                    invoiceNumber: invoiceNumber,
                    title: 'Payment Received',
                    active: true,
                    date: new Date().toISOString()
                }]);

            if (timelineError) throw timelineError;

            // Update UI
            const statusElement = document.getElementById('viewInvoiceStatus');
            if (statusElement) {
                statusElement.textContent = 'Paid';
                statusElement.className = 'status paid';
            }

            const markPaidBtn = document.getElementById('markPaidBtn');
            if (markPaidBtn) {
                markPaidBtn.style.display = 'none';
            }

            // Refresh timeline
            const timeline = await this.fetchTimeline(invoiceNumber);
            this.populateTimeline(timeline);

            // Show notification
            window.showNotification('Invoice marked as paid');

            // Refresh invoice list and metrics
            await window.refreshInvoiceList();

            return true;
        } catch (error) {
            console.error('Error marking invoice as paid:', error);
            window.showNotification('Error updating invoice status');
            return false;
        }
    }

    async sendInvoice(invoiceNumber) {
        try {
            // Update invoice status
            const { error: updateError } = await this.supabase
                .from('invoices')
                .update({ 
                    status: 'sent',
                    sent_date: new Date().toISOString() 
                })
                .eq('invoiceNumber', invoiceNumber);

            if (updateError) throw updateError;

            // Add timeline event
            const { error: timelineError } = await this.supabase
                .from('invoice_timeline')
                .insert([{
                    invoiceNumber: invoiceNumber,
                    title: 'Invoice Sent',
                    active: true,
                    date: new Date().toISOString()
                }]);

            if (timelineError) throw timelineError;

            // Update UI
            const statusElement = document.getElementById('viewInvoiceStatus');
            if (statusElement) {
                statusElement.textContent = 'Sent';
                statusElement.className = 'status sent';
            }

            // Refresh timeline
            const timeline = await this.fetchTimeline(invoiceNumber);
            this.populateTimeline(timeline);

            // Show notification
            window.showNotification('Invoice sent successfully');

            // Refresh invoice list and metrics
            await window.refreshInvoiceList();

            return true;
        } catch (error) {
            console.error('Error sending invoice:', error);
            window.showNotification('Error sending invoice');
            return false;
        }
    }

    async deleteInvoice(invoiceNumber) {
        try {
            // Confirm deletion
            if (!confirm('Are you sure you want to delete this invoice?')) {
                return false;
            }

            // Delete invoice
            const { error: deleteError } = await this.supabase
                .from('invoices')
                .delete()
                .eq('invoiceNumber', invoiceNumber);

            if (deleteError) throw deleteError;

            // Delete timeline events
            const { error: timelineError } = await this.supabase
                .from('invoice_timeline')
                .delete()
                .eq('invoiceNumber', invoiceNumber);

            if (timelineError) throw timelineError;

            // Close modal if open
            window.closeAllModals();

            // Show notification
            window.showNotification('Invoice deleted successfully');

            // Refresh invoice list and metrics
            await window.refreshInvoiceList();

            return true;
        } catch (error) {
            console.error('Error deleting invoice:', error);
            window.showNotification('Error deleting invoice');
            return false;
        }
    }

    async duplicateInvoice(invoiceNumber) {
        try {
            // Fetch original invoice
            const { data: originalInvoice, error: fetchError } = await this.supabase
                .from('invoices')
                .select('*')
                .eq('invoiceNumber', invoiceNumber)
                .single();

            if (fetchError) throw fetchError;

            // Generate new invoice number
            const generator = new window.InvoiceNumberGenerator();
            const newInvoiceNumber = await generator.getNextNumber();

            // Create new invoice with copied data
            const newInvoice = {
                ...originalInvoice,
                invoiceNumber: newInvoiceNumber,
                status: 'draft',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Remove id field to allow auto-generation
            delete newInvoice.id;

            // Insert new invoice
            const { error: insertError } = await this.supabase
                .from('invoices')
                .insert([newInvoice]);

            if (insertError) throw insertError;

            // Add timeline event
            const { error: timelineError } = await this.supabase
                .from('invoice_timeline')
                .insert([{
                    invoiceNumber: newInvoiceNumber,
                    title: 'Invoice Duplicated',
                    active: true,
                    date: new Date().toISOString()
                }]);

            if (timelineError) throw timelineError;

            // Show notification
            window.showNotification('Invoice duplicated successfully');

            // Refresh invoice list
            await window.refreshInvoiceList();

            return newInvoiceNumber;
        } catch (error) {
            console.error('Error duplicating invoice:', error);
            window.showNotification('Error duplicating invoice');
            return null;
        }
    }

    async fetchTimeline(invoiceNumber) {
        try {
            const { data: timeline, error } = await this.supabase
                .from('invoice_timeline')
                .select('*')
                .eq('invoiceNumber', invoiceNumber)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return timeline || [
                {
                    date: new Date().toISOString(),
                    title: 'Invoice Created',
                    active: true
                }
            ];
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
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize and attach to window
const invoiceActions = new InvoiceActions();
window.invoiceActions = invoiceActions; 