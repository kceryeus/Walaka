// Utility functions for settings management

export const calculatePasswordStrength = (password) => {
    if (!password) {
        return {
            percentage: 0,
            label: 'None',
            color: '#ef4444'
        };
    }
    
    let strength = 0;
    
    // Length check
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    
    // Complexity checks
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^A-Za-z0-9]/.test(password)) strength += 15;
    
    // Variety check
    const charTypes = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter(regex => regex.test(password)).length;
    if (charTypes >= 3) strength += 10;
    
    // Cap at 100%
    strength = Math.min(strength, 100);
    
    // Determine label and color
    let label, color;
    if (strength < 25) {
        label = 'Very Weak';
        color = '#ef4444';
    } else if (strength < 50) {
        label = 'Weak';
        color = '#f59e0b';
    } else if (strength < 75) {
        label = 'Moderate';
        color = '#3b82f6';
    } else {
        label = 'Strong';
        color = '#22c55e';
    }
    
    return {
        percentage: strength,
        label,
        color
    };
};

export const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

export const validatePhone = (phone) => {
    const re = /^\+?[\d\s-]{8,}$/;
    return re.test(phone);
};

export const formatCurrency = (amount, currency = 'MZN') => {
    return new Intl.NumberFormat('pt-MZ', {
        style: 'currency',
        currency: currency
    }).format(amount);
};

export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export const showToast = (message, type = 'success') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
};

export const showLoadingOverlay = () => {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.remove('hidden');
};

export const hideLoadingOverlay = () => {
    const overlay = document.getElementById('loading-overlay');
    overlay.classList.add('hidden');
};

export const showConfirmationModal = (title, message, onConfirm, onCancel) => {
    const modal = document.getElementById('confirmation-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirm = document.getElementById('modal-confirm');
    const modalCancel = document.getElementById('modal-cancel');
    const closeModal = document.getElementById('close-modal');
    
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    
    // Clear previous event listeners
    const newModalConfirm = modalConfirm.cloneNode(true);
    modalConfirm.parentNode.replaceChild(newModalConfirm, modalConfirm);
    
    const newModalCancel = modalCancel.cloneNode(true);
    modalCancel.parentNode.replaceChild(newModalCancel, modalCancel);
    
    const newCloseModal = closeModal.cloneNode(true);
    closeModal.parentNode.replaceChild(newCloseModal, closeModal);
    
    // Add new event listeners
    newModalConfirm.addEventListener('click', () => {
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
        modal.classList.add('hidden');
    });
    
    newModalCancel.addEventListener('click', () => {
        if (typeof onCancel === 'function') {
            onCancel();
        }
        modal.classList.add('hidden');
    });
    
    newCloseModal.addEventListener('click', () => {
        if (typeof onCancel === 'function') {
            onCancel();
        }
        modal.classList.add('hidden');
    });
    
    modal.classList.remove('hidden');
}; 