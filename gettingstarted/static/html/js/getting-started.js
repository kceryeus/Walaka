/**
 * WALAKA ERP Onboarding Wizard
 * Main JavaScript file for the getting started experience
 */

// Current step in the onboarding process
let currentStep = 1;
// Total number of steps
const totalSteps = 4;
// Data collected from all steps
const onboardingData = {};

/**
 * Initialize the onboarding wizard
 */
function initOnboardingWizard() {
    setupNavigation();
    setupFormSubmissions();
    setupTemplateSelection();
    setupPaymentMethodToggles();
    
    // Start at step 1
    showStep(1);
    updateProgressIndicators();
}

/**
 * Set up navigation between steps
 */
function setupNavigation() {
    // Next buttons
    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', function() {
            const step = parseInt(this.getAttribute('data-step'));
            saveAndContinue(step);
        });
    });
    
    // Previous buttons
    document.querySelectorAll('.btn-prev').forEach(btn => {
        btn.addEventListener('click', function() {
            const step = parseInt(this.getAttribute('data-step'));
            navigateToStep(step - 1);
        });
    });
    
    // Sidebar navigation
    document.querySelectorAll('.progress-step').forEach(step => {
        step.addEventListener('click', function() {
            const stepNum = parseInt(this.getAttribute('data-step'));
            
            // Only allow navigation to completed steps or the current step + 1
            if (stepNum <= currentStep) {
                navigateToStep(stepNum);
            }
        });
    });
    
    // Complete setup button
    const completeBtn = document.querySelector('.btn-complete');
    if (completeBtn) {
        completeBtn.addEventListener('click', completeSetup);
    }
}

/**
 * Set up form submissions
 */
function setupFormSubmissions() {
    // Form submission handling will be done via the next buttons
    // This prevents the default form submission
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
        });
    });
}

/**
 * Set up template selection
 */
function setupTemplateSelection() {
    // Invoice template selection
    const templateOptions = document.querySelectorAll('.template-option');
    if (templateOptions.length > 0) {
        templateOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected class from all options
                document.querySelectorAll('.template-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Add selected class to clicked option
                this.classList.add('selected');
                
                // Store the selected template value
                const template = this.getAttribute('data-template');
                onboardingData.invoiceTemplate = template;
            });
        });
    }
    
    // Color theme selection
    const colorOptions = document.querySelectorAll('.color-option');
    if (colorOptions.length > 0) {
        colorOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remove selected class from all options
                document.querySelectorAll('.color-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Add selected class to clicked option
                this.classList.add('selected');
                
                // Store the selected color value
                const color = this.getAttribute('data-color');
                onboardingData.invoiceColor = color;
            });
        });
    }
    
    // Module toggles
    const moduleCards = document.querySelectorAll('.module-card');
    if (moduleCards.length > 0) {
        moduleCards.forEach(card => {
            const checkbox = card.querySelector('input[type="checkbox"]');
            if (checkbox && !checkbox.disabled) {
                checkbox.addEventListener('change', function() {
                    if (this.checked) {
                        card.classList.add('selected');
                    } else {
                        card.classList.remove('selected');
                    }
                });
                
                // Allow clicking the card to toggle the checkbox
                card.addEventListener('click', function(e) {
                    // Don't trigger if clicking on the checkbox itself
                    if (e.target !== checkbox && e.target !== card.querySelector('label')) {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                });
            }
        });
    }
}

/**
 * Set up payment method toggles
 */
function setupPaymentMethodToggles() {
    const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
    if (paymentRadios.length > 0) {
        paymentRadios.forEach(radio => {
            radio.addEventListener('change', handlePaymentMethodChange);
        });
    }
    
    // Initial check
    const checkedRadio = document.querySelector('input[name="payment-method"]:checked');
    if (checkedRadio) {
        handlePaymentMethodChange.call(checkedRadio);
    }
    
    function handlePaymentMethodChange() {
        const bankDetailsSection = document.getElementById('bank-details-section');
        const mobileMoneySection = document.getElementById('mobile-money-section');
        
        // Hide all sections first
        if (bankDetailsSection) bankDetailsSection.style.display = 'none';
        if (mobileMoneySection) mobileMoneySection.style.display = 'none';
        
        // Show relevant section based on selected payment method
        const method = this.value;
        
        if (method === 'bank_deposit' && bankDetailsSection) {
            bankDetailsSection.style.display = 'block';
        } else if ((method === 'mpesa' || method === 'emola') && mobileMoneySection) {
            mobileMoneySection.style.display = 'block';
        }
    }
}

