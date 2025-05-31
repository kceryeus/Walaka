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

    async handleEmailButtonClick(e) {
        const invoiceNumber = e.target.dataset.invoice;
        if (!invoiceNumber) return;

        try {
            // Get invoice data from Supabase
            const { data: invoice, error } = await window.supabase
                .from('invoices')
                .select(`
                    *,
                    client:clients (
                        name,
                        email
                    )
                `)
                .eq('number', invoiceNumber)
                .single();

            if (error) throw error;
            if (!invoice) throw new Error('Invoice not found');

            this.currentInvoice = invoiceNumber;
            this.openEmailModal(invoice);
        } catch (error) {
            console.error('Error preparing email:', error);
            alert('Error preparing email: ' + error.message);
        }
    }

    openEmailModal(invoice) {
        if (!this.modal) return;

        // Pre-fill form fields
        this.toField.value = invoice.client?.email || '';
        this.subjectField.value = `Invoice #${invoice.number}`;
        this.messageField.value = this.getDefaultEmailMessage(invoice);
        
        // Show modal
        this.modal.style.display = 'block';
        document.querySelector('.modal-overlay').style.display = 'block';
    }

    closeModal() {
        if (!this.modal) return;
        this.modal.style.display = 'none';
        document.querySelector('.modal-overlay').style.display = 'none';
        this.form.reset();
        this.currentInvoice = null;
    }

    async handleSubmit(e) {
        e.preventDefault();
        if (!this.currentInvoice) {
            alert('No invoice selected');
            return;
        }

        this.loadingIndicator.style.display = 'block';

        try {
            const emailData = {
                to: this.toField.value,
                subject: this.subjectField.value,
                message: this.messageField.value,
                invoiceNumber: this.currentInvoice,
                attachPdf: document.getElementById('emailAttachPdf').checked
            };

            // Send email using Supabase Edge Function
            const { data, error } = await window.supabase.functions.invoke('send-invoice-email', {
                body: emailData
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Failed to send email');

            alert('Email sent successfully!');
            this.closeModal();

        } catch (error) {
            console.error('Error sending email:', error);
            alert('Failed to send email: ' + error.message);
        } finally {
            this.loadingIndicator.style.display = 'none';
        }
    }

    getDefaultEmailMessage(invoice) {
        return `Dear ${invoice.client?.name || 'Valued Customer'},

Please find attached invoice #${invoice.number} for ${invoice.currency} ${invoice.total}.

Payment is due by ${new Date(invoice.due_date).toLocaleDateString()}.

If you have any questions, please don't hesitate to contact us.

Best regards,
[Your Company Name]`;
    }
}

// Initialize email handler when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const emailModal = document.getElementById('emailInvoiceModal');
    if (emailModal) {
        window.emailHandler = new EmailHandler();
    } else {
        console.error('Email modal element not found');
    }
});

async function sendInvoiceEmail(invoiceNumber, emailAddress) {
    try {
        // Get the invoice PDF
        const { data: invoice } = await window.supabase
            .from('invoices')
            .select('pdf_url')
            .eq('invoiceNumber', invoiceNumber)
            .single();

        if (!invoice?.pdf_url) {
            throw new Error('PDF not found');
        }

        // Download the PDF blob
        const response = await fetch(invoice.pdf_url);
        const pdfBlob = await response.blob();

        // Create form data
        const formData = new FormData();
        formData.append('to', emailAddress);
        formData.append('subject', `Invoice ${invoiceNumber}`);
        formData.append('attachment', pdfBlob, `${invoiceNumber}.pdf`);

        // Get email template
        const { data: template } = await window.supabase
            .from('email_templates')
            .select('content')
            .eq('type', 'invoice')
            .single();

        formData.append('message', template?.content || 'Please find attached invoice.');

        // Send email via Supabase Edge Function
        const { data, error } = await window.supabase.functions.invoke('send-email', {
            body: formData
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}

// Export function
window.emailHandler = { sendInvoiceEmail };
