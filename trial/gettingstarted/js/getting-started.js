/**
 * WALAKA ERP Onboarding Wizard
 * Main JavaScript file for the getting started experience
 */

// Initialize onboarding data
let onboardingData = {
    organization: {},
    invoice: {},
    subscription: {},
    modules: {}
};

// Check if user needs onboarding
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Check if user is logged in
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) {
            window.location.href = '../login.html';
            return;
        }

        // Set onboarding flag if not set
        if (!localStorage.getItem('needsOnboarding')) {
            localStorage.setItem('needsOnboarding', 'true');
        }

        // Initialize form validation
        initializeFormValidation();
        
        // Setup event listeners
        setupEventListeners();
        
        // Load any existing data
        await loadExistingData();

    } catch (error) {
        console.error('Error during initialization:', error);
        showNotification('Error initializing application. Please try again.', 'error');
    }
});

// Load existing data from Supabase
async function loadExistingData() {
    try {
        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) {
            window.location.href = '../login.html';
            return;
        }

        // Load organization data
        const { data: orgData, error: orgError } = await window.supabase
            .from('business_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (orgData) {
            onboardingData.organization = orgData;
            populateOrganizationForm(orgData);
        }

        // Load invoice settings
        const { data: invoiceData, error: invoiceError } = await window.supabase
            .from('invoice_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (invoiceData) {
            onboardingData.invoice = {
                ...invoiceData.content,
                template: invoiceData.template
            };
            populateInvoiceForm(onboardingData.invoice);
        }

    } catch (error) {
        console.error('Error loading data:', error);
        // Don't show error for new users
        if (!error.message.includes('No rows found')) {
            showNotification('Error loading data. Please try again.', 'error');
        }
    }
}

// Populate organization form with existing data
function populateOrganizationForm(data) {
    const form = document.getElementById('organization-form');
    if (!form) return;

    const fields = {
        'org-name': data.name,
        'org-industry': data.industry,
        'org-location': data.location,
        'org-address': data.address,
        'org-tax-id': data.tax_id,
        'org-currency': data.currency || 'MZN'
    };

    Object.entries(fields).forEach(([id, value]) => {
        const element = form.querySelector(`#${id}`);
        if (element && value) {
            element.value = value;
        }
    });
}

// Populate invoice form with existing data
function populateInvoiceForm(data) {
    const form = document.getElementById('invoice-form');
    if (!form) return;

    const fields = {
        'invoice-template': data.template,
        'payment-terms': data.payment_terms,
        'invoice-notes': data.notes
    };

    Object.entries(fields).forEach(([id, value]) => {
        const element = form.querySelector(`#${id}`);
        if (element && value) {
            element.value = value;
        }
    });

    // Handle template selection
    if (data.template) {
        const templateOption = form.querySelector(`.template-option[data-template="${data.template}"]`);
        if (templateOption) {
            document.querySelectorAll('.template-option').forEach(opt => opt.classList.remove('selected'));
            templateOption.classList.add('selected');
        }
    }

    // Handle color theme
    if (data.color) {
        const colorOption = form.querySelector(`.color-option[data-color="${data.color}"]`);
        if (colorOption) {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
            colorOption.classList.add('selected');
        }
    }
}

