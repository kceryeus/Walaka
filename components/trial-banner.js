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
    console.log('[TrialBanner] updateTrialBanner called');
    const banner = document.getElementById('trial-banner');
    if (!banner) {
        console.warn('[TrialBanner] Banner element not found.');
        return;
    }

    try {
        // Get user session
        console.log('[TrialBanner] Fetching user session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error('[TrialBanner] Error fetching session:', sessionError);
            banner.style.display = 'none';
            return;
        }
        
        if (!session || !session.user) {
            console.log('[TrialBanner] No user session found. Hiding banner.');
            banner.style.display = 'none';
            return;
        }
        
        const userId = session.user.id;
        console.log('[TrialBanner] User ID:', userId);
        console.log('[TrialBanner] User created_at:', session.user.created_at);

        // Check if user has a subscription
        const { data: subscription, error: subscriptionError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (subscriptionError) {
            console.error('[TrialBanner] Error fetching subscription:', subscriptionError);
        } else {
            console.log('[TrialBanner] Subscription data:', subscription);
        }

        // If user has an active paid subscription, hide the banner
        if (subscription && subscription.status === 'active' && subscription.plan !== 'trial') {
            console.log('[TrialBanner] User has active paid subscription. Hiding banner.');
            banner.style.display = 'none';
            return;
        }

        // Calculate trial days remaining
        let daysRemaining = 0;
        let trialStartDate = null;
        
        // Try to get trial start date from user's created_at
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('created_at')
            .eq('id', userId)
            .single();

        if (userError) {
            console.error('[TrialBanner] Error fetching user data:', userError);
            // Fallback to session user creation date
            trialStartDate = new Date(session.user.created_at);
            console.log('[TrialBanner] Using session user created_at as fallback:', trialStartDate);
        } else if (userData && userData.created_at) {
            trialStartDate = new Date(userData.created_at);
            console.log('[TrialBanner] Using users table created_at:', trialStartDate);
        } else {
            // Fallback to session user creation date
            trialStartDate = new Date(session.user.created_at);
            console.log('[TrialBanner] Using session user created_at as final fallback:', trialStartDate);
        }

        if (trialStartDate) {
            const now = new Date();
            const daysElapsed = Math.floor((now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
            daysRemaining = Math.max(0, TRIAL_CONFIG.totalDays - daysElapsed);
            
            console.log(`[TrialBanner] Trial calculation:`);
            console.log(`  - Trial start: ${trialStartDate.toISOString()}`);
            console.log(`  - Current time: ${now.toISOString()}`);
            console.log(`  - Days elapsed: ${daysElapsed}`);
            console.log(`  - Days remaining: ${daysRemaining}`);
        }

        // Count user's invoices - try multiple approaches
        let invoiceCount = 0;
        try {
            console.log('[TrialBanner] Attempting to count invoices...');
            
            // First, try with user_id (snake_case)
            let { count, error: invoiceError } = await supabase
                .from('invoices')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);

            console.log('[TrialBanner] user_id query result:', { count, error: invoiceError });

            if (invoiceError) {
                console.error('[TrialBanner] Error with user_id query:', invoiceError);
                
                // Try with userId (camelCase) as fallback
                const result = await supabase
                    .from('invoices')
                    .select('*', { count: 'exact', head: true })
                    .eq('userId', userId);
                
                console.log('[TrialBanner] userId query result:', { count: result.count, error: result.error });
                
                if (result.error) {
                    console.error('[TrialBanner] Error with userId query:', result.error);
                } else {
                    invoiceCount = result.count || 0;
                }
            } else {
                invoiceCount = count || 0;
            }

            console.log(`[TrialBanner] Final invoice count: ${invoiceCount}`);
            
        } catch (err) {
            console.error('[TrialBanner] Critical error counting invoices:', err);
        }

        const invoicesRemaining = Math.max(0, TRIAL_CONFIG.maxInvoices - invoiceCount);
        console.log(`[TrialBanner] Invoices remaining: ${invoicesRemaining}`);

        // Update UI elements
        updateTrialUI(daysRemaining, invoicesRemaining, trialStartDate);

        // Show banner
        banner.style.display = '';
        console.log('[TrialBanner] Banner displayed successfully');

        // Dispatch custom event with trial data for other components
        const trialData = {
            daysRemaining: daysRemaining,
            invoicesRemaining: invoicesRemaining,
            isRestricted: daysRemaining === 0 || invoicesRemaining === 0,
            trialStartDate: trialStartDate,
            invoiceCount: invoiceCount
        };
        
        console.log('[TrialBanner] Dispatching trialDataUpdated event:', trialData);
        window.dispatchEvent(new CustomEvent('trialDataUpdated', { 
            detail: trialData 
        }));

    } catch (err) {
        console.error('[TrialBanner] Unexpected error:', err);
        if (banner) banner.style.display = 'none';
    }
}

function updateTrialUI(daysRemaining, invoicesRemaining, trialStartDate) {
    console.log('[TrialBanner] Updating UI with:', { daysRemaining, invoicesRemaining });
    
    // Update days remaining
    const daysElem = document.getElementById('days-remaining');
    if (daysElem) {
        daysElem.textContent = daysRemaining;
        daysElem.classList.toggle('warning', daysRemaining <= 3);
        
        // Hide the entire metric if no days remaining
        const daysContainer = daysElem.closest('.trial-metric');
        if (daysContainer) {
            daysContainer.style.display = daysRemaining > 0 ? 'block' : 'none';
        }
        console.log('[TrialBanner] Updated days remaining element:', daysRemaining);
    } else {
        console.warn('[TrialBanner] #days-remaining element not found.');
    }

    // Update invoices remaining
    const invoicesElem = document.getElementById('invoices-remaining');
    if (invoicesElem) {
        invoicesElem.textContent = invoicesRemaining;
        invoicesElem.classList.toggle('warning', invoicesRemaining <= 1);
        
        // Hide the entire metric if no invoices remaining
        const invoicesContainer = invoicesElem.closest('.trial-metric');
        if (invoicesContainer) {
            invoicesContainer.style.display = invoicesRemaining > 0 ? 'block' : 'none';
        }
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

// --- Upgrade Modal Logic ---
function injectUpgradeModalCSS() {
    if (document.getElementById('upgrade-modal-css')) return;
    const link = document.createElement('link');
    link.id = 'upgrade-modal-css';
    link.rel = 'stylesheet';
    link.href = 'trial/css/upgrade-modal.css';
    document.head.appendChild(link);
}

function showUpgradeModal(currentPlan = 'Trial') {
    injectUpgradeModalCSS();
    if (document.querySelector('.upgrade-modal-overlay')) return;

    const plans = [
        { 
            name: 'Trial', 
            price: 'Free', 
            features: ['Limited invoices', '14 days'], 
            recommended: false 
        },
        { 
            name: 'Starter', 
            price: 'MZN 499/mo', 
            features: ['Up to 100 invoices', 'Basic support', 'Email support'], 
            recommended: true 
        },
        { 
            name: 'Pro', 
            price: 'MZN 999/mo', 
            features: ['Unlimited invoices', 'Priority support', 'Advanced features'], 
            recommended: false 
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
                        <h3>${plan.name}${plan.name === currentPlan ? ' <span style="color:green;font-size:0.8em">(Current)</span>' : ''}</h3>
                        <div style="font-size:1.2em;font-weight:bold;margin:0.5em 0;">${plan.price}</div>
                        <ul style="list-style:none;padding:0;margin:0 0 1em 0;">
                            ${plan.features.map(f => `<li>✓ ${f}</li>`).join('')}
                        </ul>
                        ${plan.name !== currentPlan ? `<button class="payment-btn card-btn">Choose ${plan.name}</button>` : ''}
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
}

function setupUpgradeButton() {
    const btn = document.getElementById('upgrade-btn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[TrialBanner] Upgrade button clicked. Showing upgrade modal.');
            showUpgradeModal('Trial');
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
    setupUpgradeButton
}; 