// components/trial-banner.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.0.0/+esm';

const supabaseUrl = 'https://qvmtozjvjflygbkjecyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Trial configuration
const TRIAL_CONFIG = {
    totalDays: 14,
    maxInvoices: 5
};

async function updateTrialBanner() {
    const banner = document.getElementById('trial-banner');
    const planBadge = document.getElementById('plan-badge');
    if (!planBadge || !banner) return;
    try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session || !session.user) {
            planBadge.textContent = 'Trial';
            banner.style.display = '';
            return;
        }
        const userId = session.user.id;
        const { data: subscriptions, error: subscriptionError } = await supabase
            .from('subscriptions')
            .select('plan, end_date, status')
            .eq('user_id', userId)
            .order('end_date', { ascending: false });
        let currentPlan = 'Trial';
        let validSubscription = false;
        if (!subscriptionError && subscriptions && subscriptions.length > 0) {
            const latest = subscriptions[0];
            currentPlan = latest.plan ? capitalizePlanName(latest.plan) : 'Trial';
            // Check if subscription is active and not expired
            if (latest.status === 'active' && latest.end_date && new Date(latest.end_date) > new Date()) {
                validSubscription = true;
            }
        }
        planBadge.textContent = currentPlan;
        if (validSubscription) {
            banner.style.display = 'none';
            return;
        } else {
            banner.style.display = '';
        }
        // --- Days remaining and invoices remaining logic (intact) ---
        let daysRemaining = 0;
        let trialStartDate = null;
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('created_at')
            .eq('id', userId)
            .single();
        if (userError) {
            trialStartDate = new Date(session.user.created_at);
        } else if (userData && userData.created_at) {
            trialStartDate = new Date(userData.created_at);
        } else {
            trialStartDate = new Date(session.user.created_at);
        }
        if (trialStartDate) {
            const now = new Date();
            const daysElapsed = Math.floor((now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
            daysRemaining = Math.max(0, TRIAL_CONFIG.totalDays - daysElapsed);
        }
        let invoiceCount = 0;
        try {
            let { count, error: invoiceError } = await supabase
                .from('invoices')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);
            if (invoiceError) {
                const result = await supabase
                    .from('invoices')
                    .select('*', { count: 'exact', head: true })
                    .eq('userId', userId);
                if (!result.error) {
                    invoiceCount = result.count || 0;
                }
            } else {
                invoiceCount = count || 0;
            }
        } catch (err) {}
        const invoicesRemaining = Math.max(0, TRIAL_CONFIG.maxInvoices - invoiceCount);
        updateTrialUI(daysRemaining, invoicesRemaining, trialStartDate);
    } catch (err) {
        planBadge.textContent = 'Trial';
        if (banner) banner.style.display = '';
    }
}

