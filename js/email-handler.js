class EmailHandler {
    constructor() {
        this.modal = document.getElementById('emailInvoiceModal');
        this.form = document.getElementById('emailInvoiceForm');
        this.loadingIndicator = this.modal?.querySelector('.loading-indicator');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Email button click handler
        document.querySelectorAll('.email-invoice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showEmailModal(e.target.dataset.invoice);
            });
        });

        // Close modal handlers
        this.modal?.querySelector('.close-modal')?.addEventListener('click', () => this.closeEmailModal());
        this.modal?.querySelector('.close-email-modal')?.addEventListener('click', () => this.closeEmailModal());

        // Form submit handler
        this.form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.sendEmail();
        });
    }

    showEmailModal(invoiceNumber) {
        if (!this.modal) return;
        
        const invoice = this.getInvoiceData(invoiceNumber);
        if (!invoice) return;

        // Pre-fill form fields
        const toField = document.getElementById('emailTo');
        const subjectField = document.getElementById('emailSubject');
        const messageField = document.getElementById('emailMessage');

        if (toField) toField.value = invoice.clientEmail || '';
        if (subjectField) subjectField.value = `Invoice #${invoiceNumber}`;
        if (messageField) messageField.value = this.getDefaultEmailMessage(invoice);

        this.modal.style.display = 'block';
        document.querySelector('.modal-overlay').style.display = 'block';
    }

    closeEmailModal() {
        if (!this.modal) return;
        this.modal.style.display = 'none';
        document.querySelector('.modal-overlay').style.display = 'none';
        this.form?.reset();
    }

    async sendEmail() {
        try {
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'block';

            const emailData = {
                to: document.getElementById('emailTo').value,
                subject: document.getElementById('emailSubject').value,
                message: document.getElementById('emailMessage').value,
                attachPdf: document.getElementById('emailAttachPdf').checked
            };

            const response = await this.sendEmailToServer(emailData);
            
            if (response.success) {
                alert('Email sent successfully!');
                this.closeEmailModal();
            } else {
                throw new Error(response.message || 'Failed to send email');
            }
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Failed to send email: ' + error.message);
        } finally {
            if (this.loadingIndicator) this.loadingIndicator.style.display = 'none';
        }
    }

    getInvoiceData(invoiceNumber) {
        // Implement getting invoice data from your data source
        return {
            invoiceNumber,
            clientEmail: '', // Get from your data source
            amount: 0,      // Get from your data source
            dueDate: ''     // Get from your data source
        };
    }

    getDefaultEmailMessage(invoice) {
        return `Dear valued customer,

Please find attached invoice #${invoice.invoiceNumber} for your records.

Amount due: ${formatCurrency(invoice.amount)}
Due date: ${formatDate(invoice.dueDate)}

If you have any questions, please don't hesitate to contact us.

Best regards,
Your Company Name`;
    }

    async sendEmailToServer(emailData) {
        // Implement your email sending logic here
        // This is just a placeholder that simulates an API call
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ success: true, message: 'Email sent successfully' });
            }, 2000);
        });
    }
}

// Initialize email handler when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.emailHandler = new EmailHandler();
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
