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
            // await this.refreshInvoiceList();
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
            // await this.refreshInvoiceList();

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
            window.modalManager.closeModal('viewInvoiceModal');

            // Show notification
            showNotification('Invoice deleted successfully', 'success');

            // Refresh invoice list and metrics
            // await this.refreshInvoiceList();

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
            // await this.refreshInvoiceList();

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

    // Add a stub for hideLoading
    hideLoading() {
        // No-op or implement your loading indicator hide logic
    }

    // Update downloadPdf to use createSignedUrl for private bucket
    async downloadPdf(invoiceNumber) {
        try {
            this.showLoading && this.showLoading('Downloading PDF...');
            // Ensure invoiceNumber is a string
            const invNum = typeof invoiceNumber === 'object' ? invoiceNumber.invoiceNumber : invoiceNumber;
            // Fetch invoice to get the correct file name
            const envId = await window.getCurrentEnvironmentId ? await window.getCurrentEnvironmentId() : null;
            let query = this.supabase
                .from('invoices')
                .select('invoiceNumber')
                .eq('invoiceNumber', invNum);
            if (envId) {
                query = query.eq('environment_id', envId);
            }
            const { data: invoice, error } = await query.single();
            if (error || !invoice) throw new Error('Invoice not found');
            // Get user ID for file name
            const userRes = await this.supabase.auth.getUser();
            const userId = userRes?.data?.user?.id;
            if (!userId) throw new Error('User not authenticated');
            // Construct the file name (match upload logic)
            const fileName = `${invoice.invoiceNumber}_${userId}.pdf`;
            console.log('[Download PDF] Attempting to create signed URL for:', fileName);
            // Get a signed URL
            const { data: signedUrlData, error: signedUrlError } = await this.supabase
                .storage
                .from('invoice_pdfs')
                .createSignedUrl(fileName, 60 * 60); // 1 hour expiry
            if (!signedUrlError && signedUrlData && signedUrlData.signedUrl) {
                window.open(signedUrlData.signedUrl, '_blank');
                this.hideLoading && this.hideLoading();
                this.showNotification && this.showNotification('PDF opened successfully', 'success');
                console.log('[Download PDF] Signed URL opened:', signedUrlData.signedUrl);
            } else {
                this.hideLoading && this.hideLoading();
                this.showNotification && this.showNotification('Could not generate PDF download link.', 'error');
                console.error('[Download PDF] Could not generate signed URL:', signedUrlError, signedUrlData);
            }
        } catch (error) {
            this.hideLoading && this.hideLoading();
            this.showNotification && this.showNotification('Failed to open PDF: ' + error.message, 'error');
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
        // if (window.invoiceTable && typeof window.invoiceTable.fetchAndDisplayInvoices === 'function') {
        //     await window.invoiceTable.fetchAndDisplayInvoices(1, 10, {});
        // }
    }

    // Add method to preview invoice details in a modal
    async viewInvoiceDetails(invoiceNumber) {
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

            // Find or create the modal
            let modal = document.getElementById('viewInvoiceModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'viewInvoiceModal';
                modal.className = 'document-modal';
                modal.innerHTML = `
                    <div class="document-modal-content">
                        <div class="document-modal-header">
                            <h2>Invoice Details</h2>
                            <button class="close-modal" type="button">&times;</button>
                        </div>
                        <div class="document-modal-body">
                            <div id="invoiceDetails" class="document-details"></div>
                        </div>
                        <div class="document-modal-footer">
                            <button class="btn primary-btn close-modal">Close</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            }

            // Populate the details
            const details = modal.querySelector('#invoiceDetails');
            details.innerHTML = `
                <div class="detail-row"><span class="label">Invoice Number:</span><span class="value">${invoice.invoiceNumber}</span></div>
                <div class="detail-row"><span class="label">Status:</span><span class="value">${invoice.status || '-'}</span></div>
                <div class="detail-row"><span class="label">Issue Date:</span><span class="value">${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : '-'}</span></div>
                <div class="detail-row"><span class="label">Due Date:</span><span class="value">${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : '-'}</span></div>
                <div class="detail-row"><span class="label">Client:</span><span class="value">${invoice.client_name || invoice.customer_name || invoice.client?.customer_name || '-'}</span></div>
                <div class="detail-row"><span class="label">Subtotal:</span><span class="value">${invoice.subtotal != null ? invoice.subtotal.toFixed(2) : '-'}</span></div>
                <div class="detail-row"><span class="label">VAT Amount:</span><span class="value">${invoice.vat_amount != null ? invoice.vat_amount.toFixed(2) : '-'}</span></div>
                <div class="detail-row"><span class="label">Total Amount:</span><span class="value">${invoice.total_amount != null ? invoice.total_amount.toFixed(2) : '-'}</span></div>
                <div class="detail-row"><span class="label">Currency:</span><span class="value">${invoice.currency || '-'}</span></div>
                <div class="detail-row"><span class="label">Payment Terms:</span><span class="value">${invoice.payment_terms || '-'}</span></div>
                <div class="detail-row"><span class="label">Notes:</span><span class="value">${invoice.notes || '-'}</span></div>
                <div class="detail-row"><span class="label">Payment Date:</span><span class="value">${invoice.payment_date ? new Date(invoice.payment_date).toLocaleDateString() : '-'}</span></div>
                <div class="detail-row"><span class="label">Payment Method:</span><span class="value">${invoice.payment_method || '-'}</span></div>
                <div class="detail-row"><span class="label">Payment Reference:</span><span class="value">${invoice.payment_reference || '-'}</span></div>
                <div class="detail-row"><span class="label">Serie:</span><span class="value">${invoice.serie || '-'}</span></div>
                <div class="detail-row"><span class="label">Numero:</span><span class="value">${invoice.numero || '-'}</span></div>
                <div class="detail-row"><span class="label">NUIT:</span><span class="value">${invoice.nuit || '-'}</span></div>
            `;

            // Show the modal
            modal.style.display = 'block';
            let overlay = document.querySelector('.modal-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'modal-overlay';
                overlay.style.display = 'block';
                document.body.appendChild(overlay);
            } else {
                overlay.style.display = 'block';
            }

            // Close modal logic
            modal.querySelectorAll('.close-modal').forEach(btn => {
                btn.onclick = () => {
                    modal.style.display = 'none';
                    overlay.style.display = 'none';
                };
            });
        } catch (error) {
            console.error('Error viewing invoice details:', error);
            showNotification('Error viewing invoice details: ' + (error.message || error), 'error');
        }
    }
}

// Export the class
window.InvoiceActions = InvoiceActions;