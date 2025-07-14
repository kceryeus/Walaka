// Trial Restrictions System
// This module handles restricting access to features when trial limits are reached

class TrialRestrictions {
    constructor() {
        this.trialData = null; // Start as null to indicate not loaded yet
        this.restrictedActions = new Set([
            'invoices.html',
            'clients/clients.html',
            'products.html',
            'banks/banks.html',
            'usermanagement-vanilla/index.html',
            'usermanagement-vanilla/js/app.js',
            'usermanagement-vanilla/js/ui.js',
            'usermanagement-vanilla/js/api.js',
            'usermanagement-vanilla/setup-password.html',
            'usermanagement-vanilla/supabase/',
        ]);
        this.restrictedSelectors = new Set([
            '#createInvoiceBtn',
            '#add-new-client-btn',
            '#add-new-product-btn',
            '#add-account-btn',
            '#empty-add-btn',
            '.btn.primary-btn',
            '#addUserBtn', // Ensure Add User button is always restricted for non-admins
            '#edit-user-btn',
            '.user-create-btn',
            '.user-edit-btn',
            '.usermanagement-create',
            '.usermanagement-edit',
        ]);
        this.spinnerClass = 'trial-spinner-overlay';
        this.init();
    }

    init() {
        // console.log('[TrialRestrictions] Initializing listeners and waiting for trial data.');

        // Show spinners on restricted elements while waiting for trial data
        this.showLoadingSpinners();

        // Listen for data from the banner
        window.addEventListener('trialDataUpdated', (event) => {
            this.setTrialData(event.detail);
        });

        // Set up global click listener immediately using event delegation
        this.setupGlobalClickListener();

        // As a fallback, poll for data in case the event is missed
        this.pollForTrialData();
    }
    
    setTrialData(data) {
        // Always update trial data and re-apply restrictions
        // console.log('[TrialRestrictions] Received trial data:', data);
        this.trialData = data;
        this.removeLoadingSpinners();
        if (this.trialData.isRestricted) {
            this.applyRestrictions();
        }
    }

    setupGlobalClickListener() {
        // Use event delegation on the body to catch all relevant clicks.
        // The 'true' argument makes it a capture-phase listener, so it runs before other click listeners.
        document.body.addEventListener('click', (event) => {
            const element = event.target;

            // --- User Management Vanilla: Block add/edit user modal for non-admins ---
            // Block Add User button
            if (element.closest('#addUserBtn')) {
                if (this.trialData === null || this.trialData.isRestricted) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.showRestrictionModal('add user');
                    return;
                }
            }
            // Block edit user buttons in the users table (look for a button or icon in the Manage column)
            if (element.closest('.edit-user-btn')) {
                if (this.trialData === null || this.trialData.isRestricted) {
                    event.preventDefault();
                    event.stopPropagation();
                    this.showRestrictionModal('edit user');
                    return;
                }
            }
            // --- End User Management Vanilla ---

            // Check for a click inside a restricted action card link
            const actionLink = element.closest('.action-card a');
            if (actionLink) {
                // If trial status is still unknown, prevent click to be safe.
                if (this.trialData === null) {
                    // console.warn('[TrialRestrictions] Trial data not yet available. Click prevented.');
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }
                // If the link is restricted, show the modal.
                if (this.isActionRestricted(actionLink.getAttribute('href'))) {
                    // console.log('[TrialRestrictions] Restricted action link clicked.');
                    event.preventDefault();
                    event.stopPropagation();
                    this.showRestrictionModal('this action');
                }
                return;
            }
            // Check for a click on a restricted button
            for (const selector of this.restrictedSelectors) {
                const button = element.closest(selector);
                if (button) {
                     if (this.trialData === null) {
                        // console.warn('[TrialRestrictions] Trial data not yet available. Click prevented.');
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                    if (this.shouldRestrictButton(button)) {
                        // console.log('[TrialRestrictions] Restricted button clicked.');
                        event.preventDefault();
                        event.stopPropagation();
                        this.showRestrictionModal('this action');
                    }
                    return;
                }
            }
        }, true);

        // Also, if the user modal is shown and the user is not admin, immediately close it and show restriction modal
        const userModal = document.getElementById('userModal');
        if (userModal) {
            const observer = new MutationObserver(() => {
                if (!userModal.classList.contains('hidden') && this.trialData && this.trialData.isRestricted) {
                    userModal.classList.add('hidden');
                    this.showRestrictionModal('user management');
                }
            });
            observer.observe(userModal, { attributes: true, attributeFilter: ['class'] });
        }
    }

