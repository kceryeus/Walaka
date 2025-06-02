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
    const needsOnboarding = localStorage.getItem('needsOnboarding');
    if (!needsOnboarding) {
        window.location.href = '../dashboard.html';
        return;
    }

    // Initialize Supabase client
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
        window.location.href = '../login.html';
        return;
    }

    // Initialize form validation and event listeners
    initializeFormValidation();
    setupEventListeners();
});

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
    const form = document.getElementById(getFormId(step));
    const formData = new FormData(form);
    
    // Save form data to onboardingData
    switch(step) {
        case '1':
            onboardingData.organization = Object.fromEntries(formData);
            break;
        case '2':
            onboardingData.invoice = {
                ...onboardingData.invoice,
                ...Object.fromEntries(formData)
            };
            break;
        case '3':
            onboardingData.subscription = {
                ...onboardingData.subscription,
                ...Object.fromEntries(formData)
            };
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
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session.user.id;

        await supabase
            .from('settings')
            .update({
                organization: onboardingData.organization,
                invoice: onboardingData.invoice,
                subscription: onboardingData.subscription,
                modules: onboardingData.modules
            })
            .eq('user_id', userId);

        // Go to next step
        goToStep(parseInt(step) + 1);
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
    document.querySelectorAll('.onboarding-step').forEach(s => s.style.display = 'none');
    document.getElementById(`step-${step}`).style.display = 'block';
    
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
