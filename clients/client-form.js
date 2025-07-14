/**
 * Client Form Handler
 * Manages the client form functionality
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize client form components
  initClientForm();
  initContactModal();
  initClientTypeToggle();
  initCopyBillingAddress();
  initTabSystem();
  initTaxRateHandler();
  initFormValidation();
});

/**
 * Initialize the client form and its event listeners
 */
async function initClientForm() {
  const clientForm = document.getElementById('client-form');
  const cancelBtn = document.getElementById('cancel-btn');
  const addNewClientBtn = document.getElementById('add-new-client-btn');
  const formTitle = document.getElementById('form-title');
  
  if (!clientForm) return;
  
  // Current client ID being edited (if any)
  let currentClientId = null;
  
  // Handle form submission
  clientForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    if (!validateForm(clientForm)) {
      window.appUtils.showToast('Please fill in all required fields correctly', 'error');
      return;
    }
    
    try {
      if (!window.supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Only include fields that exist in your database schema
      const formData = {
        customer_name: document.getElementById('company-name')?.value || '',
        customer_tax_id: document.getElementById('customer-tax-id')?.value || '',
        contact: document.getElementById('contact')?.value || '',
        billing_address: document.getElementById('billing-address')?.value || '',
        street_name: document.getElementById('street-name')?.value || '',
        address_detail: document.getElementById('address-detail')?.value || '',
        city: document.getElementById('city')?.value || '',
        postal_code: document.getElementById('postal-code')?.value || null,  // Convert to number or null
        province: document.getElementById('province')?.value || '',
        country: document.getElementById('country')?.value || '',
        ship_to_address: document.getElementById('ship-to-address')?.value || '',
        building_number: document.getElementById('building-number')?.value || '',
        telephone: document.getElementById('telephone')?.value || null,  // Convert to number or null
        fax: document.getElementById('fax')?.value || '',
        email: document.getElementById('email')?.value || '',
        website: document.getElementById('website')?.value || '',
        status: 'active', // Default status for new clients
        client_type: document.querySelector('input[name="client-type"]:checked')?.value || 'business', // Default to business
        user_id: (await window.supabase.auth.getUser()).data.user?.id // Add the current user's ID using the current method
      };

      // Convert string values to numbers where needed
      if (formData.postal_code) {
        formData.postal_code = parseInt(formData.postal_code) || null;
      }
      if (formData.telephone) {
        formData.telephone = parseInt(formData.telephone.replace(/\D/g, '')) || null;
      }

      const { data, error } = currentClientId 
        ? await window.supabase
            .from('clients')
            .update(formData)
            .eq('customer_id', currentClientId)
            .select()
        : await window.supabase
            .from('clients')
            .insert([formData])
            .select();

      if (error) throw error;

      window.appUtils.showToast(
        currentClientId ? 'Client updated successfully' : 'Client added successfully',
        'success'
      );

      resetForm(clientForm);
      currentClientId = null;
      if (formTitle) formTitle.textContent = 'New Client';
      
      if (typeof window.refreshClientList === 'function') {
        window.refreshClientList();
      }

    } catch (error) {
      console.error('Error saving client:', error);
      window.appUtils.showToast('Error saving client: ' + error.message, 'error');
    }
  });
  
  // Handle cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      resetForm(clientForm);
      currentClientId = null;
      if (formTitle) formTitle.textContent = 'New Client';
    });
  }
  
  // Handle add new client button
  if (addNewClientBtn) {
    addNewClientBtn.addEventListener('click', () => {
      resetForm(clientForm);
      currentClientId = null;
      formTitle.textContent = 'New Client';
      
      // Scroll to form on mobile
      const formContainer = document.getElementById('client-form-container');
      if (formContainer && window.innerWidth < 1200) {
        formContainer.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }
  
  // Setup edit client functionality
  window.editClient = async (clientId) => {
    try {
      const client = await getClientById(clientId);
      if (!client) {
        window.appUtils.showToast('Client not found', 'error');
        return;
      }
      
      currentClientId = clientId;
      populateForm(clientForm, client);
      formTitle.textContent = 'Edit Client';
      
      // Scroll to form on mobile
      const formContainer = document.getElementById('client-form-container');
      if (formContainer && window.innerWidth < 1200) {
        formContainer.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error editing client:', error);
      window.appUtils.showToast('Error loading client data', 'error');
    }
  };
  
  // Initialize the dynamic display name dropdown
  initDisplayNameDropdown();
}

/**
 * Initialize the display name dropdown with dynamic options
 */
function initDisplayNameDropdown() {
  const firstNameInput = document.getElementById('first-name');
  const lastNameInput = document.getElementById('last-name');
  const companyNameInput = document.getElementById('company-name');
  const displayNameSelect = document.getElementById('display-name');
  
  if (!firstNameInput || !lastNameInput || !companyNameInput || !displayNameSelect) return;
  
  const updateDisplayNameOptions = () => {
    // Clear previous options except the first one
    while (displayNameSelect.options.length > 1) {
      displayNameSelect.remove(1);
    }
    
    const firstName = firstNameInput.value.trim();
    const lastName = lastNameInput.value.trim();
    const companyName = companyNameInput.value.trim();
    
    // Add options based on available values
    if (firstName && lastName) {
      addOption(displayNameSelect, `${firstName} ${lastName}`);
      addOption(displayNameSelect, `${lastName}, ${firstName}`);
    }
    
    if (companyName) {
      addOption(displayNameSelect, companyName);
      
      if (firstName && lastName) {
        addOption(displayNameSelect, `${companyName} (${firstName} ${lastName})`);
      }
    }
  };
  
  // Update options when input values change
  firstNameInput.addEventListener('input', updateDisplayNameOptions);
  lastNameInput.addEventListener('input', updateDisplayNameOptions);
  companyNameInput.addEventListener('input', updateDisplayNameOptions);
}

/**
 * Initialize the client type toggle functionality
 */
function initClientTypeToggle() {
  const clientTypeInputs = document.querySelectorAll('input[name="client-type"]');
  const companyNameField = document.getElementById('company-name')?.closest('.form-group');
  
  if (!clientTypeInputs.length || !companyNameField) return;
  
  // Function to toggle company name field visibility
  const toggleCompanyField = () => {
    const selectedType = document.querySelector('input[name="client-type"]:checked')?.value || 'business';
    if (selectedType === 'business') {
      companyNameField.style.display = 'block';
      companyNameField.querySelector('input').setAttribute('required', 'required');
    } else {
      companyNameField.style.display = 'none';
      companyNameField.querySelector('input').removeAttribute('required');
    }
  };
  
  // Set initial state
  toggleCompanyField();
  
  // Add event listeners to all radio buttons
  clientTypeInputs.forEach(input => {
    input.addEventListener('change', toggleCompanyField);
  });
}

/**
 * Initialize the copy billing address functionality
 */
function initCopyBillingAddress() {
  const copyBillingBtn = document.getElementById('copy-billing');
  
  if (!copyBillingBtn) return;
  
  copyBillingBtn.addEventListener('click', () => {
    // Get billing address fields
    const billingFields = {
      attention: document.getElementById('billing-attention'),
      country: document.getElementById('billing-country'),
      street1: document.getElementById('billing-street1'),
      street2: document.getElementById('billing-street2'),
      city: document.getElementById('billing-city'),
      state: document.getElementById('billing-state'),
      zip: document.getElementById('billing-zip'),
      phone: document.getElementById('billing-phone')
    };
    
    // Get shipping address fields
    const shippingFields = {
      attention: document.getElementById('shipping-attention'),
      country: document.getElementById('shipping-country'),
      street1: document.getElementById('shipping-street1'),
      street2: document.getElementById('shipping-street2'),
      city: document.getElementById('shipping-city'),
      state: document.getElementById('shipping-state'),
      zip: document.getElementById('shipping-zip'),
      phone: document.getElementById('shipping-phone')
    };
    
    // Copy values from billing to shipping
    for (const fieldKey in billingFields) {
      if (billingFields[fieldKey] && shippingFields[fieldKey]) {
        // Handle select elements
        if (billingFields[fieldKey].tagName === 'SELECT') {
          shippingFields[fieldKey].value = billingFields[fieldKey].value;
        } else {
          shippingFields[fieldKey].value = billingFields[fieldKey].value;
        }
      }
    }
    
    window.appUtils.showToast('Billing address copied to shipping address', 'success');
  });
}

/**
 * Initialize the tab system
 */
function initTabSystem() {
  const tabContainer = document.querySelector('.tab-container');
  if (tabContainer) {
    window.appUtils.initTabs(tabContainer);
  }
}

/**
 * Initialize the tax rate handler
 */
function initTaxRateHandler() {
  const taxRateSelect = document.getElementById('tax-rate');
  const otherVatContainer = document.getElementById('other-vat-container');
  
  if (!taxRateSelect || !otherVatContainer) return;
  
  taxRateSelect.addEventListener('change', () => {
    if (taxRateSelect.value === 'other') {
      otherVatContainer.style.display = 'block';
      document.getElementById('custom-vat').setAttribute('required', 'required');
    } else {
      otherVatContainer.style.display = 'none';
      document.getElementById('custom-vat').removeAttribute('required');
    }
  });
}

/**
 * Initialize the contact person modal
 */
function initContactModal() {
  const addContactBtn = document.getElementById('add-contact-btn');
  const contactModal = document.getElementById('contact-modal');
  const saveContactBtn = document.getElementById('save-contact-btn');
  const cancelContactBtn = document.getElementById('cancel-contact-btn');
  const closeModalBtns = document.querySelectorAll('.close-modal');
  const contactForm = document.getElementById('contact-form');
  const contactsList = document.getElementById('contacts-list');
  
  if (!addContactBtn || !contactModal || !saveContactBtn || !cancelContactBtn || !contactForm || !contactsList) return;
  
  // Store contacts
  const contacts = [];
  
  // Show modal when clicking add contact
  addContactBtn.addEventListener('click', () => {
    contactForm.reset();
    contactModal.classList.add('active');
  });
  
  // Hide modal functions
  const hideModal = () => {
    contactModal.classList.remove('active');
  };
  
  // Close modal with buttons
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', hideModal);
  });
  
  cancelContactBtn.addEventListener('click', hideModal);
  
  // Save contact
  saveContactBtn.addEventListener('click', () => {
    if (!validateForm(contactForm)) {
      window.appUtils.showToast('Please fill in all required fields correctly', 'error');
      return;
    }
    
    // Get form data
    const formData = {
      id: Date.now(), // Simple unique ID
      salutation: document.getElementById('contact-salutation').value,
      firstName: document.getElementById('contact-first-name').value,
      lastName: document.getElementById('contact-last-name').value,
      email: document.getElementById('contact-email').value,
      workPhone: document.getElementById('contact-work-phone').value,
      mobile: document.getElementById('contact-mobile').value,
      designation: document.getElementById('contact-designation').value,
      isPrimary: document.getElementById('is-primary-contact').checked
    };
    
    // Add to contacts array
    contacts.push(formData);
    
    // Update contacts list UI
    renderContacts();
    
    // Close modal
    hideModal();
    
    // Show success message
    window.appUtils.showToast('Contact added successfully', 'success');
  });
  
  // Render contacts list
  function renderContacts() {
    // Clear list
    contactsList.innerHTML = '';
    
    // Show message if no contacts
    if (contacts.length === 0) {
      contactsList.innerHTML = '<p class="no-contacts-msg">No additional contacts added yet</p>';
      return;
    }
    
    // Create contact items
    contacts.forEach(contact => {
      const contactItem = document.createElement('div');
      contactItem.className = 'contact-item';
      contactItem.innerHTML = `
        <div class="contact-info">
          <h4>${contact.salutation} ${contact.firstName} ${contact.lastName} ${contact.isPrimary ? '<span class="primary-badge">Primary</span>' : ''}</h4>
          <p>${contact.designation || ''}</p>
          <p>${contact.email}</p>
          <p>${contact.workPhone || contact.mobile || ''}</p>
        </div>
        <div class="contact-actions">
          <button type="button" class="delete-contact-btn" data-id="${contact.id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      `;
      contactsList.appendChild(contactItem);
    });
    
    // Add delete event listeners
    document.querySelectorAll('.delete-contact-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const contactId = parseInt(e.currentTarget.getAttribute('data-id'));
        deleteContact(contactId);
      });
    });
  }
  
  // Delete contact
  function deleteContact(contactId) {
    const index = contacts.findIndex(contact => contact.id === contactId);
    if (index !== -1) {
      contacts.splice(index, 1);
      renderContacts();
      window.appUtils.showToast('Contact deleted', 'success');
    }
  }
}

