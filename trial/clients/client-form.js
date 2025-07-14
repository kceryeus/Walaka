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
        company_name: document.getElementById('company-name')?.value || '',
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
        client_type: document.querySelector('input[name="client-type"]:checked')?.value || 'business' // Default to business
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
  window.editClient = (clientId) => {
    const client = getClientById(clientId);
    if (!client) return;
    
    currentClientId = clientId;
    populateForm(clientForm, client);
    formTitle.textContent = 'Edit Client';
    
    // Scroll to form on mobile
    const formContainer = document.getElementById('client-form-container');
    if (formContainer && window.innerWidth < 1200) {
      formContainer.scrollIntoView({ behavior: 'smooth' });
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
  const businessType = document.getElementById('business-type');
  const individualType = document.getElementById('individual-type');
  const companyNameField = document.getElementById('company-name').closest('.form-group');
  
  if (!businessType || !individualType || !companyNameField) return;
  
  // Function to toggle company name field visibility
  const toggleCompanyField = () => {
    if (businessType.checked) {
      companyNameField.style.display = 'block';
      companyNameField.querySelector('input').setAttribute('required', 'required');
    } else {
      companyNameField.style.display = 'none';
      companyNameField.querySelector('input').removeAttribute('required');
    }
  };
  
  // Set initial state
  toggleCompanyField();
  
  // Add event listeners
  businessType.addEventListener('change', toggleCompanyField);
  individualType.addEventListener('change', toggleCompanyField);
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
 * Initialize form validation
 */
function initFormValidation() {
  const form = document.getElementById('client-form');
  
  if (!form) return;
  
  // Add input event listeners to required fields
  const requiredInputs = form.querySelectorAll('[required]');
  requiredInputs.forEach(input => {
    input.addEventListener('input', () => {
      validateInput(input);
    });
    
    input.addEventListener('blur', () => {
      validateInput(input);
    });
  });
  
  // Email validation
  const emailInput = document.getElementById('email');
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      if (emailInput.value && !window.appUtils.isValidEmail(emailInput.value)) {
        emailInput.setCustomValidity('Please enter a valid email address');
        emailInput.classList.add('error');
      } else {
        emailInput.setCustomValidity('');
        emailInput.classList.remove('error');
      }
    });
  }
  
  // Phone validation
  const phoneInputs = form.querySelectorAll('input[type="tel"]');
  phoneInputs.forEach(input => {
    input.addEventListener('input', () => {
      if (input.value && !window.appUtils.isValidPhone(input.value)) {
        input.setCustomValidity('Please enter a valid phone number');
        input.classList.add('error');
      } else {
        input.setCustomValidity('');
        input.classList.remove('error');
      }
    });
  });
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
  // Set form fields
  form.querySelector(`input[name="client-type"][value="${client.clientType}"]`).checked = true;
  form.querySelector('#salutation').value = client.salutation || '';
  form.querySelector('#first-name').value = client.firstName || '';
  form.querySelector('#last-name').value = client.lastName || '';
  form.querySelector('#company-name').value = client.companyName || '';
  form.querySelector('#display-name').value = client.displayName || '';
  form.querySelector('#currency').value = client.currency || 'USD';
  form.querySelector('#email').value = client.email || '';
  form.querySelector('#work-phone').value = client.workPhone || '';
  form.querySelector('#mobile').value = client.mobile || '';
  
  // Handle company name field visibility
  const companyNameField = form.querySelector('#company-name').closest('.form-group');
  companyNameField.style.display = client.clientType === 'business' ? 'block' : 'none';
  
  // Set tax information
  form.querySelector('#tax-rate').value = client.taxRate || '';
  
  if (client.taxRate === 'other' && client.customVatRate) {
    form.querySelector('#other-vat-container').style.display = 'block';
    form.querySelector('#custom-vat').value = client.customVatRate;
  } else {
    form.querySelector('#other-vat-container').style.display = 'none';
  }
  
  // Set payment terms and price list
  form.querySelector('#payment-terms').value = client.paymentTerms || 'due-receipt';
  form.querySelector('#price-list').value = client.priceList || '';
  
  // Set portal settings
  form.querySelector('#enable-portal').checked = client.enablePortal || false;
  form.querySelector('#portal-language').value = client.portalLanguage || 'en';
  
  // Set custom fields
  if (client.reference) form.querySelector('#reference').value = client.reference;
  if (client.industry) form.querySelector('#industry').value = client.industry;
  if (client.notes) form.querySelector('#notes').value = client.notes;
  
  // Set billing address
  if (client.billingAddress) {
    form.querySelector('#billing-attention').value = client.billingAddress.attention || '';
    form.querySelector('#billing-country').value = client.billingAddress.country || '';
    form.querySelector('#billing-street1').value = client.billingAddress.street1 || '';
    form.querySelector('#billing-street2').value = client.billingAddress.street2 || '';
    form.querySelector('#billing-city').value = client.billingAddress.city || '';
    form.querySelector('#billing-state').value = client.billingAddress.state || '';
    form.querySelector('#billing-zip').value = client.billingAddress.zip || '';
    form.querySelector('#billing-phone').value = client.billingAddress.phone || '';
  }
  
  // Set shipping address
  if (client.shippingAddress) {
    form.querySelector('#shipping-attention').value = client.shippingAddress.attention || '';
    form.querySelector('#shipping-country').value = client.shippingAddress.country || '';
    form.querySelector('#shipping-street1').value = client.shippingAddress.street1 || '';
    form.querySelector('#shipping-street2').value = client.shippingAddress.street2 || '';
    form.querySelector('#shipping-city').value = client.shippingAddress.city || '';
    form.querySelector('#shipping-state').value = client.shippingAddress.state || '';
    form.querySelector('#shipping-zip').value = client.shippingAddress.zip || '';
    form.querySelector('#shipping-phone').value = client.shippingAddress.phone || '';
  }
  
  // Trigger display name options update
  const event = new Event('input');
  form.querySelector('#first-name').dispatchEvent(event);
}

/**
 * Reset form to initial state
 * @param {HTMLFormElement} form - Form to reset
 */
function resetForm(form) {
  if (!form) return;
  
  // Basic form reset
  form.reset();
  
  // Clear validation states
  form.querySelectorAll('.error').forEach(el => {
    el.classList.remove('error');
  });
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
