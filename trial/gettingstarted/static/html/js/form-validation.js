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
    // Clear previous errors
    clearErrors(form);
    
    let isValid = true;
    const inputs = form.querySelectorAll('input, select, textarea');
    
    // Check each input for validity
    inputs.forEach(input => {
        if (input.hasAttribute('required') && input.value.trim() === '') {
            showError(input, getErrorMessage('required', input));
            isValid = false;
        } else if (input.type === 'email' && input.value.trim() !== '' && !validateEmail(input.value)) {
            showError(input, getErrorMessage('email', input));
            isValid = false;
        } else if (input.type === 'tel' && input.value.trim() !== '') {
            // Simple phone validation (adjust as needed)
            const phoneRegex = /^[0-9]{9,}$/;
            if (!phoneRegex.test(input.value.replace(/\D/g, ''))) {
                showError(input, getErrorMessage('phone', input));
                isValid = false;
            }
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
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

/**
 * Show an error message for an input
 * @param {HTMLElement} input - The input with the error
 * @param {string} message - The error message to display
 */
function showError(input, message) {
    const formGroup = input.closest('.form-group');
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    
    // Add error styling
    input.classList.add('error');
    formGroup.appendChild(errorElement);
}

/**
 * Clear all error messages in a form
 * @param {HTMLFormElement} form - The form to clear errors from
 */
function clearErrors(form) {
    // Remove error messages
    const errorMessages = form.querySelectorAll('.error-message');
    errorMessages.forEach(el => el.remove());
    
    // Remove error styling
    const inputs = form.querySelectorAll('.error');
    inputs.forEach(input => input.classList.remove('error'));
}

/**
 * Get an error message based on the error type and current language
 * @param {string} type - The type of error ('required', 'email', etc.)
 * @param {HTMLElement} input - The input with the error
 * @returns {string} - The error message
 */
function getErrorMessage(type, input) {
    // Get the current language
    const currentLang = document.querySelector('.lang-btn.active').getAttribute('data-lang');
    
    // Get field name (for personalized messages)
    let fieldName = input.getAttribute('name').replace('-', ' ');
    fieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
    
    // Error messages in different languages
    const messages = {
        en: {
            required: `${fieldName} is required`,
            email: 'Please enter a valid email address',
            phone: 'Please enter a valid phone number'
        },
        pt: {
            required: `${fieldName} é obrigatório`,
            email: 'Por favor, insira um endereço de email válido',
            phone: 'Por favor, insira um número de telefone válido'
        }
    };
    
    return messages[currentLang][type];
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
        } else if (input.type === 'radio') {
            if (input.checked) {
                formData[input.name] = input.value;
            }
        } else if (input.type === 'file') {
            // Skip file inputs for API calls, we'll handle them separately
            if (input.files.length > 0) {
                formData[input.name] = input.files[0].name; // Just store the filename for now
            }
        } else {
            formData[input.name] = input.value.trim();
        }
    });
    
    return formData;
}
