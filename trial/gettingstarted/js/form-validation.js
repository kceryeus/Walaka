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
    let isValid = true;
    
    // Validate all fields in the form
    form.querySelectorAll('input, select, textarea').forEach(field => {
        if (!validateField(field)) {
            isValid = false;
        }
    });
    
    // Special validation for password confirmation
    const password = form.querySelector('input[type="password"]');
    const confirmPassword = form.querySelector('input[name="confirmPassword"]');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
        isValid = false;
        confirmPassword.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = getErrorMessage(confirmPassword, 'password_match');
        confirmPassword.parentElement.appendChild(errorDiv);
    }
    
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
function getErrorMessage(field, type) {
    const lang = document.documentElement.lang || 'en';
    const messages = {
        en: {
            required: 'This field is required',
            email: 'Please enter a valid email address',
            phone: 'Please enter a valid phone number (84/85/86/87 XXX XXXX)',
            password_length: 'Password must be at least 8 characters long',
            password_uppercase: 'Password must contain at least one uppercase letter',
            password_lowercase: 'Password must contain at least one lowercase letter',
            password_number: 'Password must contain at least one number',
            password_match: 'Passwords do not match',
            file_size: 'File size must be less than 5MB',
            file_type: 'File must be JPG, PNG, or PDF'
        },
        pt: {
            required: 'Este campo é obrigatório',
            email: 'Por favor, insira um endereço de email válido',
            phone: 'Por favor, insira um número de telefone válido (84/85/86/87 XXX XXXX)',
            password_length: 'A senha deve ter pelo menos 8 caracteres',
            password_uppercase: 'A senha deve conter pelo menos uma letra maiúscula',
            password_lowercase: 'A senha deve conter pelo menos uma letra minúscula',
            password_number: 'A senha deve conter pelo menos um número',
            password_match: 'As senhas não coincidem',
            file_size: 'O tamanho do arquivo deve ser menor que 5MB',
            file_type: 'O arquivo deve ser JPG, PNG ou PDF'
        }
    };
    
    return messages[lang][type] || messages['en'][type];
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

// Form validation functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize form validation
    initializeFormValidation();
});

function initializeFormValidation() {
    const forms = document.querySelectorAll('.onboarding-form');
    
    forms.forEach(form => {
        // Add input event listeners for real-time validation
        form.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('input', function() {
                validateField(this);
            });
            
            input.addEventListener('blur', function() {
                validateField(this);
            });
        });
        
        // Add form submission validation
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            if (validateForm(this)) {
                // Form is valid, proceed with submission
                const formId = this.id;
                const step = formId.split('-')[0];
                saveAndContinue(step);
            }
        });
    });
}

function validateField(field) {
    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';
    
    // Remove existing error message
    const existingError = field.parentElement.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Remove error class
    field.classList.remove('error');
    
    // Required field validation
    if (field.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = getErrorMessage(field, 'required');
    }
    
    // Email validation
    if (field.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            isValid = false;
            errorMessage = getErrorMessage(field, 'email');
        }
    }
    
    // Phone number validation
    if (field.id === 'mobile-number' && value) {
        const phoneRegex = /^(84|85|86|87)\d{7}$/;
        if (!phoneRegex.test(value.replace(/\s/g, ''))) {
            isValid = false;
            errorMessage = getErrorMessage(field, 'phone');
        }
    }
    
    // Password validation
    if (field.type === 'password') {
        if (value.length < 8) {
            isValid = false;
            errorMessage = getErrorMessage(field, 'password_length');
        } else if (!/[A-Z]/.test(value)) {
            isValid = false;
            errorMessage = getErrorMessage(field, 'password_uppercase');
        } else if (!/[a-z]/.test(value)) {
            isValid = false;
            errorMessage = getErrorMessage(field, 'password_lowercase');
        } else if (!/[0-9]/.test(value)) {
            isValid = false;
            errorMessage = getErrorMessage(field, 'password_number');
        }
    }
    
    // File validation
    if (field.type === 'file' && field.files.length > 0) {
        const file = field.files[0];
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
        
        if (file.size > maxSize) {
            isValid = false;
            errorMessage = getErrorMessage(field, 'file_size');
        } else if (!allowedTypes.includes(file.type)) {
            isValid = false;
            errorMessage = getErrorMessage(field, 'file_type');
        }
    }
    
    // Show error message if validation fails
    if (!isValid) {
        field.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = errorMessage;
        field.parentElement.appendChild(errorDiv);
    }
    
    return isValid;
}