/**
 * Validate NUIT based on client type
 * @param {string} value - The NUIT value to validate
 * @param {string} clientType - The type of client ('individual' or 'business')
 * @returns {Object} - Validation result with isValid and message
 */
function validateNUIT(value, clientType) {
  // Remove any non-digit characters
  const cleanNUIT = value.replace(/\D/g, '');
  
  // Check length first
  if (cleanNUIT.length !== 9) {
    return {
      isValid: false,
      message: 'NUIT must be exactly 9 digits'
    };
  }

  // Check first digit based on client type
  const firstDigit = cleanNUIT.charAt(0);
  switch (clientType) {
    case 'individual':
      if (firstDigit !== '1') {
        return {
          isValid: false,
          message: 'Individual NUIT must start with 1'
        };
      }
      break;
    case 'business':
      if (firstDigit !== '4') {
        return {
          isValid: false,
          message: 'Company NUIT must start with 4'
        };
      }
      break;
  }

  return {
    isValid: true,
    message: ''
  };
}

/**
 * Initialize form validation
 */
function initFormValidation() {
  const taxIdInput = document.getElementById('customer-tax-id');
  const clientTypeInputs = document.querySelectorAll('input[name="client-type"]');
  
  if (!taxIdInput) return;

  // Create error message element
  const errorMessage = document.createElement('div');
  errorMessage.className = 'error-message';
  taxIdInput.parentNode.appendChild(errorMessage);

  // Function to update validation state
  function updateValidation() {
    const clientType = document.querySelector('input[name="client-type"]:checked')?.value || 'business';
    const validation = validateNUIT(taxIdInput.value, clientType);
    
    if (validation.message) {
      errorMessage.textContent = validation.message;
      taxIdInput.classList.add('invalid');
      taxIdInput.classList.remove('valid');
    } else {
      errorMessage.textContent = '';
      taxIdInput.classList.add('valid');
      taxIdInput.classList.remove('invalid');
    }
  }

  // Add event listeners
  taxIdInput.addEventListener('input', updateValidation);
  clientTypeInputs.forEach(input => {
    input.addEventListener('change', updateValidation);
  });

  // Add CSS for validation states
  const style = document.createElement('style');
  style.textContent = `
    .invalid {
      border-color: #dc3545 !important;
    }
    .valid {
      border-color: #28a745 !important;
    }
    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Validate an individual input field
 * @param {HTMLElement} input - Input element to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateInput(input) {
  if (input.hasAttribute('required') && !input.value.trim()) {
    input.classList.add('error');
    return false;
  }
  
  // Email validation
  if (input.type === 'email' && input.value && !window.appUtils.isValidEmail(input.value)) {
    input.classList.add('error');
    return false;
  }
  
  // Phone validation
  if (input.type === 'tel' && input.value && !window.appUtils.isValidPhone(input.value)) {
    input.classList.add('error');
    return false;
  }
  
  input.classList.remove('error');
  return true;
}

/**
 * Validate the entire form
 * @param {HTMLFormElement} form - Form to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function validateForm(form) {
  const taxIdInput = document.getElementById('customer-tax-id');
  const clientType = document.querySelector('input[name="client-type"]:checked')?.value || 'business';
  
  if (taxIdInput && taxIdInput.value) {
    const validation = validateNUIT(taxIdInput.value, clientType);
    if (!validation.isValid) {
      window.appUtils.showToast(validation.message, 'error');
      return false;
    }
  }

  let isValid = true;
  
  // Validate required fields
  const requiredInputs = form.querySelectorAll('[required]');
  requiredInputs.forEach(input => {
    if (!validateInput(input)) {
      isValid = false;
    }
  });
  
  return isValid;
}

/**
 * Helper function to add an option to a select element
 * @param {HTMLSelectElement} selectElement - The select element
 * @param {string} value - Option value and text
 */
function addOption(selectElement, value) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = value;
  selectElement.appendChild(option);
}

/**
 * Get form data as an object
 * @param {HTMLFormElement} form - Form to get data from
 * @returns {Object} - Form data as an object
 */
function getFormData(form) {
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  
  // Add client type (radio button)
  data.clientType = form.querySelector('input[name="client-type"]:checked').value;
  
  // Add tax info
  if (data['tax-rate'] === 'other') {
    data.customVatRate = data['custom-vat'];
  }
  
  // Add billing address
  data.billingAddress = {
    attention: data['billing-attention'] || '',
    country: data['billing-country'] || '',
    street1: data['billing-street1'] || '',
    street2: data['billing-street2'] || '',
    city: data['billing-city'] || '',
    state: data['billing-state'] || '',
    zip: data['billing-zip'] || '',
    phone: data['billing-phone'] || ''
  };
  
  // Add shipping address
  data.shippingAddress = {
    attention: data['shipping-attention'] || '',
    country: data['shipping-country'] || '',
    street1: data['shipping-street1'] || '',
    street2: data['shipping-street2'] || '',
    city: data['shipping-city'] || '',
    state: data['shipping-state'] || '',
    zip: data['shipping-zip'] || '',
    phone: data['shipping-phone'] || ''
  };
  
  // Add portal access
  data.enablePortal = form.querySelector('#enable-portal').checked;
  
  return data;
}

/**
 * Populate form with client data
 * @param {HTMLFormElement} form - Form to populate
 * @param {Object} client - Client data
 */
function populateForm(form, client) {
  try {
    // Set client type radio button
    const clientTypeRadio = form.querySelector(`input[name="client-type"][value="${client.client_type}"]`);
    if (clientTypeRadio) {
      clientTypeRadio.checked = true;
      // Trigger change event to update field visibility
      const event = new Event('change');
      clientTypeRadio.dispatchEvent(event);
    }

    // Set other form fields
    const fields = {
      'company-name': client.customer_name,
      'customer-tax-id': client.customer_tax_id,
      'contact': client.contact,
      'billing-address': client.billing_address,
      'street-name': client.street_name,
      'address-detail': client.address_detail,
      'city': client.city,
      'postal-code': client.postal_code,
      'province': client.province,
      'country': client.country,
      'ship-to-address': client.ship_to_address,
      'building-number': client.building_number,
      'telephone': client.telephone,
      'fax': client.fax,
      'email': client.email,
      'website': client.website
    };

    // Populate each field
    Object.entries(fields).forEach(([id, value]) => {
      const field = form.querySelector(`#${id}`);
      if (field) {
        field.value = value || '';
      }
    });
    
    // Handle company name field required state
    const companyNameField = form.querySelector('#company-name')?.closest('.form-group');
    const companyNameInput = companyNameField?.querySelector('input');
    
    if (companyNameField && companyNameInput) {
      if (client.client_type === 'individual') {
        companyNameInput.removeAttribute('required');
      } else {
        companyNameInput.setAttribute('required', 'required');
      }
    }
    
    // Trigger validation for NUIT
    const taxIdInput = form.querySelector('#customer-tax-id');
    if (taxIdInput) {
      const event = new Event('input');
      taxIdInput.dispatchEvent(event);
    }
  } catch (error) {
    console.error('Error populating form:', error);
    window.appUtils.showToast('Error loading client data', 'error');
  }
}