/**
 * Navigate to a specific step
 * @param {number} stepNumber - The step number to navigate to
 */
function navigateToStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > totalSteps) return;
    
    currentStep = stepNumber;
    showStep(currentStep);
    updateProgressIndicators();
}

/**
 * Show a specific step
 * @param {number} stepNumber - The step number to show
 */
function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.onboarding-step').forEach(step => {
        step.style.display = 'none';
    });
    
    // Show the current step
    const currentStepElement = document.getElementById(`step-${stepNumber}`);
    if (currentStepElement) {
        currentStepElement.style.display = 'block';
    }
}

/**
 * Update progress indicators in the sidebar
 */
function updateProgressIndicators() {
    // Update progress steps
    document.querySelectorAll('.progress-step').forEach(step => {
        const stepNum = parseInt(step.getAttribute('data-step'));
        
        // Remove all classes first
        step.classList.remove('active', 'completed');
        
        // Add the appropriate class
        if (stepNum < currentStep) {
            step.classList.add('completed');
        } else if (stepNum === currentStep) {
            step.classList.add('active');
        }
    });
}

/**
 * Save the current step's data and continue to the next step
 * @param {number} stepNumber - The current step number
 */
function saveAndContinue(stepNumber) {
    // Get the form for this step
    let form;
    
    switch (stepNumber) {
        case 1:
            form = document.getElementById('organization-form');
            break;
        case 2:
            form = document.getElementById('invoice-form');
            break;
        case 3:
            form = document.getElementById('payment-form');
            break;
        case 4:
            form = document.getElementById('modules-form');
            break;
    }
    
    // Validate the form
    if (form && validateForm(form)) {
        // Collect form data
        const formData = collectFormData(form);
        
        // Save the data
        saveStepData(stepNumber, formData)
            .then(() => {
                // Show success message
                showNotification('success', 'Saved successfully!');
                
                // Navigate to next step if not the last step
                if (stepNumber < totalSteps) {
                    navigateToStep(stepNumber + 1);
                }
            })
            .catch(error => {
                console.error('Error saving data:', error);
                showNotification('error', 'There was a problem saving your data. Please try again.');
            });
    }
}

/**
 * Save step data to the server
 * @param {number} stepNumber - The step number
 * @param {Object} data - The data to save
 * @returns {Promise} - A promise that resolves when the data is saved
 */
function saveStepData(stepNumber, data) {
    // Store data in the onboardingData object
    onboardingData[`step${stepNumber}`] = data;
    
    // For this HTML-only version, we'll just simulate a server request
    return new Promise((resolve) => {
        // Simulate network delay
        setTimeout(() => {
            console.log(`Saved data for step ${stepNumber}:`, data);
            resolve();
        }, 500);
    });
}

/**
 * Complete the setup process
 */
function completeSetup() {
    // Get the modules form
    const form = document.getElementById('modules-form');
    
    // Validate the form
    if (form && validateForm(form)) {
        // Collect form data
        const formData = collectFormData(form);
        
        // Save the final step data
        saveStepData(4, formData)
            .then(() => {
                // Hide all steps
                document.querySelectorAll('.onboarding-step').forEach(step => {
                    step.style.display = 'none';
                });
                
                // Show completion screen
                const completionScreen = document.getElementById('completion');
                if (completionScreen) {
                    completionScreen.style.display = 'block';
                }
                
                // Show success message
                showNotification('success', 'Setup completed successfully!');
                
                // Update all steps as completed
                document.querySelectorAll('.progress-step').forEach(step => {
                    step.classList.remove('active');
                    step.classList.add('completed');
                });
                
                // Log the collected data
                console.log('Onboarding completed with data:', onboardingData);
            })
            .catch(error => {
                console.error('Error completing setup:', error);
                showNotification('error', 'There was a problem completing your setup. Please try again.');
            });
    }
}

/**
 * Show a notification message
 * @param {string} type - The notification type ('success', 'error', 'info')
 * @param {string} message - The message to display
 */
function showNotification(type, message) {
    const container = document.querySelector('.notification-container');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    let icon;
    switch (type) {
        case 'success':
            icon = 'fa-check-circle';
            break;
        case 'error':
            icon = 'fa-exclamation-circle';
            break;
        case 'info':
        default:
            icon = 'fa-info-circle';
            break;
    }
    
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    
    container.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Remove after a delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Initialize the wizard when the DOM is loaded
document.addEventListener('DOMContentLoaded', initOnboardingWizard);
