/**
 * Main application script for the client management interface
 * Handles sidebar, navigation, and common functionality
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI elements
  initSidebar();
  initMobileMenu();
  initDropdowns();
  initToasts();

  // Log initialization
  console.log('Client Management Interface initialized');
});

/**
 * Initialize sidebar toggle functionality
 */
function initSidebar() {
  const dashboardContainer = document.querySelector('.dashboard-container');
  const sidebar = document.querySelector('.sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');

  // Toggle sidebar on button click
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      dashboardContainer.classList.toggle('sidebar-collapsed');
      
      // Save sidebar state to localStorage
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('sidebar-collapsed', isCollapsed);
    });
  }

  // Restore sidebar state from localStorage
  const savedSidebarState = localStorage.getItem('sidebar-collapsed') === 'true';
  if (savedSidebarState) {
    sidebar.classList.add('collapsed');
    dashboardContainer.classList.add('sidebar-collapsed');
  }
}

/**
 * Initialize mobile menu functionality
 */
function initMobileMenu() {
  const hamburgerMenu = document.getElementById('sidebar-toggle');
  const sidebar = document.querySelector('.sidebar');
  
  if (hamburgerMenu) {
    hamburgerMenu.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (event) => {
    const clickedElement = event.target;
    const isSidebar = clickedElement.closest('.sidebar');
    const isHamburger = clickedElement.closest('#sidebar-toggle');
    
    if (!isSidebar && !isHamburger && sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
    }
  });
}

/**
 * Initialize dropdown functionality
 */
function initDropdowns() {
  const dropdowns = document.querySelectorAll('.dropdown');
  
  dropdowns.forEach(dropdown => {
    const toggle = dropdown.querySelector('.dropdown-toggle');
    
    if (toggle) {
      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        const menu = dropdown.querySelector('.dropdown-menu');
        menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
      });
    }
  });

  // Close dropdowns when clicking elsewhere
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      menu.style.display = 'none';
    });
  });
}

/**
 * Initialize toast notification system
 */
function initToasts() {
  const toastElement = document.getElementById('toast');
  const toastCloseBtn = document.getElementById('toast-close');
  
  if (toastCloseBtn) {
    toastCloseBtn.addEventListener('click', () => {
      toastElement.classList.remove('show');
    });
  }
}

/**
 * Show a toast notification with a message
 * @param {string} message - The message to display
 * @param {string} type - Type of toast: 'success', 'warning', or 'error'
 * @param {number} duration - Duration in milliseconds
 */
function showToast(message, type = 'success', duration = 3000) {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');
  
  if (!toast || !toastMessage || !toastIcon) return;
  
  // Set icon based on type
  toastIcon.className = 'fas';
  switch (type) {
    case 'success':
      toastIcon.classList.add('fa-check-circle');
      break;
    case 'warning':
      toastIcon.classList.add('fa-exclamation-circle');
      break;
    case 'error':
      toastIcon.classList.add('fa-times-circle');
      break;
    default:
      toastIcon.classList.add('fa-info-circle');
  }
  
  // Set message text
  toastMessage.textContent = message;
  
  // Show toast
  toast.classList.add('show');
  
  // Auto-hide after duration
  if (duration > 0) {
    setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }
}

/**
 * Tab switching functionality
 * @param {HTMLElement} tabContainer - The container element for the tabs
 */
function initTabs(tabContainer) {
  if (!tabContainer) return;
  
  const tabButtons = tabContainer.querySelectorAll('.tab-btn');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Remove active class from all buttons and panes
      tabButtons.forEach(btn => btn.classList.remove('active'));
      
      const tabPanes = document.querySelectorAll('.tab-pane');
      tabPanes.forEach(pane => pane.classList.remove('active'));
      
      // Add active class to clicked button
      button.classList.add('active');
      
      // Show corresponding tab pane
      const targetTab = button.dataset.tab;
      const targetPane = document.getElementById(`${targetTab}-tab`);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });
}

/**
 * Utility function to format date to YYYY-MM-DD
 * @param {Date} date - The date to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Utility function to format currency
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (default: USD)
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Utility function to validate email
 * @param {string} email - The email to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidEmail(email) {
  const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(String(email).toLowerCase());
}

/**
 * Utility function to validate phone number
 * @param {string} phone - The phone number to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidPhone(phone) {
  // This is a basic validation, adjust as needed
  return /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/im.test(phone);
}

/**
 * Function to debounce frequent events like search input
 * @param {Function} func - The function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, wait = 300) {
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

// Export utilities for use in other modules
window.appUtils = {
  showToast,
  formatDate,
  formatCurrency,
  isValidEmail,
  isValidPhone,
  debounce,
  initTabs
};
