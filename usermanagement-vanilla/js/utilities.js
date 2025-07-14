/**
 * Utility functions for the user management interface
 */

// Event emitter for app-wide events
export const eventBus = {
    listeners: {},
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    },
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
        // Also dispatch a DOM event for broader interop
        window.dispatchEvent(new CustomEvent(event, { detail: data }));
    }
};

// Format date to locale string
export function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Format time ago
export function timeAgo(date) {
    if (!date) return '';
    
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60,
        second: 1
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
        }
    }
    return 'just now';
}

// Validate email format
export function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Clean user input
export function sanitizeInput(str) {
    if (!str) return '';
    return str.trim()
        .replace(/[<>]/g, '') // Remove < and >
        .slice(0, 255); // Limit length
}

// Format numbers with commas
export function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

// Debounce function calls
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Role-based permission checking
export function checkPermission(userRole, requiredRole) {
    const roles = ['viewer', 'editor', 'admin'];
    const userRoleIndex = roles.indexOf(userRole);
    const requiredRoleIndex = roles.indexOf(requiredRole);
    return userRoleIndex >= requiredRoleIndex;
}

// Get color for role
export function getRoleColor(role) {
    const colors = {
        admin: {
            bg: 'bg-red-100',
            text: 'text-red-800'
        },
        editor: {
            bg: 'bg-blue-100',
            text: 'text-blue-800'
        },
        viewer: {
            bg: 'bg-green-100',
            text: 'text-green-800'
        }
    };
    return colors[role] || colors.viewer;
}

// Show/hide loading overlay
export function toggleLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.toggle('hidden', !show);
    }
}
