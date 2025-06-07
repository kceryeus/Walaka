// Invoice Actions Module
class InvoiceActions {
    constructor(supabase) {
        this.supabase = supabase;
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
            const { data: { user }, error: authError } = await this.supabase.auth.getUser();
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
            this.statusManager = new window.InvoiceStatusManager(this.supabase);
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
            const { error: deleteError } = await this.supabase
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

    async previewInvoice(invoiceNumber) {
        try {
            // Fetch invoice data from Supabase with joined client data
            const { data: invoice, error } = await this.supabase
                .from('invoices')
                .select(`
                    *,
                    client:clients (
                        customer_name,
                        customer_tax_id,
                        contact,
                        email,
                        telephone,
                        billing_address,
                        city,
                        postal_code,
                        province,
                        country
                    )
                `)
                .eq('invoiceNumber', invoiceNumber)
                .maybeSingle();

            if (error) throw error;
            if (!invoice) {
                throw new Error('Invoice not found');
            }

            // Format the data for preview
            const formattedData = {
                invoiceNumber: invoice.invoiceNumber,
                issueDate: invoice.issueDate,
                dueDate: invoice.dueDate,
                status: invoice.status,
                projectName: invoice.projectName,
                subtotal: invoice.subtotal,
                totalVat: invoice.totalVat,
                total: invoice.total,
                discount: invoice.discount,
                notes: invoice.notes,
                paymentTerms: invoice.paymentTerms,
                currency: invoice.currency,
                items: invoice.items,
                client: invoice.client
            };

            // Call the preview function
            await window.previewInvoice(formattedData);
        } catch (error) {
            console.error('Error previewing invoice:', error);
            showNotification('Error previewing invoice: ' + error.message, 'error');
        }
    }

    async downloadPdf(invoiceNumber) {
        try {
            // Show loading indicator
            this.showLoading('Downloading PDF...');

            // Fetch invoice data from Supabase
            const { data: invoice, error } = await this.supabase
                .from('invoices')
                .select('pdf_url')
                .eq('invoiceNumber', invoiceNumber)
                .single();

            if (error) throw error;
            if (!invoice?.pdf_url) throw new Error('PDF not found');

            // Open PDF in new tab
            window.open(invoice.pdf_url, '_blank');

            this.hideLoading();
            this.showNotification('PDF opened successfully', 'success');
        } catch (error) {
            this.hideLoading();
            this.showNotification('Failed to open PDF: ' + error.message, 'error');
        }
    }

    async emailInvoice(invoiceNumber, emailAddress) {
        try {
            // Fetch invoice data from Supabase
            const { data: invoice, error } = await this.supabase
                .from('invoices')
                .select('*, clients(*)')
                .eq('invoiceNumber', invoiceNumber)
                .single();

            if (error) throw error;
            if (!invoice) throw new Error('Invoice not found');

            // Generate PDF
            const pdfBlob = await window.generatePDF(invoice);

            // Create form data for email
            const formData = new FormData();
            formData.append('to', emailAddress);
            formData.append('subject', `Invoice ${invoiceNumber}`);
            formData.append('attachment', pdfBlob, `${invoiceNumber}.pdf`);

            // Get email template
            const { data: template } = await this.supabase
                .from('email_templates')
                .select('content')
                .eq('type', 'invoice')
                .single();

            formData.append('message', template?.content || 'Please find attached invoice.');

            // Send email via Supabase Edge Function
            const { data, error: emailError } = await this.supabase.functions.invoke('send-email', {
                body: formData
            });

            if (emailError) throw emailError;

            window.showNotification('Invoice sent successfully');
            return data;
        } catch (error) {
            console.error('Error sending invoice:', error);
            window.showNotification('Error sending invoice: ' + error.message, 'error');
            throw error;
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

// Export the class
window.InvoiceActions = InvoiceActions;