    showLoadingSpinners() {
        // Remove spinner overlay logic for action cards
        // Only add spinner to restricted buttons
        this.restrictedSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(button => {
                if (!button.querySelector('.trial-spinner')) {
                    const spinner = document.createElement('span');
                    spinner.className = 'trial-spinner';
                    spinner.style.marginRight = '8px';
                    button.insertBefore(spinner, button.firstChild);
                }
                button.classList.add('trial-spinner-loading');
                button.disabled = true;
            });
        });
        this.injectSpinnerCSS();
    }

    removeLoadingSpinners() {
        // Remove spinner from buttons only
        document.querySelectorAll('.trial-spinner').forEach(spinner => spinner.remove());
        document.querySelectorAll('.trial-spinner-loading').forEach(btn => {
            btn.classList.remove('trial-spinner-loading');
            btn.disabled = false;
        });
    }

    injectSpinnerCSS() {
        if (document.getElementById('trial-spinner-css')) return;
        const style = document.createElement('style');
        style.id = 'trial-spinner-css';
        style.textContent = `
            .trial-spinner {
                width: 18px;
                height: 18px;
                border: 3px solid #e0e0e0;
                border-top: 3px solid #007ec7;
                border-radius: 50%;
                animation: trial-spin 1s linear infinite;
                display: inline-block;
            }
            @keyframes trial-spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            .trial-spinner-loading {
                opacity: 0.7 !important;
                cursor: wait !important;
            }
        `;
        document.head.appendChild(style);
    }

    async pollForTrialData() {
        // Give the event listener 1.5 seconds to receive the event from the banner.
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (this.trialData !== null) return; // Event was received, no need to poll.

        // console.log('[TrialRestrictions] Event not received. Starting polling fallback.');
        let attempts = 0;
        const maxAttempts = 10; // Poll for 1.0 more seconds (was 35 for 3.5s)

        while (attempts < maxAttempts) {
            if (this.trialData !== null) return;
            const daysElement = document.getElementById('days-remaining');
            const invoicesElement = document.getElementById('invoices-remaining');

            if (daysElement && invoicesElement && (daysElement.textContent !== '14' || invoicesElement.textContent !== '5')) {
                const days = parseInt(daysElement.textContent, 10) || 0;
                const invoices = parseInt(invoicesElement.textContent, 10) || 0;
                // console.log('[TrialRestrictions] Polling fallback successful.');
                this.setTrialData({
                    daysRemaining: days,
                    invoicesRemaining: invoices,
                    isRestricted: days === 0 || invoices === 0,
                });
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (this.trialData === null) {
            // console.warn('[TrialRestrictions] Could not determine trial status. Defaulting to not restricted.');
            this.trialData = { isRestricted: false }; // Default to not restricted if we can't find out.
            this.removeLoadingSpinners();
        }
    }

    isActionRestricted(url) {
        if (!this.trialData || !this.trialData.isRestricted) return false;
        return Array.from(this.restrictedActions).some(action => url && url.includes(action));
    }

    shouldRestrictButton(button) {
        if (!this.trialData || !this.trialData.isRestricted) return false;
        // If the button matches .btn.primary-btn, always restrict
        if (button.classList.contains('primary-btn') && button.classList.contains('btn')) {
            return true;
        }
        const buttonText = button.textContent.toLowerCase();
        const createKeywords = ['create', 'add', 'new', 'generate', 'salvar', 'user', 'utilizador', 'editar', 'edit'];
        return createKeywords.some(keyword => buttonText.includes(keyword));
    }

    applyRestrictions() {
        if (!this.trialData || !this.trialData.isRestricted) return;

        // console.log('[TrialRestrictions] Applying visual restrictions...');

        // Restrict Quick Action cards
        document.querySelectorAll('.action-card').forEach(card => {
            const link = card.querySelector('a');
            if (link && this.isActionRestricted(link.getAttribute('href'))) {
                this.makeActionRestricted(card);
            }
        });

        // Restrict buttons
        this.restrictedSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(button => {
                if (this.shouldRestrictButton(button) || selector === '#addUserBtn') {
                    this.makeButtonRestricted(button);
                }
            });
        });
    }

    makeActionRestricted(card) {
        if (card.classList.contains('trial-restricted')) return;
        card.classList.add('trial-restricted');
        const overlay = document.createElement('div');
        overlay.className = 'trial-restriction-overlay';
        overlay.innerHTML = `<div class="restriction-content"><i class="fas fa-lock"></i><span data-translate="plan_expired">Plan Expired</span></div>`;
        card.appendChild(overlay);
        const link = card.querySelector('a');
        if (link) {
            link.style.pointerEvents = 'none';
        }
        // Apply translation
        if (window.languageManager && typeof window.languageManager.applyTranslations === 'function') {
            window.languageManager.applyTranslations();
        }
    }

    makeButtonRestricted(button) {
        if (button.classList.contains('trial-restricted')) return;
        button.classList.add('trial-restricted');
        button.disabled = true;
        if (!button.querySelector('.fas.fa-lock')) {
            const icon = document.createElement('i');
            icon.className = 'fas fa-lock';
            icon.style.marginRight = '8px';
            button.insertBefore(icon, button.firstChild);
        }
    }

    showRestrictionModal(restrictedAction) {
        // Prevent multiple modals
        if (document.querySelector('.trial-restriction-modal')) return;

        const modal = document.createElement('div');
        modal.className = 'trial-restriction-modal';
        modal.innerHTML = `
            <div class="trial-restriction-modal-content">
                <div class="modal-header">
                    <h3 data-translate="plan_expired">Plan Expired</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="restriction-icon"><i class="fas fa-lock"></i></div>
                    <p data-translate="plan_expired">Plan Expired</p>
                    <ul>
                        ${this.trialData.daysRemaining === 0 ? '<li>Your 14-day trial period has expired.</li>' : ''}
                        ${this.trialData.invoicesRemaining === 0 ? '<li>You have used all 5 of your free invoices.</li>' : ''}
                    </ul>
                    <p>Please upgrade to continue using all features.</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary close-modal">Close</button>
                    <button class="btn-primary upgrade-now">Upgrade Now</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        // Apply translation
        if (window.languageManager && typeof window.languageManager.applyTranslations === 'function') {
            window.languageManager.applyTranslations();
        }
        const closeModal = () => modal.remove();
        modal.querySelectorAll('.close-modal').forEach(btn => btn.addEventListener('click', closeModal));
        modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
        modal.querySelector('.upgrade-now').addEventListener('click', () => {
            closeModal();
            const upgradeBtn = document.getElementById('upgrade-btn');
            if (upgradeBtn) upgradeBtn.click();
        });
        this.injectModalCSS();
    }
    
    injectModalCSS() {
        if (document.getElementById('trial-restriction-css')) return;
        const style = document.createElement('style');
        style.id = 'trial-restriction-css';
        style.textContent = `
            .trial-restricted { position: relative; opacity: 0.7; }
            .trial-restriction-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(255, 255, 255, 0.5); border-radius: var(--card-radius); display: flex; align-items: center; justify-content: center; z-index: 1; backdrop-filter: blur(1px); }
            .restriction-content { text-align: center; color: #333; background: rgba(255, 255, 255, 0.9); padding: 0.5rem 1rem; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .restriction-content i { font-size: 1.2rem; margin-bottom: 0.25rem; display: block; color: var(--danger-color, #ef4444); }
            .restriction-content span { font-size: 0.8rem; font-weight: 500; }
            button.trial-restricted { opacity: 0.6 !important; cursor: not-allowed !important; }
            .trial-restriction-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; animation: fadeIn 0.3s ease; }
            .trial-restriction-modal-content { background: white; border-radius: 12px; max-width: 420px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); animation: slideIn 0.3s ease; }
            .modal-header { padding: 1rem 1.5rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
            .modal-header h3 { margin: 0; color: #1e293b; font-size: 1.125rem; }
            .close-modal { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
            .modal-body { padding: 1.5rem; text-align: center; }
            .restriction-icon { margin-bottom: 1rem; }
            .restriction-icon i { font-size: 3rem; color: var(--danger-color, #ef4444); }
            .modal-body p { margin: 0 0 1rem 0; color: #334155; line-height: 1.5; }
            .modal-body ul { text-align: left; margin: 1rem 0 1.5rem 0; padding-left: 1.5rem; list-style-type: disc; }
            .modal-body li { margin-bottom: 0.5rem; color: #475569; }
            .modal-footer { padding: 1rem 1.5rem; display: flex; gap: 1rem; background-color: #f8fafc; border-top: 1px solid #e2e8f0; border-radius: 0 0 12px 12px; }
            .btn-secondary, .btn-primary { flex: 1; padding: 0.65rem 1rem; border: 1px solid transparent; border-radius: 8px; font-weight: 500; cursor: pointer; transition: all 0.2s; }
            .btn-secondary { background-color: #ffffff; color: #334155; border-color: #cbd5e1; }
            .btn-secondary:hover { background-color: #f8fafc; }
            .btn-primary { background-color: #007ec7; color: white; }
            .btn-primary:hover { background-color: #0066a3; }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideIn { from { opacity: 0; transform: translateY(-20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
        `;
        document.head.appendChild(style);
    }
}

// Instantiate the class immediately when the script is loaded.
if (typeof window.trialRestrictions === 'undefined') {
    window.trialRestrictions = new TrialRestrictions();
} 