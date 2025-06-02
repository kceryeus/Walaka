/**
 * Getting Started Wizard Module
 * Manages the multi-step onboarding wizard for the WALAKA ERP system
 */

// Store the current step
let currentStep = 1;
const totalSteps = 4;

// Store collected data from each step
const onboardingData = {
    organization: {},
    invoice: {},
    payment: {},
    modules: {}
};

/**
 * Initialize the onboarding wizard
 */
function initOnboardingWizard() {
    // Set up navigation between steps
    setupNavigation();
    
    // Set up form submissions
    setupFormSubmissions();
    
    // Set up template selection
    setupTemplateSelection();
    
    // Set up payment method toggles
    setupPaymentMethodToggles();
    
    // Show the first step
    showStep(1);
}

/**
 * Set up navigation between steps
 */
function setupNavigation() {
    // Step navigation through sidebar
    document.querySelectorAll('.progress-step').forEach(step => {
        step.addEventListener('click', function() {
            const stepNumber = parseInt(this.dataset.step);
            
            // Only allow navigation to steps that have been completed or the next available step
            if (stepNumber <= currentStep) {
                navigateToStep(stepNumber);
            }
        });
    });
    
    // Next buttons
    document.querySelectorAll('.btn-next').forEach(button => {
        button.addEventListener('click', function() {
            const stepNumber = parseInt(this.dataset.step);
            saveAndContinue(stepNumber);
        });
    });
    
    // Previous buttons
    document.querySelectorAll('.btn-prev').forEach(button => {
        button.addEventListener('click', function() {
            const stepNumber = parseInt(this.dataset.step);
            navigateToStep(stepNumber - 1);
        });
    });
    
    // Skip buttons
    document.querySelectorAll('.btn-skip').forEach(button => {
        button.addEventListener('click', function() {
            const currentForm = document.querySelector(`#step-${currentStep} form`);
            // Clear the form but move to the next step
            if (currentForm) {
                currentForm.reset();
            }
            navigateToStep(currentStep + 1);
        });
    });
    
    // Complete setup button
    const completeButton = document.querySelector('.btn-complete');
    if (completeButton) {
        completeButton.addEventListener('click', function() {
            completeSetup();
        });
    }
    
    // Go to dashboard button in completion page
    const dashboardButton = document.querySelector('a[href="/dashboard"]');
    if (dashboardButton) {
        dashboardButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/dashboard';
        });
    }
}

/**
 * Set up form submissions
 */
function setupFormSubmissions() {
    // Organization form
    const organizationForm = document.getElementById('organization-form');
    if (organizationForm) {
        organizationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveAndContinue(1);
        });
    }
    
    // Invoice form
    const invoiceForm = document.getElementById('invoice-form');
    if (invoiceForm) {
        invoiceForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveAndContinue(2);
        });
    }
    
    // Payment form
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', function(e) {
            e.preventDefault();
            saveAndContinue(3);
        });
    }
    
    // Modules form
    const modulesForm = document.getElementById('modules-form');
    if (modulesForm) {
        modulesForm.addEventListener('submit', function(e) {
            e.preventDefault();
            completeSetup();
        });
    }
}

/**
 * Set up template selection
 */
function setupTemplateSelection() {
    const templateOptions = document.querySelectorAll('.template-option');
    const selectedTemplateInput = document.getElementById('selected-template');
    
    templateOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            templateOptions.forEach(opt => opt.classList.remove('selected'));
            
            // Add selected class to clicked option
            this.classList.add('selected');
            
            // Update hidden input value
            if (selectedTemplateInput) {
                selectedTemplateInput.value = this.dataset.template;
            }
        });
    });
}

/**
 * Set up payment method toggles
 */
function setupPaymentMethodToggles() {
    const bankDepositRadio = document.getElementById('payment-bank');
    const mpesaRadio = document.getElementById('payment-mpesa');
    const emolaRadio = document.getElementById('payment-emola');
    const bankDetailsSection = document.getElementById('bank-details-section');
    const mobileMoneySection = document.getElementById('mobile-money-section');
    
    // Function to handle payment method changes
    function handlePaymentMethodChange() {
        // Hide all payment method specific sections first
        if (bankDetailsSection) bankDetailsSection.style.display = 'none';
        if (mobileMoneySection) mobileMoneySection.style.display = 'none';
        
        // Show relevant section based on selected payment method
        if (bankDepositRadio && bankDepositRadio.checked) {
            if (bankDetailsSection) bankDetailsSection.style.display = 'block';
        } else if ((mpesaRadio && mpesaRadio.checked) || 
                  (emolaRadio && emolaRadio.checked)) {
            if (mobileMoneySection) mobileMoneySection.style.display = 'block';
        }
    }
    
    // Add event listeners to all payment method radio buttons
    if (bankDepositRadio) {
        bankDepositRadio.addEventListener('change', handlePaymentMethodChange);
    }
    
    if (mpesaRadio) {
        mpesaRadio.addEventListener('change', handlePaymentMethodChange);
    }
    
    if (emolaRadio) {
        emolaRadio.addEventListener('change', handlePaymentMethodChange);
    }
    
    // Initialize display based on initial selection
    handlePaymentMethodChange();
}

