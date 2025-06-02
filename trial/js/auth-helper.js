async function checkTrialStatus(userId) {
    try {
        let { data: trial, error } = await window.supabase
            .from('user_trials')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Trial record doesn't exist, create it
            trial = await initializeTrialUser(userId);
        } else if (error) {
            throw error;
        }

        const now = new Date();
        const trialEnd = new Date(trial.trial_end_date);
        const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
        const invoicesLeft = Math.max(0, trial.max_invoices - trial.invoices_created);

        return {
            canCreate: trial.is_active && now < trialEnd && trial.invoices_created < trial.max_invoices,
            daysLeft,
            invoicesLeft,
            isExpired: now > trialEnd || trial.invoices_created >= trial.max_invoices,
            unlimited: false,
            trialInfo: {
                daysLeft,
                invoicesLeft,
                isExpired: now > trialEnd,
                progress: ((14 - daysLeft) / 14) * 100
            }
        };
    } catch (error) {
        console.error('Error checking trial status:', error);
        throw error;
    }
}

async function initializeTrialUser(userId) {
    try {
        const { data, error } = await window.supabase
            .from('user_trials')
            .insert([{
                user_id: userId,
                trial_start_date: new Date().toISOString(),
                trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                invoices_created: 0,
                is_active: true,
                max_invoices: 5  // Set maximum to 5 invoices
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error initializing trial:', error);
        throw error;
    }
}

async function incrementInvoiceCount(userId) {
    try {
        const { error } = await window.supabase
            .from('user_trials')
            .update({ 
                invoices_created: supabase.raw('invoices_created + 1')
            })
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error incrementing invoice count:', error);
        throw error;
    }
}

async function showUpgradeModal(trialInfo) {
    if (upgradeModalInstance) {
        upgradeModalInstance.remove();
    }

    const modalHtml = `
        <div class="upgrade-modal-overlay">
            <div class="upgrade-modal">
                <div class="upgrade-modal-header">
                    <h2>Upgrade Your Plan</h2>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="trial-info">
                    ${trialInfo.isExpired ? 
                        '<p>Your trial has expired</p>' : 
                        `<p>Your trial expires in ${trialInfo.daysLeft} days</p>
                         <p>You have ${trialInfo.invoicesLeft} invoices remaining</p>`
                    }
                </div>
                <div class="pricing-options">
                    <div class="pricing-plan">
                        <h3>Basic Plan</h3>
                        <p class="price">$9.99/month</p>
                        <ul>
                            <li>100 Invoices/month</li>
                            <li>Basic Features</li>
                            <li>Email Support</li>
                        </ul>
                    </div>
                    <div class="pricing-plan recommended">
                        <h3>Pro Plan</h3>
                        <p class="price">$19.99/month</p>
                        <ul>
                            <li>Unlimited Invoices</li>
                            <li>Advanced Features</li>
                            <li>Priority Support</li>
                        </ul>
                    </div>
                </div>
                <div class="payment-options">
                    <button class="payment-btn card-btn" onclick="handleCardPayment()">
                        <i class="fas fa-credit-card"></i> Pay with Card
                    </button>
                    <button class="payment-btn mpesa-btn" onclick="handleMPesaPayment()">
                        <i class="fas fa-mobile-alt"></i> M-Pesa
                    </button>
                    <button class="payment-btn emola-btn" onclick="handleEMolaPayment()">
                        <i class="fas fa-wallet"></i> e-Mola
                    </button>
                </div>
            </div>
        </div>
    `;

    upgradeModalInstance = document.createElement('div');
    upgradeModalInstance.innerHTML = modalHtml;
    document.body.appendChild(upgradeModalInstance);

    // Add event listeners
    const closeBtn = upgradeModalInstance.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => upgradeModalInstance.remove());
    }
}

window.showUpgradeModal = showUpgradeModal;

window.trialSystem = {
    async checkTrialStatus(userId) {
        try {
            const { data: trial, error } = await window.supabase
                .from('user_trials')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (error) throw error;

            if (!trial) {
                return await initializeTrialUser(userId);
            }

            const now = new Date();
            const trialEnd = new Date(trial.trial_end_date);
            const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
            const invoicesLeft = Math.max(0, 5 - trial.invoices_created);
            const isExpired = now > trialEnd || trial.invoices_created >= 5;

            return {
                canCreate: !isExpired && invoicesLeft > 0,
                daysLeft,
                invoicesLeft,
                isExpired,
                unlimited: trial.is_unlimited || false,
                trialInfo: {
                    progress: ((5 - invoicesLeft) / 5) * 100,
                    daysLeft,
                    invoicesLeft
                }
            };
        } catch (error) {
            console.error('Error checking trial status:', error);
            return { error: true };
        }
    },

    async incrementInvoiceCount(userId) {
        try {
            const { error } = await window.supabase
                .from('user_trials')
                .update({ invoices_created: supabase.sql`invoices_created + 1` })
                .eq('user_id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('Error incrementing invoice count:', error);
            throw error;
        }
    }
};

async function initializeTrialUser(userId) {
    try {
        const { data, error } = await window.supabase
            .from('user_trials')
            .insert([{
                user_id: userId,
                trial_start_date: new Date().toISOString(),
                trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                invoices_created: 0,
                is_active: true,
                max_invoices: 5
            }])
            .select()
            .single();

        if (error) throw error;
        return {
            canCreate: true,
            daysLeft: 14,
            invoicesLeft: 5,
            isExpired: false,
            unlimited: false,
            trialInfo: {
                progress: 0,
                daysLeft: 14,
                invoicesLeft: 5
            }
        };
    } catch (error) {
        console.error('Error initializing trial:', error);
        throw error;
    }
}
