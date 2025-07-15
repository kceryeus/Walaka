/*
import langManager from './utils/language.js';
import { settingsManager } from '../../services/settingsManager.js';
import { languageManager } from '../../services/languageManager.js';

document.addEventListener('DOMContentLoaded', async () => {
  await langManager.init();
  await settingsManager.init();

  // Initialize variables
  let userSettings = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+258 123 456 789',
    language: 'pt-MZ'
  };

  let businessSettings = {
    name: 'ACME Corporation',
    taxId: '123456789',
    address: 'Av. da Liberdade 100\n1250-146 Lisboa\nPortugal',
    website: 'https://acmecorp.com',
    email: 'contact@acmecorp.com'
  };

  let appearanceSettings = settingsManager.getAppearanceSettings();

  let invoiceSettings = {
    prefix: 'FAT-',
    nextNumber: 1001,
    template: 'template1',
    color: '#007ec7',
    currency: 'MZN',
    taxRate: 17,
    paymentTerms: 'net-30',
    notes: 'Obrigado pela preferência. O pagamento deve ser efetuado no prazo de 30 dias.'
  };

  let notificationSettings = {
    emailNotifications: {
      invoiceCreated: true,
      paymentReceived: true,
      invoiceDue: true,
      invoiceOverdue: true
    },
    systemNotifications: {
      productLowStock: true,
      systemUpdates: true,
      clientActivity: false,
      loginAttempts: true
    }
  };

  let securitySettings = {
    twoFactorEnabled: false,
    sessionTimeout: 30,
    requireLoginConfirmation: false
  };

  // DOM Elements
  const tabLinks = document.querySelectorAll('.settings-tabs a');
  const settingsSections = document.querySelectorAll('.settings-section');
  const toastContainer = document.getElementById('toast-container');
  const loadingOverlay = document.getElementById('loading-overlay');
  const confirmationModal = document.getElementById('confirmation-modal');
  const modalTitle = document.getElementById('modal-title');
  const modalMessage = document.getElementById('modal-message');
  const modalConfirm = document.getElementById('modal-confirm');
  const modalCancel = document.getElementById('modal-cancel');
  const closeModal = document.getElementById('close-modal');

  // User Profile Elements
  const userNameDisplay = document.getElementById('user-name');
  const userNameInput = document.getElementById('user-name-input');
  const userEmailInput = document.getElementById('user-email-input');
  const userPhoneInput = document.getElementById('user-phone');
  const userLanguageSelect = document.getElementById('user-language');
  const editUserSettingsBtn = document.getElementById('edit-user-settings');
  const saveUserSettingsBtn = document.getElementById('save-user-settings');
  const cancelUserSettingsBtn = document.getElementById('cancel-user-settings');

  // Business Profile Elements
  const businessNameInput = document.getElementById('business-name');
  const taxIdInput = document.getElementById('tax-id');
  const businessAddressInput = document.getElementById('business-address');
  const businessWebsiteInput = document.getElementById('business-website');
  const businessEmailInput = document.getElementById('business-email');
  const saveBusinessSettingsBtn = document.getElementById('save-business-settings');
  const resetBusinessSettingsBtn = document.getElementById('reset-business-settings');

  // Appearance Elements
  const companyLogoInput = document.getElementById('company-logo');
  const logoPreviewImg = document.getElementById('logo-preview-img');
  const logoPlaceholder = document.querySelector('.logo-placeholder');
  const removeLogoBtn = document.getElementById('remove-logo');
  const themeSelectionInput = document.getElementById('theme-selection');
  const accentColorInput = document.getElementById('accent-color');
  const colorValue = document.getElementById('color-value');
  const fontSizeInput = document.getElementById('font-size');
  const sidebarPositionInput = document.getElementById('sidebar-position');
  const saveAppearanceSettingsBtn = document.getElementById('save-appearance-settings');
  const resetAppearanceSettingsBtn = document.getElementById('reset-appearance-settings');

  // Invoice Elements
  const invoicePrefixInput = document.getElementById('invoice-prefix');
  const invoiceNextNumberInput = document.getElementById('invoice-next-number');
  const invoiceTemplateInput = document.getElementById('invoice-template');
  const invoiceColorInput = document.getElementById('invoice-color');
  const invoiceColorValue = document.getElementById('invoice-color-value');
  const defaultCurrencyInput = document.getElementById('default-currency');
  const defaultTaxRateInput = document.getElementById('default-tax-rate');
  const paymentTermsInput = document.getElementById('payment-terms');
  const invoiceNotesInput = document.getElementById('invoice-notes');
  const saveInvoiceSettingsBtn = document.getElementById('save-invoice-settings');
  const resetInvoiceSettingsBtn = document.getElementById('reset-invoice-settings');

  // Notification Elements
  const notifyInvoiceCreated = document.getElementById('notify-invoice-created');
  const notifyPaymentReceived = document.getElementById('notify-payment-received');
  const notifyInvoiceDue = document.getElementById('notify-invoice-due');
  const notifyInvoiceOverdue = document.getElementById('notify-invoice-overdue');
  const notifyProductLowStock = document.getElementById('notify-product-low-stock');
  const notifySystemUpdates = document.getElementById('notify-system-updates');
  const notifyClientActivity = document.getElementById('notify-client-activity');
  const notifyLoginAttempts = document.getElementById('notify-login-attempts');
  const saveNotificationSettingsBtn = document.getElementById('save-notification-settings');
  const resetNotificationSettingsBtn = document.getElementById('reset-notification-settings');

  // Security Elements
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const twoFaToggle = document.getElementById('enable-2fa');
  const twoFaSetup = document.getElementById('2fa-setup');
  const sessionTimeoutInput = document.getElementById('session-timeout');
  const requireLoginConfirmationToggle = document.getElementById('require-login-confirmation');
  const passwordStrengthBar = document.querySelector('.strength-bar');
  const passwordStrengthText = document.querySelector('.password-strength-text span');
  const saveSecuritySettingsBtn = document.getElementById('save-security-settings');
  const resetSecuritySettingsBtn = document.getElementById('reset-security-settings');

  // Set current language in select
  const languageSelect = document.getElementById('user-language');
  languageSelect.value = langManager.currentLang;

  // Language change handler
  languageSelect.addEventListener('change', async (e) => {
    const newLang = e.target.value;
    const locale = languageManager.locales[newLang];
    
    if (locale) {
        // Update currency and format settings
        defaultCurrencyInput.value = locale.currency;
        await settingsManager.updateInvoiceSettings({
            currency: locale.currency
        });
        
        // Update language
        userSettings.language = newLang;
        await saveUserPreferences({
            language: newLang
        });
        
        showToast('success', 'Sucesso', 'Idioma atualizado com sucesso');
    }
  });

  // Initialize Settings
  function initializeSettings() {
    // Load user profile
    userNameDisplay.textContent = userSettings.name;
    userNameInput.value = userSettings.name;
    userEmailInput.value = userSettings.email;
    userPhoneInput.value = userSettings.phone;
    userLanguageSelect.value = userSettings.language;

    // Load business settings
    businessNameInput.value = businessSettings.name;
    taxIdInput.value = businessSettings.taxId;
    businessAddressInput.value = businessSettings.address;
    businessWebsiteInput.value = businessSettings.website;
    businessEmailInput.value = businessSettings.email;

    // Load appearance settings
    if (appearanceSettings.logo) {
      logoPreviewImg.src = appearanceSettings.logo;
      logoPreviewImg.style.display = 'block';
      logoPlaceholder.style.display = 'none';
    } else {
      logoPreviewImg.style.display = 'none';
      logoPlaceholder.style.display = 'flex';
    }
    themeSelectionInput.value = appearanceSettings.theme;
    accentColorInput.value = appearanceSettings.accentColor;
    colorValue.textContent = appearanceSettings.accentColor;
    fontSizeInput.value = appearanceSettings.fontSize;
    sidebarPositionInput.value = appearanceSettings.sidebarPosition;

    // Load invoice settings
    invoicePrefixInput.value = invoiceSettings.prefix;
    invoiceNextNumberInput.value = invoiceSettings.nextNumber;
    invoiceTemplateInput.value = invoiceSettings.template;
    invoiceColorInput.value = invoiceSettings.color;
    invoiceColorValue.textContent = invoiceSettings.color;
    defaultCurrencyInput.value = invoiceSettings.currency;
    defaultTaxRateInput.value = invoiceSettings.taxRate;
    paymentTermsInput.value = invoiceSettings.paymentTerms;
    invoiceNotesInput.value = invoiceSettings.notes;

    // Load notification settings
    notifyInvoiceCreated.checked = notificationSettings.emailNotifications.invoiceCreated;
    notifyPaymentReceived.checked = notificationSettings.emailNotifications.paymentReceived;
    notifyInvoiceDue.checked = notificationSettings.emailNotifications.invoiceDue;
    notifyInvoiceOverdue.checked = notificationSettings.emailNotifications.invoiceOverdue;
    notifyProductLowStock.checked = notificationSettings.systemNotifications.productLowStock;
    notifySystemUpdates.checked = notificationSettings.systemNotifications.systemUpdates;
    notifyClientActivity.checked = notificationSettings.systemNotifications.clientActivity;
    notifyLoginAttempts.checked = notificationSettings.systemNotifications.loginAttempts;

    // Load security settings
    twoFaToggle.checked = securitySettings.twoFactorEnabled;
    if (securitySettings.twoFactorEnabled) {
      twoFaSetup.classList.remove('hidden');
    }
    sessionTimeoutInput.value = securitySettings.sessionTimeout;
    requireLoginConfirmationToggle.checked = securitySettings.requireLoginConfirmation;
  }

  // Tab Navigation
  function setupTabs() {
    tabLinks.forEach(link => {
      link.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Deactivate all tabs
        tabLinks.forEach(tab => tab.classList.remove('active'));
        
        // Hide all sections
        settingsSections.forEach(section => section.classList.remove('active'));
        
        // Activate the clicked tab
        this.classList.add('active');
        
        // Show the corresponding section
        const targetSectionId = this.getAttribute('href').substring(1);
        document.getElementById(targetSectionId).classList.add('active');
      });
    });
  }

  // User Profile Settings
  function setupUserProfileSettings() {
    editUserSettingsBtn.addEventListener('click', function() {
      userNameInput.disabled = false;
      userEmailInput.disabled = false;
      userPhoneInput.disabled = false;
      userLanguageSelect.disabled = false;
      
      editUserSettingsBtn.style.display = 'none';
      saveUserSettingsBtn.style.display = 'inline-block';
      cancelUserSettingsBtn.style.display = 'inline-block';
    });

    cancelUserSettingsBtn.addEventListener('click', function() {
      userNameInput.value = userSettings.name;
      userEmailInput.value = userSettings.email;
      userPhoneInput.value = userSettings.phone;
      userLanguageSelect.value = userSettings.language;
      
      userNameInput.disabled = true;
      userEmailInput.disabled = true;
      userPhoneInput.disabled = true;
      userLanguageSelect.disabled = true;
      
      editUserSettingsBtn.style.display = 'inline-block';
      saveUserSettingsBtn.style.display = 'none';
      cancelUserSettingsBtn.style.display = 'none';
    });

    saveUserSettingsBtn.addEventListener('click', function() {
      if (!userNameInput.value || !userEmailInput.value) {
        showToast('error', 'Validation Error', 'Name and email are required fields.');
        return;
      }

      showLoadingOverlay();
      
      // Simulate API call
      setTimeout(() => {
        userSettings.name = userNameInput.value;
        userSettings.email = userEmailInput.value;
        userSettings.phone = userPhoneInput.value;
        userSettings.language = userLanguageSelect.value;
        
        userNameDisplay.textContent = userSettings.name;
        
        userNameInput.disabled = true;
        userEmailInput.disabled = true;
        userPhoneInput.disabled = true;
        userLanguageSelect.disabled = true;
        
        editUserSettingsBtn.style.display = 'inline-block';
        saveUserSettingsBtn.style.display = 'none';
        cancelUserSettingsBtn.style.display = 'none';
        
        hideLoadingOverlay();
        showToast('success', 'Success', 'User settings updated successfully.');
        
        // Save to localStorage
        saveSettingsToStorage();
      }, 1000);
    });
  }

  // Business Settings
  function setupBusinessSettings() {
    saveBusinessSettingsBtn.addEventListener('click', function() {
      showLoadingOverlay();
      
      // Simulate API call
      setTimeout(() => {
        businessSettings.name = businessNameInput.value;
        businessSettings.taxId = taxIdInput.value;
        businessSettings.address = businessAddressInput.value;
        businessSettings.website = businessWebsiteInput.value;
        businessSettings.email = businessEmailInput.value;
        
        hideLoadingOverlay();
        showToast('success', 'Success', 'Business settings updated successfully.');
        
        // Save to localStorage
        saveSettingsToStorage();
      }, 1000);
    });

    resetBusinessSettingsBtn.addEventListener('click', function() {
      showConfirmationModal(
        'Reset Business Settings',
        'Are you sure you want to reset the business settings to their default values?',
        function() {
          businessNameInput.value = businessSettings.name;
          taxIdInput.value = businessSettings.taxId;
          businessAddressInput.value = businessSettings.address;
          businessWebsiteInput.value = businessSettings.website;
          businessEmailInput.value = businessSettings.email;
          showToast('info', 'Reset Complete', 'Business settings have been reset.');
        }
      );
    });
  }

  // Appearance Settings
  function setupAppearanceSettings() {
    // Logo upload
    companyLogoInput.addEventListener('change', async function(e) {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          showToast('error', 'File Size Error', 'Logo image must be less than 2MB.');
          return;
        }

        const reader = new FileReader();
        reader.onload = async function(event) {
          const logoData = event.target.result;
          await settingsManager.updateAppearanceSettings({
            logo: logoData
          });
          
          logoPreviewImg.src = logoData;
          logoPreviewImg.style.display = 'block';
          logoPlaceholder.style.display = 'none';
        };
        reader.readAsDataURL(file);
      }
    });

    removeLogoBtn.addEventListener('click', function() {
      companyLogoInput.value = '';
      logoPreviewImg.src = '';
      logoPreviewImg.style.display = 'none';
      logoPlaceholder.style.display = 'flex';
    });

    // Color picker
    accentColorInput.addEventListener('input', function() {
      colorValue.textContent = this.value;
    });

    invoiceColorInput.addEventListener('input', function() {
      invoiceColorValue.textContent = this.value;
    });

    saveAppearanceSettingsBtn.addEventListener('click', function() {
      showLoadingOverlay();
      
      // Simulate API call
      setTimeout(() => {
        appearanceSettings.theme = themeSelectionInput.value;
        appearanceSettings.accentColor = accentColorInput.value;
        appearanceSettings.fontSize = fontSizeInput.value;
        appearanceSettings.sidebarPosition = sidebarPositionInput.value;
        
        if (logoPreviewImg.style.display !== 'none') {
          appearanceSettings.logo = logoPreviewImg.src;
        } else {
          appearanceSettings.logo = null;
        }
        
        // Apply theme changes
        applyThemeChanges();
        
        hideLoadingOverlay();
        showToast('success', 'Success', 'Appearance settings updated successfully.');
        
        // Save to localStorage
        saveSettingsToStorage();
      }, 1000);
    });

    resetAppearanceSettingsBtn.addEventListener('click', function() {
      showConfirmationModal(
        'Reset Appearance Settings',
        'Are you sure you want to reset the appearance settings to their default values?',
        function() {
          themeSelectionInput.value = 'light';
          accentColorInput.value = '#007ec7';
          colorValue.textContent = '#007ec7';
          fontSizeInput.value = 'medium';
          sidebarPositionInput.value = 'left';
          
          companyLogoInput.value = '';
          logoPreviewImg.src = '';
          logoPreviewImg.style.display = 'none';
          logoPlaceholder.style.display = 'flex';
          
          showToast('info', 'Reset Complete', 'Appearance settings have been reset.');
        }
      );
    });
  }

  // Invoice Settings
  function setupInvoiceSettings() {
    saveInvoiceSettingsBtn.addEventListener('click', async function() {
      if (!invoicePrefixInput.value || !invoiceNextNumberInput.value) {
        showToast('error', 'Validation Error', 'Invoice prefix and next number are required.');
        return;
      }

      showLoadingOverlay();
      
      // Update settings through the manager
      await settingsManager.updateInvoiceSettings({
        prefix: invoicePrefixInput.value,
        nextNumber: parseInt(invoiceNextNumberInput.value),
        template: invoiceTemplateInput.value,
        color: invoiceColorInput.value,
        currency: defaultCurrencyInput.value,
        taxRate: parseFloat(defaultTaxRateInput.value),
        paymentTerms: paymentTermsInput.value,
        notes: invoiceNotesInput.value
      });
      
      hideLoadingOverlay();
      showToast('success', 'Success', 'Invoice settings updated successfully.');
    });

    resetInvoiceSettingsBtn.addEventListener('click', function() {
      showConfirmationModal(
        'Reset Invoice Settings',
        'Are you sure you want to reset the invoice settings to their default values?',
        function() {
          invoicePrefixInput.value = invoiceSettings.prefix;
          invoiceNextNumberInput.value = invoiceSettings.nextNumber;
          invoiceTemplateInput.value = invoiceSettings.template;
          invoiceColorInput.value = invoiceSettings.color;
          invoiceColorValue.textContent = invoiceSettings.color;
          defaultCurrencyInput.value = invoiceSettings.currency;
          defaultTaxRateInput.value = invoiceSettings.taxRate;
          paymentTermsInput.value = invoiceSettings.paymentTerms;
          invoiceNotesInput.value = invoiceSettings.notes;
          
          showToast('info', 'Reset Complete', 'Invoice settings have been reset.');
        }
      );
    });
  }

  // Notification Settings
  function setupNotificationSettings() {
    saveNotificationSettingsBtn.addEventListener('click', function() {
      showLoadingOverlay();
      
      // Simulate API call
      setTimeout(() => {
        notificationSettings.emailNotifications.invoiceCreated = notifyInvoiceCreated.checked;
        notificationSettings.emailNotifications.paymentReceived = notifyPaymentReceived.checked;
        notificationSettings.emailNotifications.invoiceDue = notifyInvoiceDue.checked;
        notificationSettings.emailNotifications.invoiceOverdue = notifyInvoiceOverdue.checked;
        
        notificationSettings.systemNotifications.productLowStock = notifyProductLowStock.checked;
        notificationSettings.systemNotifications.systemUpdates = notifySystemUpdates.checked;
        notificationSettings.systemNotifications.clientActivity = notifyClientActivity.checked;
        notificationSettings.systemNotifications.loginAttempts = notifyLoginAttempts.checked;
        
        hideLoadingOverlay();
        showToast('success', 'Success', 'Notification settings updated successfully.');
        
        // Save to localStorage
        saveSettingsToStorage();
      }, 1000);
    });

    resetNotificationSettingsBtn.addEventListener('click', function() {
      showConfirmationModal(
        'Reset Notification Settings',
        'Are you sure you want to reset the notification settings to their default values?',
        function() {
          notifyInvoiceCreated.checked = true;
          notifyPaymentReceived.checked = true;
          notifyInvoiceDue.checked = true;
          notifyInvoiceOverdue.checked = true;
          notifyProductLowStock.checked = true;
          notifySystemUpdates.checked = true;
          notifyClientActivity.checked = false;
          notifyLoginAttempts.checked = true;
          
          showToast('info', 'Reset Complete', 'Notification settings have been reset.');
        }
      );
    });
  }

  // Security Settings
  function setupSecuritySettings() {
    // Password strength meter
    newPasswordInput.addEventListener('input', function() {
      const password = this.value;
      const strength = calculatePasswordStrength(password);
      
      // Update strength bar
      passwordStrengthBar.style.width = `${strength.percentage}%`;
      passwordStrengthBar.style.backgroundColor = strength.color;
      
      // Update strength text
      passwordStrengthText.textContent = strength.label;
    });

    // Two-factor authentication toggle
    twoFaToggle.addEventListener('change', function() {
      if (this.checked) {
        twoFaSetup.classList.remove('hidden');
      } else {
        showConfirmationModal(
          'Disable Two-Factor Authentication',
          'Are you sure you want to disable two-factor authentication? This will reduce the security of your account.',
          function() {
            twoFaSetup.classList.add('hidden');
          },
          function() {
            twoFaToggle.checked = true;
          }
        );
      }
    });

    saveSecuritySettingsBtn.addEventListener('click', function() {
      // Password validation
      if (newPasswordInput.value || confirmPasswordInput.value || currentPasswordInput.value) {
        if (!currentPasswordInput.value) {
          showToast('error', 'Validation Error', 'Current password is required to change your password.');
          return;
        }
        
        if (newPasswordInput.value !== confirmPasswordInput.value) {
          showToast('error', 'Validation Error', 'New passwords do not match.');
          return;
        }
        
        if (newPasswordInput.value && calculatePasswordStrength(newPasswordInput.value).percentage < 50) {
          showToast('warning', 'Weak Password', 'Please choose a stronger password.');
          return;
        }
      }

      showLoadingOverlay();
      
      // Simulate API call
      setTimeout(() => {
        securitySettings.twoFactorEnabled = twoFaToggle.checked;
        securitySettings.sessionTimeout = parseInt(sessionTimeoutInput.value);
        securitySettings.requireLoginConfirmation = requireLoginConfirmationToggle.checked;
        
        // Reset password fields
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
        passwordStrengthBar.style.width = '0%';
        passwordStrengthText.textContent = 'None';
        
        hideLoadingOverlay();
        showToast('success', 'Success', 'Security settings updated successfully.');
        
        // Save to localStorage
        saveSettingsToStorage();
      }, 1500);
    });

    resetSecuritySettingsBtn.addEventListener('click', function() {
      showConfirmationModal(
        'Reset Security Settings',
        'Are you sure you want to reset the security settings to their default values?',
        function() {
          currentPasswordInput.value = '';
          newPasswordInput.value = '';
          confirmPasswordInput.value = '';
          passwordStrengthBar.style.width = '0%';
          passwordStrengthText.textContent = 'None';
          
          twoFaToggle.checked = securitySettings.twoFactorEnabled;
          sessionTimeoutInput.value = securitySettings.sessionTimeout;
          requireLoginConfirmationToggle.checked = securitySettings.requireLoginConfirmation;
          
          showToast('info', 'Reset Complete', 'Security settings form has been reset.');
        }
      );
    });
  }

  // Helper Functions
  function calculatePasswordStrength(password) {
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
  }

  function applyThemeChanges() {
    // This would normally update CSS variables or apply classes to body
    document.documentElement.style.setProperty('--primary-color', appearanceSettings.accentColor);
    
    // Font size changes
    let fontSize;
    switch (appearanceSettings.fontSize) {
      case 'small':
        fontSize = '14px';
        break;
      case 'large':
        fontSize = '18px';
        break;
      default:
        fontSize = '16px';
    }
    document.documentElement.style.setProperty('--base-font-size', fontSize);
    
    // Add more theme customizations as needed
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    const container = document.getElementById('toast-container');
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
  }

  function showLoadingOverlay() {
    loadingOverlay.classList.remove('hidden');
  }

  function hideLoadingOverlay() {
    loadingOverlay.classList.add('hidden');
  }

  function showConfirmationModal(title, message, onConfirm, onCancel) {
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
    newModalConfirm.addEventListener('click', function() {
      if (typeof onConfirm === 'function') {
        onConfirm();
      }
      confirmationModal.classList.add('hidden');
    });
    
    newModalCancel.addEventListener('click', function() {
      if (typeof onCancel === 'function') {
        onCancel();
      }
      confirmationModal.classList.add('hidden');
    });
    
    newCloseModal.addEventListener('click', function() {
      if (typeof onCancel === 'function') {
        onCancel();
      }
      confirmationModal.classList.add('hidden');
    });
    
    // Show the modal
    confirmationModal.classList.remove('hidden');
  }

  async function saveUserPreferences(preferences) {
    try {
        const response = await fetch('/api/user/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preferences)
        });
        
        if (!response.ok) throw new Error('Failed to save preferences');
        
    } catch (error) {
        console.error('Error saving preferences:', error);
        showToast('Error saving preferences', 'error');
    }
  }

  function saveSettingsToStorage() {
    // In a real application, this would save to a backend API
    localStorage.setItem('userSettings', JSON.stringify(userSettings));
    localStorage.setItem('businessSettings', JSON.stringify(businessSettings));
    localStorage.setItem('appearanceSettings', JSON.stringify(appearanceSettings));
    localStorage.setItem('invoiceSettings', JSON.stringify(invoiceSettings));
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
  }

  function loadSettingsFromStorage() {
    // In a real application, this would load from a backend API
    const storedUserSettings = localStorage.getItem('userSettings');
    const storedBusinessSettings = localStorage.getItem('businessSettings');
    const storedAppearanceSettings = localStorage.getItem('appearanceSettings');
    const storedInvoiceSettings = localStorage.getItem('invoiceSettings');
    const storedNotificationSettings = localStorage.getItem('notificationSettings');
    const storedSecuritySettings = localStorage.getItem('securitySettings');
    
    if (storedUserSettings) userSettings = JSON.parse(storedUserSettings);
    if (storedBusinessSettings) businessSettings = JSON.parse(storedBusinessSettings);
    if (storedAppearanceSettings) {
      appearanceSettings = JSON.parse(storedAppearanceSettings);
      // Don't load logo from localStorage in a real application
      // This is just for demo purposes
    }
    if (storedInvoiceSettings) invoiceSettings = JSON.parse(storedInvoiceSettings);
    if (storedNotificationSettings) notificationSettings = JSON.parse(storedNotificationSettings);
    if (storedSecuritySettings) securitySettings = JSON.parse(storedSecuritySettings);
  }

  // Initialize the application
  function init() {
    loadSettingsFromStorage();
    initializeSettings();
    setupTabs();
    setupUserProfileSettings();
    setupBusinessSettings();
    setupAppearanceSettings();
    setupInvoiceSettings();
    setupNotificationSettings();
    setupSecuritySettings();
    
    // Apply current theme
    applyThemeChanges();
  }

  // Initialize when document is loaded
  init();

  // Mobile menu toggle (if needed)
  window.toggleMenu = function() {
    document.querySelector('.sidebar').classList.toggle('active');
  };
  
  // Sign out function
  window.handleSignOut = function() {
    showConfirmationModal(
      'Sign Out',
      'Are you sure you want to sign out?',
      function() {
        // In a real app, this would make an API call to logout
        showToast('info', 'Signed Out', 'You have been signed out successfully.');
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1500);
      }
    );
  };
});
*/