require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');
const app = express();
const cors = require('cors');
app.use(cors());

app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// Diagnostic route
app.get('/test', (req, res) => {
  res.json({ status: 'Node.js is working!' });
});

// Email sending route
app.post('/sendmail', async (req, res) => {
  const { to, subject, message } = req.body;
  if (!to || !subject || !message) {
    console.log(`[MAIL] Missing required fields: to=${to}, subject=${subject}, message=${!!message}`);
    return res.status(400).json({ success: false, error: 'Missing required fields.' });
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

  try {
    await transporter.sendMail({
      from: SENDER_EMAIL,
      to,
      subject,
      html: message,
    });
    console.log(`[MAIL] Email sent successfully to: ${to} | subject: ${subject}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`[MAIL] Failed to send email to: ${to} | subject: ${subject} | error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
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