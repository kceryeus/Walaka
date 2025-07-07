/**
 * WALAKA ERP Onboarding Wizard
 * Main JavaScript file for the getting started experience
 */

console.log('[Onboarding] getting-started.js loaded');

import { supabase } from '../../auth.js';

// Initialize onboarding data
let onboardingData = {
    organization: {
        company_name: '',
        tax_id: '',
        address: '',
        website: '',
        email: ''
    },
    invoice: {},
    subscription: {},
    modules: {}
};

// Plan config for onboarding
const PLAN_CONFIG = {
    trial: { price: 0, maxUsers: 1 },
    basic: { price: 250, maxUsers: 2 },
    standard: { price: 500, maxUsers: 5 }
};

// Check if user needs onboarding
document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication first
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        window.location.href = '../login.html';
        return;
    }

    // Check onboarding status from Supabase
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('user_id', session.user.id)
        .single();
    if (profileError) {
        console.error('Error fetching profile:', profileError);
    }
    if (profile && profile.onboarding_completed) {
        window.location.href = '../dashboard.html';
        return;
    }

    // Continue onboarding
    initializeFormValidation();
    setupEventListeners();
    // Populate industries from cae table
    await fetchAndPopulateIndustries();
});

// Initialize form validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('.onboarding-form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            // NUIT validation for organization form
            if (form.id === 'organization-form') {
                const taxIdInput = form.querySelector('#org-tax-id');
                if (taxIdInput) {
                    const nuitValidation = validateOrganizationNUIT(taxIdInput.value);
                    // Remove previous error message
                    let errorMsg = taxIdInput.parentElement.querySelector('.error-message');
                    if (!errorMsg) {
                        errorMsg = document.createElement('div');
                        errorMsg.className = 'error-message';
                        taxIdInput.parentElement.appendChild(errorMsg);
                    }
                    if (!nuitValidation.isValid) {
                        errorMsg.textContent = nuitValidation.message;
                        taxIdInput.classList.add('invalid');
                        taxIdInput.classList.remove('valid');
                        return;
                    } else {
                        errorMsg.textContent = '';
                        taxIdInput.classList.remove('invalid');
                        taxIdInput.classList.add('valid');
                    }
                }
            }
            if (validateForm(form)) {
                // Use the data-step attribute from the .btn-next button inside this form
                const nextBtn = form.querySelector('.btn-next');
                let step = null;
                if (nextBtn) {
                    step = nextBtn.dataset.step;
                } else {
                    // fallback: try to infer step from form id
                    const formIds = {
                        '1': 'organization-form',
                        '2': 'invoice-form',
                        '3': 'payment-form',
                        '4': 'modules-form'
                    };
                    step = Object.keys(formIds).find(key => formIds[key] === form.id);
                }
                if (isValidStep(step)) {
                    saveAndContinue(step);
                } else {
                    console.error('[Onboarding] Invalid step value in form submit:', step);
                }
            }
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Log all .btn-next buttons
    const nextButtons = document.querySelectorAll('.btn-next');
    console.log('[Onboarding] .btn-next buttons found:', nextButtons);
    // Remove individual listeners for .btn-next
    // Use event delegation instead
    document.addEventListener('click', function(e) {
        if (e.target.classList && e.target.classList.contains('btn-next')) {
            const button = e.target;
            const currentStep = button.dataset.step;
            if (isValidStep(currentStep)) {
                console.log('[Onboarding] Delegated Next button clicked. Step:', currentStep);
                const form = document.getElementById(getFormId(currentStep));
                console.log('[Onboarding] Found form:', form);
                if (validateForm(form)) {
                    console.log('[Onboarding] Form is valid. Proceeding to saveAndContinue.');
                    saveAndContinue(currentStep);
                } else {
                    console.log('[Onboarding] Form is invalid.');
                }
            } else {
                console.error('[Onboarding] Invalid step value in .btn-next click:', currentStep);
            }
        }
    });

    // Previous buttons
    document.querySelectorAll('.btn-prev').forEach(button => {
        button.addEventListener('click', () => {
            const currentStep = button.dataset.step;
            goToStep(parseInt(currentStep) - 1);
        });
    });

    // Complete setup button
    document.querySelector('.btn-complete').addEventListener('click', completeSetup);

    // Template selection
    document.querySelectorAll('.template-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.template-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            onboardingData.invoice.template = option.dataset.template;
        });
    });

    // Color theme selection
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            onboardingData.invoice.color = option.dataset.color;
        });
    });

    // Payment method selection
    document.querySelectorAll('input[name="payment-method"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const bankDetails = document.getElementById('bank-details-section');
            const mobileMoney = document.getElementById('mobile-money-section');
            
            bankDetails.style.display = radio.value === 'bank_deposit' ? 'block' : 'none';
            mobileMoney.style.display = ['mpesa', 'emola'].includes(radio.value) ? 'block' : 'none';
            
            onboardingData.subscription.paymentMethod = radio.value;
        });
    });

    // Module toggles
    document.querySelectorAll('.module-toggle input').forEach(toggle => {
        toggle.addEventListener('change', () => {
            const moduleCard = toggle.closest('.module-card');
            moduleCard.classList.toggle('selected', toggle.checked);
            onboardingData.modules[toggle.id] = toggle.checked;
        });
    });
}

