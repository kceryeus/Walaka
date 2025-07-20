// js/sendNotificationEmail.js

// Email API endpoint selection logic (same as notifications.html)
function getMailApiUrl() {
    const meta = document.querySelector('meta[name="mail-api-endpoint"]');
    if (meta && meta.content) return meta.content;
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:3000/sendmail';
    }
    if (host.endsWith('github.io') || host === 'walaka.github.io') {
        return 'https://walakasoftware.com/sendmail';
    }
    if (host.endsWith('walakasoftware.com')) {
        return 'https://walakasoftware.com/sendmail';
    }
    // Default fallback
    return 'https://walakasoftware.com/sendmail';
}

// Attach to window for global use
window.sendNotificationEmail = async function(to, subject, message) {
    const from = 'no-reply@walakasoftware.com';
    const apiUrl = getMailApiUrl();
    console.log('[FRONTEND EMAIL LOG] Attempting to send email');
    console.log('[FRONTEND EMAIL LOG] To:', to);
    console.log('[FRONTEND EMAIL LOG] Subject:', subject);
    console.log('[FRONTEND EMAIL LOG] Message:', message);
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to, subject, message, from })
        });
        let data = {};
        try { data = await response.json(); } catch {}
        if (!response.ok || !data.success) {
            console.error('[FRONTEND EMAIL LOG] Email failed:', data.error || response.statusText);
            return false;
        }
        console.log('[FRONTEND EMAIL LOG] Email sent successfully!');
        return true;
    } catch (err) {
        console.error('[FRONTEND EMAIL LOG] Error sending email:', err);
        return false;
    }
}; 