// notifications.js
// Simple notification utility for the invoice module

function showNotification(message) {
    // In a real application, you would use a proper notification system
    alert(message);
}

// If using modules, export the function. Otherwise, attach to window for global use.
if (typeof window !== 'undefined') {
    window.showNotification = showNotification;
}

// Optionally, you can extend this file later with toast notifications or custom UI.
