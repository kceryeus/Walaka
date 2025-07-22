/**
 * Initialize email functionality
 */
function initEmailSettings() {
    const emailEnabledSelect = document.getElementById('email-enabled');
    const emailSettings = document.getElementById('email-settings');
    
    if (!emailEnabledSelect || !emailSettings) return;
    
    emailEnabledSelect.addEventListener('change', function() {
        emailSettings.style.display = this.value === 'yes' ? 'block' : 'none';
    });
    
    // Initialize preview button for email
    const previewButton = document.createElement('button');
    previewButton.type = 'button';
    previewButton.id = 'preview-email';
    previewButton.className = 'btn';
    previewButton.style.width = 'auto';
    previewButton.style.marginTop = '10px';
    previewButton.textContent = 'Visualizar Email';
    
    // Add the button after the email template select
    const emailTemplateGroup = document.querySelector('#email-template').closest('.form-group');
    emailTemplateGroup.appendChild(previewButton);
    
    // Add event listener for preview button
    previewButton.addEventListener('click', previewEmail);
    
    // Listen for client and company name changes to update email template
    document.getElementById('client-name').addEventListener('change', updateEmailTemplate);
    document.getElementById('company-name').addEventListener('change', updateEmailTemplate);
    document.getElementById('invoice-number').addEventListener('change', updateEmailTemplate);
}

/**
 * Update email template with current invoice data
 */
function updateEmailTemplate() {
    const clientName = document.getElementById('client-name').value || '[Nome do Cliente]';
    const companyName = document.getElementById('company-name').value || '[Nome da Empresa]';
    const invoiceNumber = document.getElementById('invoice-number').value || '[Número da Fatura]';
    
    // Update subject
    const subjectInput = document.getElementById('email-subject');
    if (subjectInput) {
        const updatedSubject = `Fatura #${invoiceNumber} de ${companyName}`;
        subjectInput.value = updatedSubject;
    }
    
    // Update message body
    const messageInput = document.getElementById('email-message');
    if (messageInput) {
        const dueDate = document.getElementById('due-date').value ? 
            new Date(document.getElementById('due-date').value).toLocaleDateString('pt-MZ') : 
            '[Data de Vencimento]';
        
        const items = collectItems();
        const currency = document.getElementById('currency').value || 'MZN';
        const discount = parseFloat(document.getElementById('discount').value) || 0;
        
        // Calculate totals
        const subtotal = calculateSubtotal(items);
        const vatAmount = calculateVAT(items);
        const total = calculateTotal(subtotal, vatAmount, discount);
        
        // Format currency
        const formatter = new Intl.NumberFormat('pt-MZ', {
            style: 'currency',
            currency: currency
        });
        
        const totalAmount = formatter.format(total);
        
        const messageTemplate = `Prezado(a) ${clientName},

Segue em anexo a factura #${invoiceNumber} no valor de ${totalAmount} com vencimento em ${dueDate}.

Por favor, utilize as informações de pagamento incluídas na factura para efetuar o pagamento.

Atenciosamente,
${companyName}`;
        
        messageInput.value = messageTemplate;
    }
}

/**
 * Preview email with current data
 */
function previewEmail() {
    const subject = document.getElementById('email-subject').value;
    const message = document.getElementById('email-message').value;
    const clientEmail = document.getElementById('client-email').value || 'cliente@example.com';
    const cc = document.getElementById('email-cc').value;
    const bcc = document.getElementById('email-bcc').value;
    
    const invoiceData = collectInvoiceData();
    const paymentData = collectPaymentMethodData();
    
    // Show preview in a modal
    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '2000';
    
    const content = document.createElement('div');
    content.style.backgroundColor = 'var(--card-color)';
    content.style.borderRadius = '8px';
    content.style.padding = '25px';
    content.style.width = '80%';
    content.style.maxWidth = '800px';
    content.style.maxHeight = '80vh';
    content.style.overflowY = 'auto';
    
    // Create email preview content
    content.innerHTML = `
        <h2 style="margin-top: 0;">Visualização do Email</h2>
        
        <div style="margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
            <div><strong>Para:</strong> ${clientEmail}</div>
            ${cc ? `<div><strong>CC:</strong> ${cc}</div>` : ''}
            ${bcc ? `<div><strong>BCC:</strong> ${bcc}</div>` : ''}
            <div><strong>Assunto:</strong> ${subject}</div>
        </div>
        
        <div style="white-space: pre-wrap; margin-bottom: 20px; padding: 15px; background-color: rgba(0,0,0,0.05); border-radius: 4px;">
            ${message}
        </div>
        
        <div style="margin-bottom: 20px;">
            <strong>Anexo:</strong> Fatura_${invoiceData.invoice.number}.pdf
        </div>
        
        <div style="text-align: right;">
            <button id="close-email-preview" style="background-color: #F44336; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Fechar</button>
            <button id="send-test-email" style="background-color: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-left: 10px;">Enviar Email de Teste</button>
        </div>
    `;
    
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Close button event
    document.getElementById('close-email-preview').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // Send test email button event
    document.getElementById('send-test-email').addEventListener('click', function() {
        sendTestEmail(subject, message, clientEmail, cc, bcc);
        document.body.removeChild(modal);
    });
}

/**
 * Collect email settings data
 * @returns {Object} Email settings data
 */
function collectEmailSettings() {
    const emailEnabled = document.getElementById('email-enabled').value === 'yes';
    
    if (!emailEnabled) {
        return {
            enabled: false
        };
    }
    
    return {
        enabled: true,
        subject: document.getElementById('email-subject').value,
        message: document.getElementById('email-message').value,
        cc: document.getElementById('email-cc').value,
        bcc: document.getElementById('email-bcc').value,
        tracking: document.getElementById('email-tracking').value === 'yes',
        reminder: document.getElementById('email-reminder').value,
        template: document.getElementById('email-template').value
    };
}

/**
 * Send a test email (simulated)
 * @param {string} subject - Email subject
 * @param {string} message - Email message
 * @param {string} to - Recipient email
 * @param {string} cc - CC recipients
 * @param {string} bcc - BCC recipients
 */
function sendTestEmail(subject, message, to, cc, bcc) {
    // Show loading indicator
    showLoading('Enviando email de teste...');
    
    // Simulate API call
    setTimeout(() => {
        hideLoading();
        alert(`Email de teste enviado para: ${to}`);
    }, 2000);
}

/**
 * Send actual invoice email
 * @param {Object} invoiceData - The invoice data
 * @param {Object} emailSettings - The email settings
 * @returns {Promise<boolean>} Success status
 */
async function sendInvoiceEmail(invoiceData, emailSettings) {
    // This would connect to a real email sending service like SendGrid
    // For now we'll simulate the process
    
    showLoading('Enviando email da factura...');
    
    return new Promise((resolve) => {
        setTimeout(() => {
            hideLoading();
            const success = Math.random() > 0.1; // 90% success rate for simulation
            
            if (success) {
                alert(`Email enviado com sucesso para ${invoiceData.client.email}`);
            } else {
                alert(`Falha ao enviar email. Por favor, tente novamente.`);
            }
            
            resolve(success);
        }, 2500);
    });
}