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
  initNewClientForm();

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
      if (sidebar) sidebar.classList.toggle('active');
    });
  }

  // Close sidebar when clicking outside on mobile
  document.addEventListener('click', (event) => {
    if (!sidebar) return;
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

/**
 * Initialize New Client functionality
 */
function initNewClientForm() {
  const addNewClientBtn = document.getElementById('add-new-client-btn');
  const clientForm = document.getElementById('client-form');
  const formTitle = document.getElementById('form-title');
  
  if (!addNewClientBtn || !clientForm) return;

  addNewClientBtn.addEventListener('click', () => {
    // Reset form and set title
    resetClientForm();
    formTitle.textContent = 'New Client';
    
    // Show form container on mobile
    const formContainer = document.getElementById('client-form-container');
    if (formContainer && window.innerWidth < 1200) {
      formContainer.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Handle form submission
  clientForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    if (!validateClientForm(clientForm)) {
      window.appUtils.showToast('Please fill in all required fields correctly', 'error');
      return;
    }

    try {
      const formData = getClientFormData();
      const response = await saveClientData(formData);
      
      if (response.success) {
        window.appUtils.showToast('Client saved successfully', 'success');
        resetClientForm();
        if (typeof refreshClientList === 'function') {
          refreshClientList();
        }
      } else {
        throw new Error(response.message || 'Failed to save client');
      }
    } catch (error) {
      console.error('Error saving client:', error);
      window.appUtils.showToast(error.message, 'error');
    }
  });
}

/**
 * Get all form data as a structured object
 * @returns {Object} Formatted client data
 */
function getClientFormData() {
  // Simplified structure that matches database schema
  return {
    company_name: document.getElementById('company-name')?.value || '',
    customer_tax_id: document.getElementById('customer-tax-id')?.value || '',
    contact: document.getElementById('contact')?.value || '',
    billing_address: document.getElementById('billing-address')?.value || '',
    street_name: document.getElementById('street-name')?.value || '',
    address_detail: document.getElementById('address-detail')?.value || '',
    city: document.getElementById('city')?.value || '',
    postal_code: document.getElementById('postal-code')?.value || '',
    province: document.getElementById('province')?.value || '',
    country: document.getElementById('country')?.value || '',
    ship_to_address: document.getElementById('ship-to-address')?.value || '',
    building_number: document.getElementById('building-number')?.value || '',
    telephone: document.getElementById('telephone')?.value || '',
    fax: document.getElementById('fax')?.value || '',
    email: document.getElementById('email')?.value || '',
    website: document.getElementById('website')?.value || ''
  };
}

/**
 * Save client data to the backend
 * @param {Object} clientData - The client data to save
 * @returns {Promise} Response from the save operation
 */
async function saveClientData(clientData) {
  try {
    const { data, error } = await window.supabase
      .from('clients')
      .insert([clientData])
      .select();

    if (error) throw error;
    
    return {
      success: true,
      data: data[0]
    };
  } catch (error) {
    console.error('Error saving client:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

/**
 * Validate the client form
 * @param {HTMLFormElement} form - The form to validate
 * @returns {boolean} True if valid, false otherwise
 */
function validateClientForm(form) {
  let isValid = true;
  
  // Required fields validation
  const requiredFields = [
    'company-name',
    'customer-tax-id',
    'email'
  ];

  requiredFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (!field || !field.value.trim()) {
      isValid = false;
      field?.classList.add('error');
    } else {
      field?.classList.remove('error');
    }
  });

  // Email validation
  const emailField = document.getElementById('email');
  if (emailField && emailField.value && !isValidEmail(emailField.value)) {
    isValid = false;
    emailField.classList.add('error');
  }

  // Phone validation if provided
  const phoneField = document.getElementById('telephone');
  if (phoneField && phoneField.value && !isValidPhone(phoneField.value)) {
    isValid = false;
    phoneField.classList.add('error');
  }

  return isValid;
}

/**
 * Reset the client form to its initial state
 */
function resetClientForm() {
  const form = document.getElementById('client-form');
  if (!form) return;

  // Reset form fields
  form.reset();

  // Reset client type
  document.getElementById('individual-type').checked = true;
  const companyNameField = document.getElementById('company-name')?.closest('.form-group');
  if (companyNameField) companyNameField.style.display = 'none';

  // Reset tax rate
  const otherVatContainer = document.getElementById('other-vat-container');
  if (otherVatContainer) otherVatContainer.style.display = 'none';

  // Reset tabs
  const firstTab = document.querySelector('.tab-btn');
  if (firstTab) firstTab.click();

  // Remove validation errors
  form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

  // Clear display name options
  const displayNameSelect = document.getElementById('display-name');
  if (displayNameSelect) {
    displayNameSelect.innerHTML = '<option value="">Select or type...</option>';
  }
}

       //Display user name function
        // This function will fetch the username from the Supabase database and display it
        // in the user-displayname span element
        document.addEventListener('DOMContentLoaded', async () => {
            if (typeof supabase === 'undefined') return;

            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !session.user) return;

            let displayName = session.user.email;
            try {
                const { data: userRecord, error } = await supabase
                    .from('users')
                    .select('username')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (userRecord && userRecord.username) {
                    displayName = userRecord.username;
                }
            } catch (e) {
                // fallback to email
            }

            const userSpan = document.getElementById('user-displayname');
            if (userSpan) userSpan.textContent = displayName;
               });


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
