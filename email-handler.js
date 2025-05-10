class EmailHandler {
    constructor() {
        this.modal = document.getElementById('emailInvoiceModal');
        if (!this.modal) {
            console.error('Email modal not found');
            return;
        }

        this.form = document.getElementById('emailInvoiceForm');
        this.toField = document.getElementById('emailTo');
        this.subjectField = document.getElementById('emailSubject');
        this.messageField = document.getElementById('emailMessage');
        this.loadingIndicator = this.modal.querySelector('.loading-indicator');
        this.currentInvoice = null;

        if (this.form && this.toField && this.subjectField && this.messageField) {
            this.initialize();
        } else {
            console.error('Required email form elements not found');
        }
    }

    initialize() {
        // Setup email button click handlers
        document.querySelectorAll('#emailInvoiceBtn, .send-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleEmailButtonClick(e));
        });

        // Close modal handlers
        this.modal.querySelector('.close-modal').addEventListener('click', () => this.closeModal());
        this.modal.querySelector('.close-email-modal').addEventListener('click', () => this.closeModal());

        // Form submit handler
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    handleEmailButtonClick(e) {
        const invoiceRow = e.target.closest('tr');
        if (invoiceRow) {
            const invoiceNumber = invoiceRow.getAttribute('data-invoice');
            const clientName = invoiceRow.getAttribute('data-client');
            this.openEmailModal(invoiceNumber, clientName);
        }
    }

    async openEmailModal(invoiceNumber, clientName) {
        this.currentInvoice = invoiceNumber;

        try {
            let clientEmail = '';
            
            // First try to get email from DOM
            const emailInput = document.querySelector(`[data-invoice="${invoiceNumber}"]`)?.closest('tr')?.querySelector('.client-email');
            if (emailInput?.value) {
                clientEmail = emailInput.value;
            } else {
                // Try to get from database
                const { data, error } = await window.supabase
                    .from('clients')
                    .select('email')
                    .eq('name', clientName)
                    .maybeSingle();

                if (!error && data) {
                    clientEmail = data.email;
                }
            }

            // Show modal regardless of whether we found an email
            this.toField.value = clientEmail;
            this.subjectField.value = `Invoice ${invoiceNumber}`;
            this.messageField.value = this.getDefaultEmailMessage(invoiceNumber, clientName);
            
            this.modal.style.display = 'block';
            document.querySelector('.modal-overlay').style.display = 'block';

        } catch (error) {
            console.error('Error preparing email form:', error);
            // Still show the modal with empty email
            this.toField.value = '';
            this.subjectField.value = `Invoice ${invoiceNumber}`;
            this.messageField.value = this.getDefaultEmailMessage(invoiceNumber, clientName);
            
            this.modal.style.display = 'block';
            document.querySelector('.modal-overlay').style.display = 'block';
        }
    }

    closeModal() {
        this.modal.style.display = 'none';
        document.querySelector('.modal-overlay').style.display = 'none';
        this.form.reset();
        this.loadingIndicator.style.display = 'none';
    }

    async handleSubmit(e) {
        e.preventDefault();
        this.loadingIndicator.style.display = 'block';

        try {
            const emailData = {
                to: this.toField.value,
                subject: this.subjectField.value,
                message: this.messageField.value,
                invoiceNumber: this.currentInvoice,
                attachPdf: document.getElementById('emailAttachPdf').checked
            };

            // Send email using Supabase Edge Function with proper headers
            const { data, error } = await window.supabase.functions.invoke('send-invoice-email', {
                body: JSON.stringify(emailData),
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.supabase.auth.session()?.access_token}`
                }
            });

            if (error) throw error;
            if (!data?.success) throw new Error('Email sending failed');

            // Log email activity to database
            await this.logEmailActivity(emailData);

            alert('Email sent successfully!');
            this.closeModal();

        } catch (error) {
            console.error('Error sending email:', error);
            alert('Failed to send email. Please try again. ' + error.message);
        } finally {
            this.loadingIndicator.style.display = 'none';
        }
    }

    async logEmailActivity(emailData) {
        try {
            await window.supabase.from('email_logs').insert([{
                invoice_number: emailData.invoiceNumber,
                recipient: emailData.to,
                subject: emailData.subject,
                sent_at: new Date().toISOString(),
                status: 'sent'
            }]);
        } catch (error) {
            console.error('Error logging email activity:', error);
        }
    }

    getDefaultEmailMessage(invoiceNumber, clientName) {
        return `Dear ${clientName},

Please find attached invoice ${invoiceNumber}.

Thank you for your business!

Best regards,
[Your Company Name]`;
    }
}

// Initialize email handler when document is ready and elements exist
document.addEventListener('DOMContentLoaded', () => {
    const emailModal = document.getElementById('emailInvoiceModal');
    if (emailModal) {
        window.emailHandler = new EmailHandler();
    } else {
        console.error('Email modal element not found');
    }
});