function updateTrialUI(daysRemaining, invoicesRemaining, trialStartDate) {
    console.log('[TrialBanner] Updating UI with:', { daysRemaining, invoicesRemaining });
    
    // Update days remaining - always show the value, even if 0
    const daysElem = document.getElementById('days-remaining');
    if (daysElem) {
        daysElem.textContent = daysRemaining;
        daysElem.classList.toggle('warning', daysRemaining <= 3);
        console.log('[TrialBanner] Updated days remaining element:', daysRemaining);
    } else {
        console.warn('[TrialBanner] #days-remaining element not found.');
    }

    // Update invoices remaining - always show the value, even if 0
    const invoicesElem = document.getElementById('invoices-remaining');
    if (invoicesElem) {
        invoicesElem.textContent = invoicesRemaining;
        invoicesElem.classList.toggle('warning', invoicesRemaining <= 1);
        console.log('[TrialBanner] Updated invoices remaining element:', invoicesRemaining);
    } else {
        console.warn('[TrialBanner] #invoices-remaining element not found.');
    }

    // Update progress bar
    const progressFill = document.getElementById('trial-progress');
    if (progressFill && trialStartDate) {
        const now = new Date();
        const daysElapsed = Math.floor((now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const percent = Math.min(100, Math.max(0, (daysElapsed / TRIAL_CONFIG.totalDays) * 100));
        
        progressFill.style.width = percent + '%';
        progressFill.classList.toggle('warning', daysRemaining <= 3);
        console.log('[TrialBanner] Progress bar updated:', percent + '%');
    } else {
        console.warn('[TrialBanner] #trial-progress element not found.');
    }
}

function capitalizePlanName(plan) {
    if (!plan) return '';
    return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
}

// --- Upgrade Modal Logic ---
function injectUpgradeModalCSS() {
    if (document.getElementById('upgrade-modal-css')) return;
    const link = document.createElement('link');
    link.id = 'upgrade-modal-css';
    link.rel = 'stylesheet';
    link.href = 'trial/css/upgrade-modal.css';
    document.head.appendChild(link);
}

function showUpgradeModal(currentPlan) {
    injectUpgradeModalCSS();
    if (document.querySelector('.upgrade-modal-overlay')) return;
    // Use global currentPlanName if not provided
    if (!currentPlan) currentPlan = window.currentPlanName || 'Trial';

    const plans = [
        { 
            name: 'Trial', 
            price: 'Free', 
            features: ['Limited invoices', '14 days'], 
            recommended: false 
        },
        { 
            name: 'Invoicing', 
            price: 'MZN 300/mo', 
            features: ['Unlimited invoices', 'Full support'], 
            recommended: true 
        }
    ];

    const modal = document.createElement('div');
    modal.className = 'upgrade-modal-overlay';
    modal.innerHTML = `
        <div class="upgrade-modal">
            <div class="upgrade-modal-header">
                <h2>Upgrade Your Plan</h2>
                <button class="close-modal" aria-label="Close">&times;</button>
            </div>
            <div class="trial-info">
                <strong>Current Plan:</strong> <span>${currentPlan}</span>
            </div>
            <div class="pricing-options">
                ${plans.map(plan => `
                    <div class="pricing-plan${plan.recommended ? ' recommended' : ''}${plan.name === currentPlan ? ' current' : ''}">
                        <h3>${plan.name}${plan.name === currentPlan ? ' <span style=\"color:green;font-size:0.8em\">(Current)</span>' : ''}</h3>
                        <div style="font-size:1.2em;font-weight:bold;margin:0.5em 0;">${plan.price}</div>
                        <ul style="list-style:none;padding:0;margin:0 0 1em 0;">
                            ${plan.features.map(f => `<li>✓ ${f}</li>`).join('')}
                        </ul>
                        ${plan.name !== currentPlan ? `<button class=\"payment-btn card-btn choose-plan-btn\" data-plan=\"${plan.name}\">Choose Plan</button>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close logic
    modal.querySelector('.close-modal').onclick = () => modal.remove();
    modal.onclick = e => { 
        if (e.target === modal) modal.remove(); 
    };

    // Payment simulation logic
    modal.querySelectorAll('.choose-plan-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            const plan = btn.getAttribute('data-plan');
            if (plan === 'Invoicing') {
                showPaymentMethodModal(async (paymentMethod) => {
                    await simulatePaymentAndSubscribe(paymentMethod, modal);
                });
            }
        };
    });
}

function showPaymentMethodModal(onSelect) {
    // Remove any existing payment modal
    document.querySelectorAll('.payment-method-modal-overlay').forEach(el => el.remove());
    const overlay = document.createElement('div');
    overlay.className = 'payment-method-modal-overlay';
    overlay.innerHTML = `
        <div class="payment-method-modal">
            <h3>Select Payment Method</h3>
            <div class="payment-method-options">
                <button class="payment-method-btn" data-method="transfer">Transfer (Bank)</button>
                <button class="payment-method-btn" data-method="mpesa">M-pesa</button>
                <button class="payment-method-btn" data-method="emola">E-mola</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
    overlay.querySelectorAll('.payment-method-btn').forEach(btn => {
        btn.onclick = () => {
            const method = btn.getAttribute('data-method');
            overlay.remove();
            onSelect(method);
        };
    });
}

async function simulatePaymentAndSubscribe(paymentMethod, parentModal) {
    // Show loading spinner
    const loading = document.createElement('div');
    loading.className = 'payment-loading';
    loading.innerHTML = '<div style="padding:2em;text-align:center;">Processing payment...<br><span class="spinner"></span></div>';
    parentModal.appendChild(loading);
    // Simulate payment delay
    await new Promise(res => setTimeout(res, 2000));
    // Remove loading
    loading.remove();
    // Insert subscription into Supabase
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session.user.id;
        const now = new Date();
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1);
        const { error } = await supabase.from('subscriptions').upsert([
            {
                user_id: userId,
                plan: 'invoicing',
                status: 'active',
                payment_method: paymentMethod,
                start_date: now.toISOString(),
                end_date: endDate.toISOString(),
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                invoices_count: 0,
                days_remaining: 30
            }
        ], { onConflict: ['user_id'] });
        if (error) throw error;
        parentModal.remove();
        alert('Subscription successful! Welcome to Invoicing plan.');
        updateTrialBanner();
    } catch (err) {
        alert('Failed to subscribe: ' + (err.message || err));
    }
}

function setupUpgradeButton() {
    const btn = document.getElementById('upgrade-btn');
    if (btn) {
        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log('[TrialBanner] Upgrade button clicked. Showing upgrade modal.');
            // Always use the latest plan from global
            const currentPlan = window.currentPlanName || 'Trial';
            showUpgradeModal(currentPlan);
        });
    } else {
        console.warn('[TrialBanner] #upgrade-btn not found.');
    }
}

// --- Initialize Banner and Buttons ---
// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('[TrialBanner] DOM loaded, initializing...');
        updateTrialBanner();
        setupUpgradeButton();
    });
} else {
    // DOM is already ready
    console.log('[TrialBanner] DOM already ready, initializing...');
    updateTrialBanner();
    setupUpgradeButton();
}

// Export functions for external use
window.TrialBanner = {
    updateTrialBanner,
    showUpgradeModal,
    setupUpgradeButton,
    // Add manual test function
    testWithValues: function(days, invoices) {
        console.log('[TrialBanner] Manual test with values:', { days, invoices });
        updateTrialUI(days, invoices, new Date());
    }
}; 