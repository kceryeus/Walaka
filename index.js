require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();
const cors = require('cors');
app.use(cors());

app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));

// Serve static files
app.use(express.static(__dirname));

// Diagnostic route
app.get('/test', (req, res) => {
  res.json({ status: 'Node.js is working!' });
});

// Email sending route
app.post('/sendmail', async (req, res) => {
  const { to, subject, message, attachment } = req.body;
  if (!to || !subject || !message) {
    console.log(`[MAIL] Missing required fields: to=${to}, subject=${subject}, message=${!!message}`);
    return res.status(400).json({ 
      success: false, 
      error: {
        pt: 'Campos obrigatórios em falta.',
        en: 'Missing required fields.'
      }
    });
  }

  const SMTP_HOST = process.env.SMTP_HOSTNAME;
  const SMTP_PORT = process.env.SMTP_PORT;
  const SMTP_USER = process.env.SMTP_USERNAME;
  const SMTP_PASS = process.env.SMTP_PASSWORD;
  const SENDER_EMAIL = process.env.SENDER_EMAIL;

  let transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  // Prepare mail options
  const mailOptions = {
    from: SENDER_EMAIL,
    to,
    subject,
    text: message, // plain text with \n
    html: message.replace(/\n/g, '<br>'), // HTML with <br> for line breaks
    attachments: [],
  };
  // If there's an attachment, add a note in the message
  if (attachment && attachment.filename && attachment.content) {
    mailOptions.attachments.push({
      filename: attachment.filename,
      content: Buffer.from(attachment.content, 'base64'),
      contentType: attachment.contentType || 'application/pdf',
    });
    // Add a note about the attachment in the email body
    mailOptions.text += '\n\n---\nO PDF da factura está anexado a este email.\n---\nInvoice PDF is attached to this email.';
    mailOptions.html += '<br><br><hr><p><strong>O PDF da factura está anexado a este email.</strong></p><p><strong>Invoice PDF is attached to this email.</strong></p>';
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[MAIL] Email sent successfully to: ${to} | subject: ${subject}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`[MAIL] Failed to send email to: ${to} | subject: ${subject} | error: ${err.message}`);
    res.status(500).json({ 
      success: false, 
      error: {
        pt: `Falha ao enviar o email: ${err.message}`,
        en: `Failed to send email: ${err.message}`
      }
    });
  }
});

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Mail API and static server running on port ${PORT}`);
}); 