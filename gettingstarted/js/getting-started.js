/**
 * WALAKA ERP Onboarding Wizard
 * Main JavaScript file for the getting started experience
 */

console.log('[Onboarding] getting-started.js loaded');

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
    const supabase = window.supabase;
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        window.location.href = '../login.html';
        return;
    }

    // Check onboarding status in users table
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('onboarding')
        .eq('id', session.user.id)
        .single();
    if (user && user.onboarding === 'yes') {
        window.location.href = '../dashboard.html';
        return;
    }

    // Continue onboarding
    initializeFormValidation();
    setupEventListeners();
    // Populate industries from cae table
    await fetchAndPopulateIndustries();

    // NUIT validation and guidance
    const nuitInput = document.getElementById('org-tax-id');
    const nuitHelp = document.querySelector('.nuit-help');
    const orgForm = document.getElementById('organization-form');

    if (nuitInput && nuitHelp && orgForm) {
        // Store translations for NUIT guidance
        const nuitMessages = {
            en: {
                ei: 'NUITs starting with 1 are assigned to Sole Proprietorships (Empresa em Nome Individual)',
                company: 'NUITs starting with 4 are assigned to Corporate Entities (e.g., Limited Liability Companies, Public Limited Companies)',
                invalid: 'NUIT must start with 1 (Sole Proprietorship) or 4 (Corporate Entity)',
                length: 'NUIT must be exactly 9 digits'
            },
            pt: {
                ei: 'NUITs iniciados por 1 são atribuídos a Empresários em Nome Individual (ENI)',
                company: 'NUITs iniciados por 4 são atribuídos a Sociedades (ex: Lda, SA, etc.)',
                invalid: 'O NUIT deve começar com 1 (Empresário em Nome Individual) ou 4 (Sociedade)',
                length: 'O NUIT deve conter exatamente 9 dígitos'
            }
        };
        // Get current language
        function getCurrentLang() {
            return localStorage.getItem('walaka-language') || localStorage.getItem('waLangPreference') || 'en';
        }
        function getNuitMsg(type) {
            const lang = getCurrentLang();
            return nuitMessages[lang] && nuitMessages[lang][type] ? nuitMessages[lang][type] : nuitMessages['en'][type];
        }
        function validateNuitInput() {
            const value = nuitInput.value.trim();
            const cleanValue = value.replace(/\D/g, '');
            let message = '';
            let isValid = false;
            nuitInput.classList.remove('invalid', 'valid');
            nuitHelp.classList.remove('error');
            if (cleanValue.length === 0) {
                nuitHelp.textContent = '';
                return;
            }
            if (cleanValue.length !== 9) {
                message = getNuitMsg('length');
                nuitHelp.classList.add('error');
                nuitInput.classList.add('invalid');
            } else if (cleanValue[0] === '1') {
                message = getNuitMsg('ei');
                nuitInput.classList.add('valid');
                isValid = true;
            } else if (cleanValue[0] === '4') {
                message = getNuitMsg('company');
                nuitInput.classList.add('valid');
                isValid = true;
            } else {
                message = getNuitMsg('invalid');
                nuitHelp.classList.add('error');
                nuitInput.classList.add('invalid');
            }
            nuitHelp.textContent = message;
        }
        nuitInput.addEventListener('input', validateNuitInput);
        // Listen for language changes and update message
        window.addEventListener('storage', function(e) {
            if (e.key && (e.key === 'walaka-language' || e.key === 'waLangPreference')) {
                validateNuitInput();
            }
        });
        // Also listen for custom event from language toggle
        document.addEventListener('languageChanged', validateNuitInput);
        orgForm.addEventListener('submit', function(e) {
            const value = nuitInput.value.trim();
            const cleanValue = value.replace(/\D/g, '');
            let valid = true;
            if (cleanValue.length !== 9) {
                nuitHelp.textContent = getNuitMsg('length');
                nuitHelp.classList.add('error');
                nuitInput.classList.add('invalid');
                nuitInput.focus();
                valid = false;
            } else if (cleanValue[0] !== '1' && cleanValue[0] !== '4') {
                nuitHelp.textContent = getNuitMsg('invalid');
                nuitHelp.classList.add('error');
                nuitInput.classList.add('invalid');
                nuitInput.focus();
                valid = false;
            }
            if (!valid) {
                e.preventDefault();
            }
        });
    }
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
    document.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', completeSetup);
    });

    // Template selection
    document.querySelectorAll('.template-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.template-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            // Only allow valid templates
            const validTemplates = ['classic', 'modern', 'standard', 'minimalist'];
            const selected = option.dataset.template;
            onboardingData.invoice.template = validTemplates.includes(selected) ? selected : 'classic';
        });
    });

    // Color theme selection
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            onboardingData.invoice.color = option.dataset.color; // Always store hex value
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
    const supabase = window.supabase;
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
            // Ensure color is set to a hex value
            let selectedColor = onboardingData.invoice.color;
            if (!selectedColor) {
                const firstColorOption = document.querySelector('.color-option');
                selectedColor = firstColorOption ? firstColorOption.dataset.color : '#3498db';
            }
            onboardingData.invoice = {
                prefix: formData.get('invoice-prefix') || 'INV-',
                next_number: parseInt(formData.get('invoice-next-number')) || 1001,
                template: onboardingData.invoice.template || 'classic',
                color: selectedColor,
                currency: formData.get('default-currency') || 'MZN',
                tax_rate: parseFloat(formData.get('default-tax-rate')) || 17,
                payment_terms: formData.get('payment-terms') || 'net-30',
                notes: formData.get('invoice-notes') || ''
            };
            // Only allow valid templates
            if (!['classic', 'modern'].includes(onboardingData.invoice.template)) {
                onboardingData.invoice.template = 'classic';
            }
            // Save invoice settings to DB using the same structure as settings.js
            const { data: existingSettings } = await supabase
                .from('invoice_settings')
                .select('id,created_at')
                .eq('user_id', userId)
                .single();
            const invoiceSettingsPayload = {
                user_id: userId,
                ...onboardingData.invoice,
                updated_at: new Date().toISOString()
            };
            if (existingSettings) {
                invoiceSettingsPayload.created_at = existingSettings.created_at;
                await supabase
                    .from('invoice_settings')
                    .update(invoiceSettingsPayload)
                    .eq('user_id', userId);
            } else {
                invoiceSettingsPayload.created_at = new Date().toISOString();
                await supabase
                    .from('invoice_settings')
                    .insert([invoiceSettingsPayload]);
            }
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
        } else if (step === '2') {
            // Save invoice settings (already handled above)
        } else if (step === '3') {
            // Save subscription (already handled above)
        } else if (step === '4') {
            // Optionally save modules to a new table, or skip
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
        const supabase = window.supabase;
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session.user.id;

        // Update user profile with onboarding completion
        await supabase
            .from('users')
            .update({ onboarding: 'yes', updated_at: new Date().toISOString() })
            .eq('id', userId);

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
    const supabase = window.supabase;
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
    const supabase = window.supabase;
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

