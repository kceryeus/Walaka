// components/trial-banner.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.0.0/+esm';

const supabaseUrl = 'https://qvmtozjvjflygbkjecyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo';
const supabase = createClient(supabaseUrl, supabaseKey);

function logAction(type, desc, details) {
  if (window.logUserAction) window.logUserAction(type, desc, details);
}

// Plan configuration
const PLAN_CONFIG = {
    trial: {
        name: { en: 'Trial', pt: 'Teste' },
        price: 'Free',
        priceValue: 0,
        maxUsers: 1,
        trialDays: 14,         // <-- Added explicit trial days
        trialInvoices: 5,      // <-- Added explicit trial invoice count
        features: ['Limited invoices', '14 days', '1 user'],
        recommended: false
    },
    basic: {
        name: { en: 'Basic', pt: 'Básico' },
        price: 'MZN 250/mo',
        priceValue: 250,
        maxUsers: 2,
        features: ['2 users', 'Unlimited invoices'],
        recommended: false
    },
    standard: {
        name: { en: 'Standard', pt: 'Padrão' },
        price: 'MZN 500/mo',
        priceValue: 500,
        maxUsers: 5,
        features: ['5 users', 'Unlimited invoices'],
        recommended: true
    }
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
        // --- Fetch user row to check for created_by (parent) ---
        let parentId = userId;
        let userCreatedAt = session.user.created_at;
        let environmentId = null;
        let userRow = null;
        let parentRow = null;
        try {
            const userResult = await supabase
                .from('users')
                .select('created_by, created_at, environment_id')
                .eq('id', userId)
                .single();
            userRow = userResult.data;
            const userRowError = userResult.error;
            // console.log('[TrialBanner][DEBUG] userRow:', userRow, 'userRowError:', userRowError);
            if (!userRowError && userRow) {
                if (userRow.created_by) {
                    parentId = userRow.created_by;
                    const parentResult = await supabase
                        .from('users')
                        .select('created_at, environment_id')
                        .eq('id', parentId)
                        .single();
                    parentRow = parentResult.data;
                    const parentRowError = parentResult.error;
                    // console.log('[TrialBanner][DEBUG] parentRow:', parentRow, 'parentRowError:', parentRowError);
                    if (!parentRowError && parentRow) {
                        if (parentRow.created_at) userCreatedAt = parentRow.created_at;
                        if (parentRow.environment_id) {
                            environmentId = parentRow.environment_id;
                        } else if (userRow.environment_id) {
                            // fallback: use child's environment_id if parent has none
                            environmentId = userRow.environment_id;
                        }
                    } else if (userRow.environment_id) {
                        // fallback: use child's environment_id if parent fetch fails
                        environmentId = userRow.environment_id;
                    }
                } else {
                    if (userRow.created_at) userCreatedAt = userRow.created_at;
                    if (userRow.environment_id) environmentId = userRow.environment_id;
                }
            }
        } catch (e) { console.error('[TrialBanner][DEBUG] Error fetching user/parent row:', e); }
        // console.log('[TrialBanner][DEBUG] Using parentId:', parentId, 'userCreatedAt:', userCreatedAt, 'environmentId:', environmentId);
        // --- Use environmentId for all subscription/trial queries ---
        let subscriptions = [];
        let subscriptionError = null;
        if (environmentId) {
            const subResult = await supabase
                .from('subscriptions')
                .select('plan, end_date, status')
                .eq('environment_id', environmentId)
                .order('end_date', { ascending: false });
            subscriptions = subResult.data;
            subscriptionError = subResult.error;
        }
        // console.log('[TrialBanner][DEBUG] subscriptions:', subscriptions, 'subscriptionError:', subscriptionError);
        let currentPlan = 'Trial';
        let validSubscription = false;
        if (!subscriptionError && subscriptions && subscriptions.length > 0) {
            const latest = subscriptions[0];
            currentPlan = latest.plan ? capitalizePlanName(latest.plan) : 'Trial';
            // Check if subscription is active, not expired, and not a trial plan
            if (
                latest.status === 'active' &&
                latest.end_date &&
                new Date(latest.end_date) > new Date() &&
                latest.plan &&
                latest.plan.toLowerCase() !== 'trial'
            ) {
                validSubscription = true;
            }
        }
        // console.log('[TrialBanner][DEBUG] validSubscription:', validSubscription, 'currentPlan:', currentPlan);
        planBadge.textContent = currentPlan;
        if (validSubscription) {
            banner.style.display = 'none';
            return;
        } else {
            banner.style.display = '';
        }
        // --- Days remaining and invoices remaining logic (intact, but use parentId and parent's created_at) ---
        let daysRemaining = 0;
        let trialStartDate = null;
        // Use parent's created_at if child, else own
        if (userCreatedAt) {
            trialStartDate = new Date(userCreatedAt);
        } else {
            trialStartDate = new Date();
        }
        if (trialStartDate) {
            const now = new Date();
            const daysElapsed = Math.floor((now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
            daysRemaining = Math.max(0, PLAN_CONFIG.trial.trialDays - daysElapsed); // <-- Use explicit trialDays
        }
        let invoiceCount = 0;
        try {
            let { count, error: invoiceError } = await supabase
                .from('invoices')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', parentId);
            if (invoiceError) {
                const result = await supabase
                    .from('invoices')
                    .select('*', { count: 'exact', head: true })
                    .eq('userId', parentId);
                if (!result.error) {
                    invoiceCount = result.count || 0;
                }
            } else {
                invoiceCount = count || 0;
            }
        } catch (err) {}
        const invoicesRemaining = Math.max(0, PLAN_CONFIG.trial.trialInvoices - invoiceCount); // <-- Use explicit trialInvoices
        updateTrialUI(daysRemaining, invoicesRemaining, trialStartDate);
        window.dispatchEvent(new CustomEvent('trialDataUpdated', {
            detail: {
                daysRemaining,
                invoicesRemaining,
                isRestricted: daysRemaining === 0 || invoicesRemaining === 0
            }
        }));
    } catch (err) {
        planBadge.textContent = 'Trial';
        if (banner) banner.style.display = '';
    }
}

function updateTrialUI(daysRemaining, invoicesRemaining, trialStartDate) {
    // console.log('[TrialBanner] Updating UI with:', { daysRemaining, invoicesRemaining });
    
    // Update days remaining - always show the value, even if 0
    const daysElem = document.getElementById('days-remaining');
    if (daysElem) {
        daysElem.textContent = daysRemaining;
        daysElem.classList.toggle('warning', daysRemaining <= 3);
        // console.log('[TrialBanner] Updated days remaining element:', daysRemaining);
    } else {
        // console.warn('[TrialBanner] #days-remaining element not found.');
    }

    // Update invoices remaining - always show the value, even if 0
    const invoicesElem = document.getElementById('invoices-remaining');
    if (invoicesElem) {
        invoicesElem.textContent = invoicesRemaining;
        invoicesElem.classList.toggle('warning', invoicesRemaining <= 1);
        // console.log('[TrialBanner] Updated invoices remaining element:', invoicesRemaining);
    } else {
        // console.warn('[TrialBanner] #invoices-remaining element not found.');
    }

    // Update progress bar
    const progressFill = document.getElementById('trial-progress');
    if (progressFill && trialStartDate) {
        const now = new Date();
        const daysElapsed = Math.floor((now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24));
        const percent = Math.min(100, Math.max(0, (daysElapsed / PLAN_CONFIG.trial.trialDays) * 100)); // <-- Use explicit trialDays
        
        progressFill.style.width = percent + '%';
        progressFill.classList.toggle('warning', daysRemaining <= 3);
        // console.log('[TrialBanner] Progress bar updated:', percent + '%');
    } else {
        // console.warn('[TrialBanner] #trial-progress element not found.');
    }

    // After updating UI, apply translations if languageManager is available
    if (window.languageManager && typeof window.languageManager.applyTranslations === 'function') {
        window.languageManager.applyTranslations();
    }
}

function capitalizePlanName(plan) {
    if (!plan) return '';
    return plan.charAt(0).toUpperCase() + plan.slice(1).toLowerCase();
}

// Create payment notification
async function createPaymentNotification(userId, paymentMethod, amount, plan) {
    try {
        // Check if user has notification settings enabled for payment notifications
        const { data: notificationSettings, error: settingsError } = await supabase
            .from('notification_settings')
            .select('payment_received')
            .eq('user_id', userId)
            .single();
        if (settingsError || !notificationSettings || !notificationSettings.payment_received) {
            if (settingsError && settingsError.code === 'PGRST116') {
                const { error: createError } = await supabase
                    .from('notification_settings')
                    .insert({
                        user_id: userId,
                        payment_received: true,
                        invoice_created: true,
                        invoice_due: true,
                        invoice_overdue: true,
                        product_low_stock: true,
                        system_updates: true,
                        client_activity: false,
                        login_attempts: true
                    });
                if (createError) {
                    console.error('[TrialBanner] Error creating default notification settings:', createError);
                    return;
                }
            } else {
                return;
            }
        }
        // Use the global helper to create notification and send email
        if (window.createNotification) {
            await window.createNotification(
                'payment',
                'Payment Received',
                `Payment of ${amount} for ${plan} plan has been received via ${paymentMethod}. Your subscription is now active.`,
                'profile.html',
                userId
            );
        }
        // Dispatch event to notify other parts of the app about new notification
        window.dispatchEvent(new CustomEvent('notificationCreated', {
            detail: {
                type: 'payment',
                title: 'Payment Received',
                message: `Payment of ${amount} for ${plan} plan has been received via ${paymentMethod}. Your subscription is now active.`
            }
        }));
        // Update notification badge count
        if (window.notificationBadgeManager) {
            await window.notificationBadgeManager.refresh();
        }
    } catch (error) {
        console.error('[TrialBanner] Error in createPaymentNotification:', error);
    }
}
// Create invoice notification
async function createInvoiceNotification(userId, invoiceNumber) {
    try {
        const { data: notificationSettings, error: settingsError } = await supabase
            .from('notification_settings')
            .select('invoice_created')
            .eq('user_id', userId)
            .single();
        if (settingsError || !notificationSettings || !notificationSettings.invoice_created) {
            return;
        }
        // Use the global helper to create notification and send email
        if (window.createNotification) {
            await window.createNotification(
                'invoice',
                'Invoice Created Successfully',
                `Invoice ${invoiceNumber || 'INV-001'} has been created and is ready for sending to your client.`,
                'invoices.html',
                userId
            );
        }
    } catch (error) {
        console.error('[TrialBanner] Error in createInvoiceNotification:', error);
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

function showUpgradeModal(currentPlan) {
    injectUpgradeModalCSS();
    if (document.querySelector('.upgrade-modal-overlay')) return;
    if (!currentPlan) currentPlan = window.currentPlanName || 'Trial';

    // Build plans array for modal
    const plans = [
        {
            key: 'trial',
            ...PLAN_CONFIG.trial,
            name: PLAN_CONFIG.trial.name.en
        },
        {
            key: 'basic',
            ...PLAN_CONFIG.basic,
            name: PLAN_CONFIG.basic.name.en
        },
        {
            key: 'standard',
            ...PLAN_CONFIG.standard,
            name: PLAN_CONFIG.standard.name.en
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
                        ${plan.name !== currentPlan ? `<button class=\"payment-btn card-btn choose-plan-btn\" data-plan=\"${plan.key}\">Choose Plan</button>` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.close-modal').onclick = () => { modal.remove(); logAction('close_upgrade_modal', 'Closed upgrade modal'); };
    modal.onclick = e => { if (e.target === modal) { modal.remove(); logAction('close_upgrade_modal', 'Closed upgrade modal by overlay'); } };
    modal.querySelectorAll('.choose-plan-btn').forEach(btn => {
        btn.onclick = async (e) => {
            e.preventDefault();
            const planKey = btn.getAttribute('data-plan');
            logAction('choose_plan', `Chose plan: ${planKey}`);
            if (planKey === 'basic' || planKey === 'standard') {
                showPaymentMethodModal(async (paymentMethod) => {
                    logAction('select_payment_method', `Selected payment method: ${paymentMethod}`, { plan: planKey });
                    await simulatePaymentAndSubscribe(paymentMethod, modal, planKey);
                });
            }
        };
    });
} // Properly close showUpgradeModal

// Global notification helper function
window.createNotification = async function(type, title, message, actionUrl = null, userId = null) {
    try {
        // Always get the current session user and their email
        let userEmail = null;
        let effectiveUserId = userId;
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
            effectiveUserId = session.user.id;
            userEmail = session.user.email;
        }
        if (!effectiveUserId) {
            console.error('[NotificationHelper] No userId available for notification.');
            return;
        }
        // Check if user has notification settings enabled for this type
        const notificationTypeMap = {
            'invoice': 'invoice_created',
            'payment': 'payment_received',
            'system': 'system_updates',
            'alert': 'invoice_overdue',
            'subscription_expired': 'system_updates',
            'subscription_canceled': 'system_updates'
        };
        const settingKey = notificationTypeMap[type];
        if (settingKey) {
            const { data: notificationSettings, error: settingsError } = await supabase
                .from('notification_settings')
                .select(settingKey)
                .eq('user_id', effectiveUserId)
                .single();
            if (settingsError || !notificationSettings || !notificationSettings[settingKey]) {
                return;
            }
        }
        // Create notification
        const { error } = await supabase
            .from('notifications')
            .insert({
                user_id: effectiveUserId,
                type: type,
                title: title,
                message: message,
                action_url: actionUrl,
                read: false
            });
        if (error) {
            console.error('[NotificationHelper] Error creating notification:', error);
        } else {
            // Send email after notification is created
            if (typeof window.sendNotificationEmail === 'function' && userEmail) {
                console.log('[NotificationHelper] Sending notification email to:', userEmail, { title, message });
                window.sendNotificationEmail(userEmail, title, message);
            } else {
                console.warn('[NotificationHelper] No user email found or sendNotificationEmail not available.', { userEmail, sendNotificationEmailType: typeof window.sendNotificationEmail });
            }
        }
    } catch (error) {
        console.error('[NotificationHelper] Error in createNotification:', error);
    }
};

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

// --- Subscription Receipt Logic ---

// 1. Get next incremental subscription receipt number (per year)
async function getNextSubscriptionReceiptNumber() {
    const year = new Date().getFullYear();
    const { data, error } = await supabase
        .from('subscription_receipts')
        .select('receipt_number')
        .ilike('receipt_number', `SUB-${year}-%`)
        .order('receipt_number', { ascending: false })
        .limit(1);
    let nextNumber = 1;
    if (data && data.length > 0) {
        const last = data[0].receipt_number;
        const match = last.match(/SUB-(\d{4})-(\d+)/);
        if (match) {
            nextNumber = parseInt(match[2], 10) + 1;
        }
    }
    return `SUB-${year}-${String(nextNumber).padStart(5, '0')}`;
}

// 2. Upload PDF to Supabase Storage and return public URL
async function uploadSubscriptionReceiptPDF(pdfBlob, receipt_number) {
    const year = new Date().getFullYear();
    const fileName = `${receipt_number}.pdf`;
    const folder = `subscription-receipts/${year}`;
    const bucket = 'receipts-pdfs';
    const filePath = `${folder}/${fileName}`;
    // Remove if already exists (overwrite)
    await supabase.storage.from(bucket).remove([filePath]);
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, pdfBlob, { contentType: 'application/pdf' });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return { publicUrl, bucket, folder, filePath };
}

// 3. Insert into subscription_receipts table
async function insertSubscriptionReceipt({
    receipt_number, user_id, subscription_id, subscription_history_id, amount, payment_method, plan, notes, pdf_url, pdf_bucket, pdf_folder
}) {
    const { error: insertError } = await supabase
        .from('subscription_receipts')
        .insert({
            receipt_number,
            user_id,
            subscription_id,
            subscription_history_id,
            payment_date: new Date().toISOString(),
            amount,
            payment_method,
            plan,
            status: 'paid',
            notes,
            pdf_url,
            pdf_bucket,
            pdf_folder
        });
    if (insertError) throw insertError;
}

// --- Patch simulatePaymentAndSubscribe to store receipt ---
async function simulatePaymentAndSubscribe(paymentMethod, parentModal, planKey = 'basic') {
    // Show loading spinner
    const loading = document.createElement('div');
    loading.className = 'payment-loading';
    loading.innerHTML = '<div style="padding:2em;text-align:center;">Processing payment...<br><span class="spinner"></span></div>';
    parentModal.appendChild(loading);
    await new Promise(res => setTimeout(res, 2000));
    loading.remove();
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session.user.id;
        const now = new Date();
        const endDate = new Date(now);
        endDate.setMonth(endDate.getMonth() + 1);
        const planConfig = PLAN_CONFIG[planKey] || PLAN_CONFIG.basic;
        // Upsert subscription
        const { data: subData, error } = await supabase.from('subscriptions').upsert([
            {
                user_id: userId,
                plan: planKey,
                status: 'active',
                payment_method: paymentMethod,
                start_date: now.toISOString(),
                end_date: endDate.toISOString(),
                created_at: now.toISOString(),
                updated_at: now.toISOString(),
                invoices_count: 0,
                days_remaining: 30,
                max_users: planConfig.maxUsers
            }
        ], { onConflict: ['user_id'], returning: 'representation' });
        if (error) throw error;
        // Get subscription_id
        let subscription_id = null;
        if (subData && subData.length > 0) {
            subscription_id = subData[0].id;
        } else {
            // fallback: fetch latest
            const { data: subFetch } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1);
            if (subFetch && subFetch.length > 0) subscription_id = subFetch[0].id;
        }
        // Get latest subscription_history for this subscription
        let subscription_history_id = null;
        if (subscription_id) {
            const { data: hist } = await supabase
                .from('subscription_history')
                .select('id')
                .eq('subscription_id', subscription_id)
                .order('created_at', { ascending: false })
                .limit(1);
            if (hist && hist.length > 0) subscription_history_id = hist[0].id;
        }
        await createPaymentNotification(userId, paymentMethod, planConfig.price, planConfig.name.en);
        parentModal.remove();
        alert('Subscription successful! Welcome to ' + planConfig.name.en + ' plan.');
        // --- Get next receipt number ---
        const receipt_number = await getNextSubscriptionReceiptNumber();
        // --- Generate PDF as Blob, passing receipt_number ---
        const pdfBlob = await generateSubscriptionInvoiceReceipt({
            userId,
            plan: planConfig.name.en,
            price: planConfig.price,
            paymentMethod,
            startDate: now,
            endDate: endDate,
            asBlob: true,
            receipt_number
        });
        // --- Upload PDF ---
        const { publicUrl, bucket, folder } = await uploadSubscriptionReceiptPDF(pdfBlob, receipt_number);
        // --- Insert into DB ---
        await insertSubscriptionReceipt({
            receipt_number,
            user_id: userId,
            subscription_id,
            subscription_history_id,
            amount: planConfig.priceValue,
            payment_method: paymentMethod,
            plan: planConfig.name.en,
            notes: null,
            pdf_url: publicUrl,
            pdf_bucket: bucket,
            pdf_folder: folder
        });
        // --- Trigger download for user ---
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${receipt_number}.pdf`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        updateTrialBanner();
        logAction('complete_payment', `Completed payment for plan: ${planKey} via ${paymentMethod}`, { plan: planKey, paymentMethod });
    } catch (err) {
        alert('Failed to subscribe: ' + (err.message || err));
    }
}

// --- Generate Subscription Invoice-Receipt PDF ---
async function generateSubscriptionInvoiceReceipt({ userId, plan, price, paymentMethod, startDate, endDate, asBlob, receipt_number }) {
    // Load jsPDF if not present
    if (!window.jspdf) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    // Hardcoded system/company info for 'From:'
    const systemCompany = {
        company_name: 'Walaka Software, Lda',
        address: 'Av. Julius Nyerere, Maputo, Mozambique',
        email: 'info@walakasoftware.com',
        tax_id: '401883155' // Example NUIT
    };
    // Fetch business profile for user info (for 'To:')
    let client = {
        company_name: '-',
        address: '-',
        email: '-',
        tax_id: '-'
    };
    if (userId) {
        const { data: profiles, error: profileError } = await supabase
            .from('business_profiles')
            .select('company_name, address, email, tax_id')
            .eq('user_id', userId)
            .limit(1);
        if (!profileError && profiles && profiles.length > 0) {
            client = {
                company_name: profiles[0].company_name || '-',
                address: profiles[0].address || '-',
                email: profiles[0].email || '-',
                tax_id: profiles[0].tax_id || '-'
            };
        }
    }
    // Fetch user email for client info fallback
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email && client.email === '-') client.email = user.email;
    } catch (e) {}
    // --- PDF Layout ---
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const primary = '#3498db';
    const text = '#2d3436';
    const lightText = '#636e72';
    // Header
    doc.setFillColor(52, 152, 219);
    doc.rect(0, 0, 210, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(255,255,255);
    doc.text(systemCompany.company_name, 14, 15);
    doc.setFontSize(14);
    doc.text('INVOICE-RECEIPT', 180, 15, { align: 'right' });
    // Invoice Number
    doc.setFontSize(11);
    doc.setTextColor(text);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice-Receipt #: ${receipt_number || '-'}`, 14, 30);
    // From (system info)
    doc.setFont('helvetica', 'bold');
    doc.text('From:', 14, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(systemCompany.company_name, 14, 45);
    doc.text(systemCompany.address, 14, 50);
    doc.text(systemCompany.email, 14, 55);
    doc.text(`NUIT: ${systemCompany.tax_id}`, 14, 60);
    // To (user business profile)
    doc.setFont('helvetica', 'bold');
    doc.text('To:', 120, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(client.company_name, 120, 45);
    doc.text(client.address, 120, 50);
    doc.text(client.email, 120, 55);
    doc.text(`NUIT: ${client.tax_id}`, 120, 60);
    // Subscription Details
    let y = 70;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Subscription Details', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 7;
    doc.text(`Plan:`, 14, y); doc.text(plan, 50, y);
    y += 6;
    doc.text(`Price:`, 14, y); doc.text(price, 50, y);
    y += 6;
    doc.text(`Payment Method:`, 14, y); doc.text(paymentMethod, 50, y);
    y += 6;
    doc.text(`Start Date:`, 14, y); doc.text(startDate.toISOString().slice(0,10), 50, y);
    y += 6;
    doc.text(`End Date:`, 14, y); doc.text(endDate.toISOString().slice(0,10), 50, y);
    y += 6;
    doc.text(`Status:`, 14, y); doc.text('Paid', 50, y);
    // Amount Summary Box
    y += 10;
    doc.setDrawColor(primary);
    doc.setFillColor(247, 247, 247);
    doc.roundedRect(120, 65, 70, 25, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(primary);
    doc.text('Amount Paid', 155, 75, { align: 'center' });
    doc.setFontSize(16);
    doc.text(price, 155, 88, { align: 'center' });
    // Notes
    y += 25;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(text);
    doc.text('Notes', 14, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(lightText);
    doc.text('Subscription to WALAKA Invoicing plan. This document serves as both invoice and receipt.', 14, y + 6, { maxWidth: 180 });
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(lightText);
    doc.text('Generated by WALAKA', 105, 287, { align: 'center' });
    if (asBlob) {
        return doc.output('blob');
    } else {
        // Download
        const invoiceNumber = receipt_number || 'SUB-XXXX-00000';
        doc.save(`${invoiceNumber}.pdf`);
    }
}

function setupUpgradeButton() {
    const btn = document.getElementById('upgrade-btn');
    if (btn) {
        btn.addEventListener('click', async (e) => {
            logAction('click_upgrade_button', 'Clicked Upgrade button');
            // console.log('[TrialBanner] Upgrade button clicked. Showing upgrade modal.');
            // Always use the latest plan from global
            const currentPlan = window.currentPlanName || 'Trial';
            showUpgradeModal(currentPlan);
        });
    } else {
        // console.warn('[TrialBanner] #upgrade-btn not found.');
    }
}

// --- Initialize Banner and Buttons ---
// Wait for DOM to be ready before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // console.log('[TrialBanner] DOM loaded, initializing...');
        updateTrialBanner();
        setupUpgradeButton();
    });
} else {
    // DOM is already ready
    // console.log('[TrialBanner] DOM already ready, initializing...');
    updateTrialBanner();
    setupUpgradeButton();
}

// Export functions for external use
window.TrialBanner = {
    updateTrialBanner,
    showUpgradeModal,
    setupUpgradeButton,
    createPaymentNotification,
    createInvoiceNotification,
    // Add manual test function
    testWithValues: function(days, invoices) {
        // console.log('[TrialBanner] Manual test with values:', { days, invoices });
        updateTrialUI(days, invoices, new Date());
    },
    // Test notification creation
    testNotification: async function() {
        // console.log('[TrialBanner] Testing notification creation...');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !session.user) {
                console.error('[TrialBanner] No user session found for test');
                return;
            }
            await createPaymentNotification(session.user.id, 'Test Payment', 'MZN 100', 'Test Plan');
            // console.log('[TrialBanner] Test notification completed');
        } catch (error) {
            console.error('[TrialBanner] Test notification failed:', error);
        }
    },
    // Check existing notifications
    checkNotifications: async function() {
        // console.log('[TrialBanner] Checking existing notifications...');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !session.user) {
                console.error('[TrialBanner] No user session found for check');
                return;
            }
            
            const { data: notifications, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('[TrialBanner] Error checking notifications:', error);
            } else {
                // console.log('[TrialBanner] Found notifications:', notifications);
            }
        } catch (error) {
            console.error('[TrialBanner] Error in checkNotifications:', error);
        }
    },
    // Display subscription receipts
    displaySubscriptionReceipts: async function(userId, tableSelector = '#subscription-receipts-table') {
        const { data, error } = await supabase
            .from('subscription_receipts')
            .select('*')
            .eq('user_id', userId)
            .order('payment_date', { descending: true });
        if (error) return;
        const tbody = document.querySelector(`${tableSelector} tbody`);
        if (!tbody) return;
        tbody.innerHTML = '';
        data.forEach(r => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${r.receipt_number}</td>
                <td>${new Date(r.payment_date).toLocaleDateString()}</td>
                <td>${r.plan}</td>
                <td>${r.amount}</td>
                <td>${r.payment_method}</td>
                <td><a href="${r.pdf_url}" target="_blank">Download</a></td>
            `;
            tbody.appendChild(tr);
        });
    }
};

// Signal that the trial banner is ready
window.dispatchEvent(new Event('trialBannerReady'));

// Test function to verify trial banner is loaded
// console.log('[TrialBanner] Trial banner loaded successfully');
// console.log('[TrialBanner] Available functions:', Object.keys(window.TrialBanner || {}));

// Listen for invoice creation to update banner in real time

document.addEventListener('invoiceCreated', async (event) => {
    // console.log('[TrialBanner] Invoice created event detected, updating banner...');
    
    // Create invoice notification if user has it enabled
    if (event.detail && event.detail.userId) {
        await createInvoiceNotification(event.detail.userId, event.detail.invoiceNumber);
    }
    
    window.TrialBanner.updateTrialBanner();
});

// Listen for language changes to re-apply translations to the trial banner
window.addEventListener('languageChanged', () => {
    if (window.languageManager && typeof window.languageManager.applyTranslations === 'function') {
        window.languageManager.applyTranslations();
    }
}); 