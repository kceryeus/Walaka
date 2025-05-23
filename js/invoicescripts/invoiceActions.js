// Invoice Actions Module
class InvoiceActions {
    constructor() {
        if (!window.supabase) {
            throw new Error('Supabase client not initialized on window');
        }
        this.supabase = window.supabase;
        this.statusManager = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close Invoice button
        const closeInvoiceBtn = document.getElementById('closeInvoiceBtn');
        if (closeInvoiceBtn) {
            closeInvoiceBtn.addEventListener('click', () => {
                const modal = document.getElementById('viewInvoiceModal');
                if (modal) {
                    modal.style.display = 'none';
                    document.querySelector('.modal-overlay').style.display = 'none';
                }
            });
        }
    }

    async updateInvoiceStatus(invoiceNumber, newStatus) {
        try {
            console.log('Inside updateInvoiceStatus');
            console.log('this.supabase:', this.supabase);
            console.log('this.supabase.auth:', this.supabase ? this.supabase.auth : 'supabase is null or undefined');

            // Check if user is authenticated
            const { data: { user }, error: authError } = await window.supabase.auth.getUser();
            if (authError) {
                console.error('Authentication error:', authError);
                showNotification('Please log in to update invoice status', 'error');
                return;
            }

            if (!user) {
                showNotification('Please log in to update invoice status', 'error');
                return;
            }

            // Initialize status manager - Pass supabase client
            this.statusManager = new window.InvoiceStatusManager(window.supabase);
            await this.statusManager.initialize(invoiceNumber);

            // Check if transition to new status is allowed
            if (!this.statusManager.canTransitionTo(newStatus)) {
                showNotification('Cannot change to this status in the current state', 'error');
                return;
            }

            // Update status with user ID
            await this.statusManager.updateStatus(newStatus, {
                user_id: user.id,
                date: new Date().toISOString()
            });

            showNotification(`Invoice marked as ${newStatus} successfully`, 'success');
            
            // Refresh invoice list and metrics
            await this.refreshInvoiceList();
        } catch (error) {
            console.error('Error updating invoice status:', error);
            showNotification(error.message || 'Failed to update invoice status', 'error');
        }
    }

    async sendInvoice(invoiceNumber) {
        try {
            // Update invoice status
            const { error: updateError } = await window.supabase
                .from('invoices')
                .update({ 
                    status: 'sent',
                    sent_date: new Date().toISOString() 
                })
                .eq('invoiceNumber', invoiceNumber);

            if (updateError) throw updateError;

            // Add timeline event
            const { error: timelineError } = await window.supabase
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
            await this.refreshInvoiceList();

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
            const { error: deleteError } = await window.supabase
                .from('invoices')
                .delete()
                .eq('invoiceNumber', invoiceNumber);

            if (deleteError) throw deleteError;

            // Close modal if open
            window.closeAllModals();

            // Show notification
            showNotification('Invoice deleted successfully', 'success');

            // Refresh invoice list and metrics
            await this.refreshInvoiceList();

            return true;
        } catch (error) {
            console.error('Error deleting invoice:', error);
            showNotification('Error deleting invoice', 'error');
            return false;
        }
    }

    async duplicateInvoice(invoiceNumber) {
        try {
            // Fetch original invoice
            const { data: originalInvoice, error: fetchError } = await window.supabase
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
            const { error: insertError } = await window.supabase
                .from('invoices')
                .insert([newInvoice]);

            if (insertError) throw insertError;

            // Show notification
            showNotification('Invoice duplicated successfully', 'success');

            // Refresh invoice list
            await this.refreshInvoiceList();

            return newInvoiceNumber;
        } catch (error) {
            console.error('Error duplicating invoice:', error);
            showNotification('Error duplicating invoice', 'error');
            return null;
        }
    }

    async fetchTimeline(invoiceNumber) {
        try {
            const { data: timeline, error } = await window.supabase
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

    async downloadPdf(invoiceNumber) {
        try {
            // Fetch invoice data
            const { data: invoice, error } = await window.supabase
                .from('invoices')
                .select('*')
                .eq('invoiceNumber', invoiceNumber)
                .single();

            if (error) throw error;

            // Generate PDF using html2pdf
            const element = document.getElementById('invoicePreviewContent');
            const opt = {
                margin: 1,
                filename: `Invoice-${invoiceNumber}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            html2pdf().set(opt).from(element).save();

            // Show notification
            window.showNotification('PDF downloaded successfully');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            window.showNotification('Error downloading PDF');
        }
    }

    async refreshInvoiceList() {
        if (window.InvoiceTableModule) {
            await window.InvoiceTableModule.fetchAndDisplayInvoices(1, 10, {});
        }
    }

    // Add print method
    printInvoice() {
        const previewContent = document.getElementById('invoicePreviewContent');
        if (previewContent) {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(previewContent.innerHTML);
            printWindow.document.close();
            printWindow.print();
        }
    }
}

// Initialize and attach to window
const invoiceActions = new InvoiceActions();
window.invoiceActions = invoiceActions;

// Export the class
window.InvoiceActions = InvoiceActions; 