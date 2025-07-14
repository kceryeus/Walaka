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
    clearErrors(form);
    let isValid = true;

    // Get all required fields
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });

    // Special validation for specific fields
    const emailFields = form.querySelectorAll('input[type="email"]');
    emailFields.forEach(field => {
        if (field.value && !validateEmail(field.value)) {
            showError(field, getErrorMessage(field.name, 'email'));
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
    const formGroup = input.closest('.form-group');
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    formGroup.appendChild(errorDiv);
    input.classList.add('error');
}

/**
 * Clear all error messages in a form
 * @param {HTMLFormElement} form - The form to clear errors from
 */
function clearErrors(form) {
    const errorMessages = form.querySelectorAll('.error-message');
    const errorInputs = form.querySelectorAll('.error');
    
    errorMessages.forEach(error => error.remove());
    errorInputs.forEach(input => input.classList.remove('error'));
}

/**
 * Get an error message based on the error type and current language
 * @param {string} type - The type of error ('required', 'email', etc.)
 * @param {HTMLElement} input - The input with the error
 * @returns {string} - The error message
 */
function getErrorMessage(field, type) {
    const messages = {
        required: 'This field is required',
        email: 'Please enter a valid email address',
        phone: 'Please enter a valid phone number',
        number: 'Please enter a valid number',
        url: 'Please enter a valid URL',
        minLength: 'This field must be at least {min} characters',
        maxLength: 'This field must not exceed {max} characters',
        pattern: 'Please enter a valid value'
    };

    return messages[type] || messages.required;
}

/**
 * Collect form data as an object
 * @param {HTMLFormElement} form - The form to collect data from
 * @returns {Object} - The form data as an object
 */
function collectFormData(form) {
    const formData = {};
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            formData[input.name] = input.checked;
        } else if (input.type === 'file') {
            // Handle file uploads separately
            if (input.files.length > 0) {
                formData[input.name] = input.files[0];
            }
        } else if (input.name) {
            formData[input.name] = input.value;
        }
    });

    return formData;
}

// Form validation functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize form validation
    initializeFormValidation();
});

function initializeFormValidation() {
    const forms = document.querySelectorAll('form');
    
    forms.forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (validateForm(form)) {
                const formData = collectFormData(form);
                // Form is valid, data will be handled by getting-started.js
            }
        });

        // Real-time validation
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                validateField(input);
            });
        });
    });
}

function validateField(field) {
    if (field.hasAttribute('required') && !field.value.trim()) {
        showError(field, getErrorMessage(field.name, 'required'));
        return false;
    }

    if (field.type === 'email' && field.value && !validateEmail(field.value)) {
        showError(field, getErrorMessage(field.name, 'email'));
        return false;
    }

    if (field.type === 'tel' && field.value) {
        const phoneRegex = /^[0-9+\-\s()]*$/;
        if (!phoneRegex.test(field.value)) {
            showError(field, getErrorMessage(field.name, 'phone'));
            return false;
        }
    }

    if (field.type === 'url' && field.value) {
        try {
            new URL(field.value);
        } catch {
            showError(field, getErrorMessage(field.name, 'url'));
            return false;
        }
    }

    if (field.hasAttribute('minlength')) {
        const minLength = parseInt(field.getAttribute('minlength'));
        if (field.value.length < minLength) {
            showError(field, getErrorMessage(field.name, 'minLength').replace('{min}', minLength));
            return false;
        }
    }

    if (field.hasAttribute('maxlength')) {
        const maxLength = parseInt(field.getAttribute('maxlength'));
        if (field.value.length > maxLength) {
            showError(field, getErrorMessage(field.name, 'maxLength').replace('{max}', maxLength));
            return false;
        }
    }

    return true;
}
