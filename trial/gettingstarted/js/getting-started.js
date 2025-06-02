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
            .from('organizations')
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
            onboardingData.invoice = invoiceData;
            populateInvoiceForm(invoiceData);
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
                saveAndContinue(form.id);
            }
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Next buttons
    document.querySelectorAll('.btn-next').forEach(button => {
        button.addEventListener('click', () => {
            const currentStep = button.dataset.step;
            const form = document.getElementById(getFormId(currentStep));
            if (validateForm(form)) {
                saveAndContinue(currentStep);
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
                    .from('organizations')
                    .upsert({
                        user_id: user.id,
                        ...formData
                    })
                    .select()
                    .single();

                if (orgError) throw orgError;
                onboardingData.organization = orgData;
                break;

            case 2: // Invoice Settings
                const { data: invoiceData, error: invoiceError } = await window.supabase
                    .from('invoice_settings')
                    .upsert({
                        user_id: user.id,
                        ...formData
                    })
                    .select()
                    .single();

                if (invoiceError) throw invoiceError;
                onboardingData.invoice = invoiceData;
                break;

            case 3: // Subscription
                const { data: subData, error: subError } = await window.supabase
                    .from('subscriptions')
                    .upsert({
                        user_id: user.id,
                        ...formData
                    })
                    .select()
                    .single();

                if (subError) throw subError;
                onboardingData.subscription = subData;
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

                if (modulesError) throw modulesError;
                onboardingData.modules = modulesData;
                break;
        }

        goToStep(step + 1);
        showNotification('Data saved successfully!', 'success');

    } catch (error) {
        console.error('Error saving data:', error);
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