// Validate form
function validateForm(form) {
    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            isValid = false;
            field.classList.add('error');
        } else {
            field.classList.remove('error');
        }
    });

    return isValid;
}

// Save and continue to next step
async function saveAndContinue(step) {
    if (!isValidStep(step)) {
        console.error('[Onboarding] saveAndContinue called with invalid step:', step);
        return;
    }
    const form = document.getElementById(getFormId(step));
    const formData = new FormData(form);
    // Get userId at the start so it's available for all steps
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session.user.id;
    console.log('[Onboarding] saveAndContinue called for step:', step);
    console.log('[Onboarding] Form:', form);
    console.log('[Onboarding] FormData entries:', Array.from(formData.entries()));
    // Save form data to onboardingData
    switch(step) {
        case '1':
            onboardingData.organization = {
                company_name: formData.get('org-name'),
                industry: formData.get('org-industry'),
                location: formData.get('org-location'),
                address: formData.get('org-address'),
                tax_id: formData.get('org-tax-id'),
                currency: formData.get('org-currency')
                // Optionally handle logo upload if needed
            };
            console.log('[Onboarding] onboardingData.organization:', onboardingData.organization);
            break;
        case '2':
            onboardingData.invoice = {
                ...onboardingData.invoice,
                ...Object.fromEntries(formData)
            };
            break;
        case '3':
            // Only use valid columns for subscriptions table
            let paymentMethod = formData.get('payment-method');
            if (!paymentMethod) {
                paymentMethod = onboardingData.subscription.paymentMethod;
            }
            const selectedPlan = formData.get('plan') || 'trial';
            const now = new Date();
            const startDate = now.toISOString();
            const endDateObj = new Date(now);
            endDateObj.setDate(endDateObj.getDate() + 30);
            const endDate = endDateObj.toISOString();
            const planConfig = PLAN_CONFIG[selectedPlan] || PLAN_CONFIG.basic;
            const subscriptionPayload = {
                user_id: userId,
                payment_method: paymentMethod,
                plan: selectedPlan,
                status: 'active',
                start_date: startDate,
                end_date: endDate,
                max_users: planConfig.maxUsers,
                // Optionally set invoices_count, days_remaining if you have those values
            };
            onboardingData.subscription = subscriptionPayload;
            await supabase
                .from('subscriptions')
                .upsert(subscriptionPayload);
            break;
        case '4':
            onboardingData.modules = {
                ...onboardingData.modules,
                ...Object.fromEntries(formData)
            };
            break;
    }

    // Save to Supabase
    try {
        if (step === '1') {
            // Save business profile
            const { error: businessError } = await supabase
                .from('business_profiles')
                .upsert({
                    user_id: userId,
                    company_name: onboardingData.organization.company_name,
                    tax_id: onboardingData.organization.tax_id,
                    address: onboardingData.organization.address,
                    website: onboardingData.organization.website,
                    email: onboardingData.organization.email,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (businessError) throw businessError;
        } else {
            // Save other settings
            await supabase
                .from('settings')
                .update({
                    invoice: onboardingData.invoice,
                    subscription: onboardingData.subscription,
                    modules: onboardingData.modules
                })
                .eq('user_id', userId);
        }

        // Go to next step or complete setup
        const nextStep = parseInt(step) + 1;
        if (nextStep > 4) {
            // If there are only 4 steps, complete the setup
            completeSetup();
        } else {
            goToStep(nextStep);
        }
    } catch (error) {
        console.error('Error saving onboarding data:', error);
        showNotification('Error saving data. Please try again.', 'error');
    }
}

// Complete setup
async function completeSetup() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session.user.id;

        // Update user profile with onboarding completion
        await supabase
            .from('profiles')
            .update({ onboarding_completed: true })
            .eq('user_id', userId);

        // Clear onboarding flag
        localStorage.removeItem('needsOnboarding');

        // Show completion screen
        document.querySelectorAll('.onboarding-step').forEach(step => step.style.display = 'none');
        document.getElementById('completion').style.display = 'block';

        // Redirect to dashboard after a short delay
        setTimeout(() => {
            window.location.href = '../dashboard.html';
        }, 1200);
    } catch (error) {
        console.error('Error completing setup:', error);
        showNotification('Error completing setup. Please try again.', 'error');
    }
}