// Initialize form validation
function initializeFormValidation() {
    const forms = document.querySelectorAll('.onboarding-form');
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateForm(form)) {
                const nextBtn = form.querySelector('.btn-next');
                let step = null;
                if (nextBtn) {
                    step = Number(nextBtn.dataset.step);
                } else {
                    const formIds = {
                        1: 'organization-form',
                        2: 'invoice-form',
                        3: 'payment-form',
                        4: 'modules-form'
                    };
                    step = Number(Object.keys(formIds).find(key => formIds[key] === form.id));
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
    // Next buttons
    document.querySelectorAll('.btn-next').forEach(button => {
        button.addEventListener('click', () => {
            const currentStep = Number(button.dataset.step);
            if (isValidStep(currentStep)) {
                const form = document.getElementById(getFormId(currentStep));
                if (validateForm(form)) {
                    saveAndContinue(currentStep);
                }
            } else {
                console.error('[Onboarding] Invalid step value in .btn-next click:', currentStep);
            }
        });
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
    try {
        const formId = getFormId(step);
        const form = document.getElementById(formId);
        
        if (!form) {
            console.error(`Form ${formId} not found`);
            return;
        }

        if (!validateForm(form)) {
            return;
        }

        const formData = collectFormData(form);
        const { data: { user } } = await window.supabase.auth.getUser();

        if (!user) {
            window.location.href = '../login.html';
            return;
        }

        switch(step) {
            case 1: // Organization
                const { data: orgData, error: orgError } = await window.supabase
                    .from('business_profiles')
                    .upsert({
                        user_id: user.id,
                        company_name: formData['org-name'],
                        tax_id: formData['org-tax-id'],
                        address: formData['org-address'],
                        website: formData['org-website'], // if present in your form
                        email: formData['org-email'],     // if present in your form
                        // add other fields as needed
                    })
                    .select()
                    .single();

                if (orgError) {
                    console.error('Supabase orgError:', orgError);
                    console.error('Supabase orgData:', orgData);
                    throw orgError;
                }
                onboardingData.organization = orgData;
                break;

            case 2: // Invoice Settings
                const { data: invoiceData, error: invoiceError } = await window.supabase
                    .from('invoice_settings')
                    .upsert({
                        user_id: user.id,
                        template: formData.template || 'classic',
                        content: {
                            prefix: formData.prefix,
                            next_number: formData.next_number,
                            color: formData.color,
                            currency: formData.currency,
                            tax_rate: formData.tax_rate,
                            payment_terms: formData.payment_terms,
                            notes: formData.notes
                        }
                    })
                    .select()
                    .single();

                if (invoiceError) {
                    console.error('Supabase invoiceError:', invoiceError);
                    console.error('Supabase invoiceData:', invoiceData);
                    throw invoiceError;
                }
                onboardingData.invoice = {
                    ...invoiceData.content,
                    template: invoiceData.template
                };
                break;

            case 3: // Subscription
                // Check if the table exists or skip this step for now
                try {
                    const { data: subData, error: subError } = await window.supabase
                        .from('subscriptions')
                        .upsert({
                            user_id: user.id,
                            ...formData
                        })
                        .select()
                        .single();

                    if (subError) {
                        console.error('Supabase subError:', subError);
                        console.error('Supabase subData:', subData);
                        // Optionally: skip this error to allow onboarding to continue
                        // break;
                        throw subError;
                    }
                    onboardingData.subscription = subData;
                } catch (err) {
                    console.error('Subscription step skipped or failed:', err);
                    // Optionally: break; // to continue onboarding
                }
                break;

            case 4: // Modules
                const { data: modulesData, error: modulesError } = await window.supabase
                    .from('user_modules')
                    .upsert({
                        user_id: user.id,
                        ...formData
                    })
                    .select()
                    .single();

                if (modulesError) {
                    console.error('Supabase modulesError:', modulesError);
                    console.error('Supabase modulesData:', modulesData);
                    throw modulesError;
                }
                onboardingData.modules = modulesData;
                break;
        }

        // Only advance to valid steps or complete setup
        const nextStep = Number(step) + 1;
        if (isValidStep(nextStep)) {
            goToStep(nextStep);
        } else {
            completeSetup();
        }
        showNotification('Data saved successfully!', 'success');

    } catch (error) {
        console.error('Error saving data:', error);
        if (error && error.response) {
            try {
                error.response.json().then(data => {
                    console.error('Supabase error response:', data);
                });
            } catch (e) {
                console.error('Error parsing error response:', e);
            }
        }
        showNotification('Error saving data. Please try again.', 'error');
    }
}

// Complete setup
async function completeSetup() {
    try {
        const { data: { session } } = await window.supabase.auth.getSession();
        const userId = session.user.id;

        // Update user profile with onboarding completion
        await window.supabase
            .from('profiles')
            .update({ onboarding_completed: true })
            .eq('user_id', userId);

        // Clear onboarding flag
        localStorage.removeItem('needsOnboarding');

        // Show completion screen
        document.querySelectorAll('.onboarding-step').forEach(step => step.style.display = 'none');
        document.getElementById('completion').style.display = 'block';
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
    const steps = document.querySelectorAll('.onboarding-step');
    const targetStep = document.getElementById(`step-${step}`);
    
    if (!targetStep) {
        console.error(`Step ${step} not found`);
        return;
    }

    steps.forEach(s => s.style.display = 'none');
    targetStep.style.display = 'block';
    
    // Update progress steps
    document.querySelectorAll('.progress-step').forEach((s, index) => {
        s.classList.toggle('active', index + 1 <= step);
    });
}

function showNotification(message, type = 'success') {
    const container = document.querySelector('.notification-container');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function isValidStep(step) {
    return [1, 2, 3, 4].includes(Number(step));
}