/**
 * Navigate to a specific step
 * @param {number} stepNumber - The step number to navigate to
 */
function navigateToStep(stepNumber) {
    // Validate step number
    if (stepNumber < 1 || stepNumber > totalSteps + 1) {
        return;
    }
    
    // Hide all steps
    document.querySelectorAll('.onboarding-step').forEach(step => {
        step.style.display = 'none';
    });
    
    // Show the selected step
    if (stepNumber <= totalSteps) {
        document.getElementById(`step-${stepNumber}`).style.display = 'block';
    } else if (stepNumber === totalSteps + 1) {
        // Show completion step
        document.getElementById('completion').style.display = 'block';
    }
    
    // Update current step
    currentStep = stepNumber;
    
    // Update progress indicators
    updateProgressIndicators();
}

/**
 * Show a specific step
 * @param {number} stepNumber - The step number to show
 */
function showStep(stepNumber) {
    navigateToStep(stepNumber);
}

/**
 * Update progress indicators in the sidebar
 */
function updateProgressIndicators() {
    // Update step indicators
    document.querySelectorAll('.progress-step').forEach(step => {
        const stepNumber = parseInt(step.dataset.step);
        
        step.classList.remove('active', 'completed');
        
        if (stepNumber === currentStep) {
            step.classList.add('active');
        } else if (stepNumber < currentStep) {
            step.classList.add('completed');
        }
    });
}

/**
 * Save the current step's data and continue to the next step
 * @param {number} stepNumber - The current step number
 */
function saveAndContinue(stepNumber) {
    const stepId = `step-${stepNumber}`;
    const stepElement = document.getElementById(stepId);
    
    if (!stepElement) {
        console.error(`Step element with ID ${stepId} not found`);
        return;
    }
    
    const form = stepElement.querySelector('form');
    
    if (!form) {
        console.error(`Form not found in step ${stepId}`);
        return;
    }
    
    // Validate the form
    if (typeof validateForm === 'function' && !validateForm(form)) {
        return;
    }
    
    // Collect form data
    const formData = typeof collectFormData === 'function' ? 
                    collectFormData(form) : 
                    new FormData(form);
    
    // Store the data based on the step
    switch (stepNumber) {
        case 1:
            onboardingData.organization = formData;
            break;
        case 2:
            onboardingData.invoice = formData;
            break;
        case 3:
            onboardingData.payment = formData;
            break;
        case 4:
            onboardingData.modules = formData;
            break;
    }
    
    // Save the data to the server
    saveStepData(stepNumber, formData)
        .then(() => {
            // Navigate to the next step
            navigateToStep(stepNumber + 1);
        })
        .catch(error => {
            showNotification('error', `Error saving data: ${error.message}`);
        });
}

/**
 * Save step data to the server
 * @param {number} stepNumber - The step number
 * @param {Object} data - The data to save
 * @returns {Promise} - A promise that resolves when the data is saved
 */
function saveStepData(stepNumber, data) {
    return fetch('/save-step', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            step: stepNumber,
            data: data
        })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            showNotification('success', result.message);
            return result;
        } else {
            throw new Error(result.message || 'Unknown error occurred');
        }
    });
}

/**
 * Complete the setup process
 */
function completeSetup() {
    // Collect data from the last step
    const modulesForm = document.getElementById('modules-form');
    
    if (modulesForm) {
        const formData = typeof collectFormData === 'function' ? 
                       collectFormData(modulesForm) : 
                       new FormData(modulesForm);
        onboardingData.modules = formData;
    }
    
    // Save the final step data
    saveStepData(4, onboardingData.modules)
        .then(() => {
            // Send completion request to the server
            return fetch('/complete-onboarding', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(onboardingData)
            });
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(result => {
            if (result.success) {
                showNotification('success', result.message);
                navigateToStep(totalSteps + 1);
            } else {
                throw new Error(result.message || 'Unknown error occurred');
            }
        })
        .catch(error => {
            showNotification('error', `Error completing setup: ${error.message}`);
        });
}

/**
 * Show a notification message
 * @param {string} type - The notification type ('success', 'error', 'info')
 * @param {string} message - The message to display
 */
function showNotification(type, message) {
    // Create notification element if it doesn't exist
    let notification = document.querySelector('.notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.className = 'notification';
        document.body.appendChild(notification);
    }
    
    // Set notification type and message
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Show the notification
    notification.style.display = 'block';
    
    // Hide the notification after 3 seconds
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initOnboardingWizard);