/**
 * Reset form to initial state
 * @param {HTMLFormElement} form - Form to reset
 */
function resetForm(form) {
  if (!form) return;
  
  try {
    // Basic form reset
    form.reset();
    
    // Reset client type to business
    const businessTypeRadio = form.querySelector('input[name="client-type"][value="business"]');
    if (businessTypeRadio) {
      businessTypeRadio.checked = true;
    }
    
    // Show company name field
    const companyNameField = form.querySelector('#company-name')?.closest('.form-group');
    if (companyNameField) {
      companyNameField.style.display = 'block';
      companyNameField.querySelector('input').setAttribute('required', 'required');
    }
    
    // Clear validation states
    form.querySelectorAll('.error, .invalid, .valid').forEach(el => {
      el.classList.remove('error', 'invalid', 'valid');
    });
    
    // Clear error messages
    form.querySelectorAll('.error-message').forEach(el => {
      el.textContent = '';
    });
    
    // Reset form title
    const formTitle = document.getElementById('form-title');
    if (formTitle) {
      formTitle.textContent = 'New Client';
    }
    
    // Reset current client ID
    currentClientId = null;
    
    // Trigger client type toggle to ensure proper field visibility
    const event = new Event('change');
    const businessTypeInput = form.querySelector('input[name="client-type"][value="business"]');
    if (businessTypeInput) {
      businessTypeInput.dispatchEvent(event);
    }
  } catch (error) {
    console.error('Error resetting form:', error);
    window.appUtils.showToast('Error resetting form', 'error');
  }
}