// Helper functions
function getFormId(step) {
    const formIds = {
        '1': 'organization-form',
        '2': 'invoice-form',
        '3': 'payment-form',
        '4': 'modules-form'
    };
    return formIds[step];
}

function goToStep(step) {
    const stepEl = document.getElementById(`step-${step}`);
    if (!stepEl) {
        console.error(`Step ${step} not found`);
        return;
    }
    document.querySelectorAll('.onboarding-step').forEach(s => s.style.display = 'none');
    stepEl.style.display = 'block';
    // Update progress steps
    document.querySelectorAll('.progress-step').forEach((s, index) => {
        s.classList.toggle('active', index + 1 <= step);
    });
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.querySelector('.notification-container').appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function isValidStep(step) {
    return ['1', '2', '3', '4'].includes(String(step));
}

// --- CAE Industry Fetch & Populate ---
async function fetchAndPopulateIndustries() {
    const industrySelect = document.getElementById('org-industry');
    if (!industrySelect) return;
    try {
        // Show loading state
        industrySelect.innerHTML = '<option value="" data-lang="en">Loading industries...</option><option value="" data-lang="pt">A carregar indústrias...</option>';
        // Fetch industries from cae table
        const { data, error } = await supabase
            .from('cae')
            .select('Subclasse, Descricao')
            .order('Descricao', { ascending: true });
        if (error) throw error;
        if (!data || data.length === 0) {
            industrySelect.innerHTML = '<option value="" data-lang="en">No industries found</option><option value="" data-lang="pt">Nenhuma indústria encontrada</option>';
            return;
        }
        // Only keep rows with a valid subclasse (number)
        const validIndustries = data.filter(row => row.Subclasse && /^\d+$/.test(row.Subclasse) && row.Descricao && row.Descricao.trim() !== '');
        // Sort by subclasse ascending (as number)
        validIndustries.sort((a, b) => Number(a.Subclasse) - Number(b.Subclasse));
        // Populate select
        industrySelect.innerHTML = '<option value="" data-lang="en">Select industry</option><option value="" data-lang="pt">Selecione a Indústria</option>' +
            validIndustries.map(row => `<option value="${row.Subclasse}">${row.Subclasse} - ${row.Descricao}</option>`).join('');
    } catch (err) {
        industrySelect.innerHTML = '<option value="" data-lang="en">Failed to load industries</option><option value="" data-lang="pt">Falha ao carregar indústrias</option>';
        console.error('Error loading industries:', err);
    }
}

// Add NUIT validation for organization (business) - must be 9 digits and start with 4
function validateOrganizationNUIT(value) {
    const cleanNUIT = (value || '').replace(/\D/g, '');
    if (!cleanNUIT) {
        return { isValid: false, message: 'NUIT is required' };
    }
    if (cleanNUIT.length !== 9) {
        return { isValid: false, message: 'NUIT must be exactly 9 digits' };
    }
    if (cleanNUIT.charAt(0) !== '4') {
        return { isValid: false, message: 'Company NUIT must start with 4' };
    }
    return { isValid: true, message: '' };
}

