/**
 * Form Validation Module
 * Handles form validation for the WALAKA ERP system onboarding wizard
 */

/**
 * Validate a form based on HTML5 validation
 * @param {HTMLFormElement} form - The form to validate
 * @returns {boolean} - True if the form is valid, false otherwise
 */
function validateForm(form) {
    // Get all required inputs
    const requiredInputs = form.querySelectorAll('[required]');
    let isValid = true;
    
    // Clear all error messages
    clearErrors(form);
    
    // Check each required input
    requiredInputs.forEach(input => {
        if (!input.value.trim()) {
            showError(input, getErrorMessage('required', input));
            isValid = false;
        } else if (input.type === 'email' && !validateEmail(input.value)) {
            showError(input, getErrorMessage('email', input));
            isValid = false;
        }
    });
    
    return isValid;
}

/**
 * Validate an email address
 * @param {string} email - The email to validate
 * @returns {boolean} - True if the email is valid, false otherwise
 */
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Show an error message for an input
 * @param {HTMLElement} input - The input with the error
 * @param {string} message - The error message to display
 */
function showError(input, message) {
    // Add error class to the input
    input.classList.add('input-error');
    
    // Create or update the error message
    let errorElement = input.parentElement.querySelector('.error-message');
    
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        input.parentElement.appendChild(errorElement);
    }
    
    errorElement.textContent = message;
}

/**
 * Clear all error messages in a form
 * @param {HTMLFormElement} form - The form to clear errors from
 */
function clearErrors(form) {
    // Remove error class from all inputs
    form.querySelectorAll('.input-error').forEach(input => {
        input.classList.remove('input-error');
    });
    
    // Remove all error message elements
    form.querySelectorAll('.error-message').forEach(element => {
        element.remove();
    });
}

/**
 * Get an error message based on the error type and current language
 * @param {string} type - The type of error ('required', 'email', etc.)
 * @param {HTMLElement} input - The input with the error
 * @returns {string} - The error message
 */
function getErrorMessage(type, input) {
    const lang = window.wakaLanguage ? window.wakaLanguage.getCurrent() : 'en';
    const fieldName = input.previousElementSibling ? input.previousElementSibling.textContent : 'This field';
    
    const messages = {
        required: {
            en: `${fieldName} is required.`,
            pt: `${fieldName} é obrigatório.`
        },
        email: {
            en: 'Please enter a valid email address.',
            pt: 'Por favor, digite um endereço de email válido.'
        },
        default: {
            en: 'Please enter a valid value.',
            pt: 'Por favor, insira um valor válido.'
        }
    };
    
    return messages[type] ? messages[type][lang] : messages.default[lang];
}

/**
 * Collect form data as an object
 * @param {HTMLFormElement} form - The form to collect data from
 * @returns {Object} - The form data as an object
 */
function collectFormData(form) {
    const formData = {};
    
    // Process regular inputs, selects, and textareas
    form.querySelectorAll('input:not([type="checkbox"]):not([type="radio"]), select, textarea').forEach(element => {
        if (element.name) {
            formData[element.name] = element.value;
        } else if (element.id) {
            formData[element.id] = element.value;
        }
    });
    
    // Process checkboxes
    form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
        if (checkbox.name) {
            formData[checkbox.name] = checkbox.checked;
        } else if (checkbox.id) {
            formData[checkbox.id] = checkbox.checked;
        }
    });
    
    // Process radio buttons
    form.querySelectorAll('input[type="radio"]:checked').forEach(radio => {
        if (radio.name) {
            formData[radio.name] = radio.value;
        } else if (radio.id) {
            formData[radio.id] = radio.value;
        }
    });
    
    return formData;
}

// Export functions for use in other modules
window.formValidation = {
    validate: validateForm,
    collectData: collectFormData,
    clearErrors: clearErrors
};
