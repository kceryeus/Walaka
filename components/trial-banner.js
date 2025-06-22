// components/trial-banner.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.0.0/+esm';

const supabaseUrl = 'https://qvmtozjvjflygbkjecyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo';
const supabase = createClient(supabaseUrl, supabaseKey);

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
        }
        if (!session || !session.user) {
            console.log('[TrialBanner] No user session found. Hiding banner.');
            banner.style.display = 'none';
            return;
        }
        const userId = session.user.id;
        console.log('[TrialBanner] User ID:', userId);

        // Fetch subscription info
        console.log('[TrialBanner] Fetching subscription info...');
        const { data: subscription, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) {
            console.error('[TrialBanner] Error fetching subscription:', error);
            banner.style.display = 'none';
            return;
        }
        if (!subscription) {
            console.log('[TrialBanner] No subscription found. Showing trial banner.');
            banner.style.display = '';
            return;
        }

        console.log('[TrialBanner] Subscription:', subscription);

        // If user is not on trial, hide the banner
        if (!((subscription.plan === 'trial') && (subscription.status === 'active' || subscription.status === 'trialing'))) {
            console.log('[TrialBanner] User is not on trial (plan:', subscription.plan, ', status:', subscription.status, '). Hiding banner.');
            banner.style.display = 'none';
            return;
        }

        // Calculate days remaining based on user's creation date (14-day trial)
        console.log("[TrialBanner] Fetching user's created_at date for trial calculation...");
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('created_at')
            .eq('id', userId)
            .single();

        let daysRemaining = 0;
        const totalTrialDays = 14;

        if (userError || !userData || !userData.created_at) {
            console.error("[TrialBanner] Could not fetch user's created_at date:", userError);
            const daysElemContainer = document.getElementById('days-remaining')?.parentElement;
            if (daysElemContainer) daysElemContainer.style.display = 'none';
        } else {
            const now = new Date();
            const createdAt = new Date(userData.created_at);
            const daysElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
            daysRemaining = Math.max(0, Math.ceil(totalTrialDays - daysElapsed));
            
            console.log(`[TrialBanner] Trial started at: ${createdAt.toISOString()}. Days elapsed: ${daysElapsed.toFixed(2)}. Days remaining: ${daysRemaining}`);

            const daysElem = document.getElementById('days-remaining');
            if (daysElem) {
                daysElem.textContent = daysRemaining;
                daysElem.classList.toggle('warning', daysRemaining <= 3);
            } else {
                console.warn('[TrialBanner] #days-remaining element not found.');
            }
        }

        // Fetch invoice count for this user
        let invoicesRemaining = 5;
        try {
            console.log('[TrialBanner] Querying invoices with user_id (snake_case)...');
            let { data: invoiceData, count, error: invoiceError } = await supabase
                .from('invoices')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', userId);
            
            console.log('[TrialBanner] user_id count:', count, 'error:', invoiceError);

            // Fallback for safety: if no invoices found with user_id, try userId (camelCase)
            if ((!count || count === 0) && !invoiceError) {
                console.log('[TrialBanner] No invoices found with user_id. Trying userId (camelCase) as a fallback...');
                const result = await supabase
                    .from('invoices')
                    .select('id', { count: 'exact', head: true })
                    .eq('userId', userId);
                
                console.log('[TrialBanner] userId (camelCase) count:', result.count, 'error:', result.error);
                if (result.count && result.count > 0) {
                    count = result.count;
                }
            }

            if (invoiceError) {
                console.error('[TrialBanner] Error fetching invoice count:', invoiceError);
            } else {
                invoicesRemaining = Math.max(0, 5 - (count || 0));
                console.log(`[TrialBanner] User has ${count || 0} invoices. Invoices remaining: ${invoicesRemaining}`);
                const invoicesElem = document.getElementById('invoices-remaining');
                if (invoicesElem) {
                    invoicesElem.textContent = invoicesRemaining;
                } else {
                    console.warn('[TrialBanner] Element #invoices-remaining not found.');
                }
            }
        } catch (err) {
            console.error('[TrialBanner] A critical error occurred while fetching invoice count:', err);
        }

        // Progress bar
        const percent = totalTrialDays > 0 ? Math.max(0, Math.min(100, ((totalTrialDays - daysRemaining) / totalTrialDays) * 100)) : 0;
        const progressFill = document.getElementById('trial-progress');
        if (progressFill) {
            progressFill.style.width = percent + '%';
            progressFill.classList.toggle('warning', daysRemaining <= 3);
            console.log('[TrialBanner] Progress bar percent:', percent + '%');
        } else {
            console.warn('[TrialBanner] #trial-progress element not found.');
        }

        // Show banner
        banner.style.display = '';
        console.log('[TrialBanner] Banner displayed.');
        
        // Dispatch custom event with trial data for other components
        const trialData = {
            daysRemaining: daysRemaining,
            invoicesRemaining: invoicesRemaining,
            isRestricted: daysRemaining === 0 || invoicesRemaining === 0
        };
        
        window.dispatchEvent(new CustomEvent('trialDataUpdated', { 
            detail: trialData 
        }));
        
    } catch (err) {
        console.error('[TrialBanner] Unexpected error:', err);
        if (banner) banner.style.display = 'none';
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

    // Example plans (replace with Supabase fetch if needed)
    const plans = [
        { name: 'Trial', price: 'Free', features: ['Limited invoices', '14 days'], recommended: false },
        { name: 'Starter', price: 'MZN 499/mo', features: ['Up to 100 invoices', 'Basic support'], recommended: true },
        { name: 'Pro', price: 'MZN 999/mo', features: ['Unlimited invoices', 'Priority support'], recommended: false }
    ];

    const modal = document.createElement('div');
    modal.className = 'upgrade-modal-overlay';
    modal.innerHTML = `
        <div class="upgrade-modal">
            <div class="upgrade-modal-header">
                <h2>Upgrade Plan</h2>
                <button class="close-modal" aria-label="Close">&times;</button>
            </div>
            <div class="trial-info">
                <strong>Current Plan:</strong> <span>${currentPlan}</span>
            </div>
            <div class="pricing-options">
                ${plans.map(plan => `
                    <div class="pricing-plan${plan.recommended ? ' recommended' : ''}${plan.name === currentPlan ? ' current' : ''}">
                        <h3>${plan.name}${plan.name === currentPlan ? ' <span style=\'color:green;font-size:0.8em\'>(Current)</span>' : ''}</h3>
                        <div style="font-size:1.2em;font-weight:bold;margin:0.5em 0;">${plan.price}</div>
                        <ul style="list-style:none;padding:0;margin:0 0 1em 0;">
                            ${plan.features.map(f => `<li>${f}</li>`).join('')}
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
    modal.onclick = e => { if (e.target === modal) modal.remove(); };
}

function setupUpgradeButton() {
    const btn = document.getElementById('upgrade-btn');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[TrialBanner] Upgrade button clicked. Showing upgrade modal.');
            // You could fetch the current plan from Supabase if needed
            showUpgradeModal('Trial');
        });
    } else {
        console.warn('[TrialBanner] #upgrade-btn not found.');
    }
}

// --- Initialize Banner and Buttons ---
// The script is loaded after the DOM is ready, so we can call the functions directly.
updateTrialBanner();
setupUpgradeButton(); 