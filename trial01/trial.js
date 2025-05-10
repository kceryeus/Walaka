/**
 * WALAKA Trial Management System
 * This script handles the trial period tracking and invoice limitations
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize trial system
    initTrialSystem();
    
    // Add event listeners for upgrade buttons
    document.querySelectorAll('#upgrade-btn, #upgradeAccountBtn, #upgradeLimitBtn').forEach(btn => {
        if (btn) {
            btn.addEventListener('click', handleUpgradeClick);
        }
    });
    
    // Contact support button
    const contactSupportBtn = document.getElementById('contactSupportBtn');
    if (contactSupportBtn) {
        contactSupportBtn.addEventListener('click', handleContactSupportClick);
    }
    
    // Close modal buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });
    
    // Close modals when clicking on overlay
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', closeModals);
    });
    
    // Close modals with escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeModals();
        }
    });
});

/**
 * Initialize the trial system by setting up trial data if not already present
 */
function initTrialSystem() {
    // Check if this is the first visit
    if (!localStorage.getItem('walaka_trial_start')) {
        // Set trial start date (current date)
        localStorage.setItem('walaka_trial_start', Date.now());
        // Set maximum allowed invoices
        localStorage.setItem('walaka_trial_max_invoices', 3);
        // Set current invoice count
        localStorage.setItem('walaka_trial_invoice_count', 0);
    }
    
    // Update trial display
    updateTrialDisplay();
    
    // Check if trial has expired
    const isExpired = checkIfTrialExpired();
    if (isExpired) {
        showTrialExpiredModal();
    }
}

/**
 * Check if the current trial has expired
 * @returns {boolean} True if trial has expired, false otherwise
 */
function checkIfTrialExpired() {
    const trialStart = parseInt(localStorage.getItem('walaka_trial_start'));
    const currentDate = Date.now();
    
    // Trial duration in milliseconds (14 days)
    const trialDuration = 14 * 24 * 60 * 60 * 1000;
    
    return (currentDate - trialStart) > trialDuration;
}

/**
 * Update the trial display elements with current trial status
 */
function updateTrialDisplay() {
    // Get trial data
    const trialStart = parseInt(localStorage.getItem('walaka_trial_start'));
    const maxInvoices = parseInt(localStorage.getItem('walaka_trial_max_invoices'));
    const invoiceCount = parseInt(localStorage.getItem('walaka_trial_invoice_count'));
    const currentDate = Date.now();
    
    // Calculate remaining days
    const trialDuration = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
    const elapsedTime = currentDate - trialStart;
    const remainingTime = Math.max(0, trialDuration - elapsedTime);
    const remainingDays = Math.ceil(remainingTime / (24 * 60 * 60 * 1000));
    
    // Calculate progress percentage
    const progressPercentage = Math.min(100, (elapsedTime / trialDuration) * 100);
    
    // Calculate remaining invoices
    const remainingInvoices = Math.max(0, maxInvoices - invoiceCount);
    
    // Update DOM elements
    const daysRemainingEl = document.getElementById('days-remaining');
    const invoicesRemainingEl = document.getElementById('invoices-remaining');
    const trialProgressEl = document.getElementById('trial-progress');
    
    if (daysRemainingEl) {
        daysRemainingEl.textContent = remainingDays;
        // Add warning class if less than 3 days remaining
        if (remainingDays < 3) {
            daysRemainingEl.classList.add('warning');
        } else {
            daysRemainingEl.classList.remove('warning');
        }
    }
    
    if (invoicesRemainingEl) {
        invoicesRemainingEl.textContent = remainingInvoices;
        // Add warning class if less than 2 invoices remaining
        if (remainingInvoices < 2) {
            invoicesRemainingEl.classList.add('warning');
        } else {
            invoicesRemainingEl.classList.remove('warning');
        }
    }
    
    if (trialProgressEl) {
        trialProgressEl.style.width = `${progressPercentage}%`;
        
        // Add warning class if progress > 75%
        if (progressPercentage > 75) {
            trialProgressEl.classList.add('warning');
        } else {
            trialProgressEl.classList.remove('warning');
        }
    }
}

/**
 * Show the trial expired modal
 */
function showTrialExpiredModal() {
    const modal = document.getElementById('trialExpiredModal');
    const overlay = document.querySelector('.modal-overlay');
    
    if (modal && overlay) {
        modal.style.display = 'block';
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

/**
 * Show the invoice limit reached modal
 */
function showInvoiceLimitModal() {
    const modal = document.getElementById('invoiceLimitModal');
    const overlay = document.querySelector('.modal-overlay');
    
    if (modal && overlay) {
        modal.style.display = 'block';
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

/**
 * Close all modals
 */
function closeModals() {
    const modals = document.querySelectorAll('.modal');
    const overlays = document.querySelectorAll('.modal-overlay');
    
    modals.forEach(modal => {
        modal.style.display = 'none';
    });
    
    overlays.forEach(overlay => {
        overlay.style.display = 'none';
    });
    
    document.body.style.overflow = ''; // Re-enable scrolling
}

/**
 * Handle upgrade button click
 */
function handleUpgradeClick() {
    // In a real implementation, this would redirect to pricing/subscription page
    alert('This would redirect to the pricing page in a production environment.');
}

/**
 * Handle contact support button click
 */
function handleContactSupportClick() {
    // In a real implementation, this would show a contact form or redirect to support page
    alert('This would open a support contact form in a production environment.');
}

/**
 * Check if creating an invoice is allowed based on trial status
 * @returns {boolean} True if invoice creation is allowed, false otherwise
 */
function canCreateInvoice() {
    // Check if trial has expired
    if (checkIfTrialExpired()) {
        showTrialExpiredModal();
        return false;
    }
    
    // Check if invoice limit reached
    const invoiceCount = parseInt(localStorage.getItem('walaka_trial_invoice_count'));
    const maxInvoices = parseInt(localStorage.getItem('walaka_trial_max_invoices'));
    
    if (invoiceCount >= maxInvoices) {
        showInvoiceLimitModal();
        return false;
    }
    
    return true;
}

/**
 * Increment the invoice count after successfully creating an invoice
 */
function incrementInvoiceCount() {
    const currentCount = parseInt(localStorage.getItem('walaka_trial_invoice_count')) || 0;
    localStorage.setItem('walaka_trial_invoice_count', currentCount + 1);
    updateTrialDisplay();
}

/**
 * Reset trial data (for testing purposes)
 */
function resetTrialData() {
    localStorage.removeItem('walaka_trial_start');
    localStorage.removeItem('walaka_trial_max_invoices');
    localStorage.removeItem('walaka_trial_invoice_count');
    initTrialSystem();
}

// Export functions for use in other scripts
window.trialSystem = {
    canCreateInvoice,
    incrementInvoiceCount,
    resetTrialData,
    checkIfTrialExpired
};