// Mock functions for client data management
// In a real application, these would interact with a backend API

/**
 * Add a new client
 * @param {Object} clientData - Client data to add
 */
function addClient(clientData) {
  // Get existing clients from localStorage
  const clients = JSON.parse(localStorage.getItem('clients') || '[]');
  
  // Add new client with ID
  const newClient = {
    id: Date.now(),
    ...clientData,
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  
  clients.push(newClient);
  
  // Save back to localStorage
  localStorage.setItem('clients', JSON.stringify(clients));
  
  return newClient;
}

/**
 * Update an existing client
 * @param {number} clientId - ID of client to update
 * @param {Object} clientData - Updated client data
 */
function updateClient(clientId, clientData) {
  // Get existing clients from localStorage
  const clients = JSON.parse(localStorage.getItem('clients') || '[]');
  
  // Find client index
  const index = clients.findIndex(client => client.id === clientId);
  
  if (index !== -1) {
    // Update client
    clients[index] = {
      ...clients[index],
      ...clientData,
      updatedAt: new Date().toISOString()
    };
    
    // Save back to localStorage
    localStorage.setItem('clients', JSON.stringify(clients));
    
    return clients[index];
  }
  
  return null;
}

/**
 * Get client by ID
 * @param {number} clientId - ID of client to retrieve
 * @returns {Object|null} - Client data or null if not found
 */
function getClientById(clientId) {
  // Get existing clients from localStorage
  const clients = JSON.parse(localStorage.getItem('clients') || '[]');
  
  // Find client by ID
  return clients.find(client => client.id === clientId) || null;
}
