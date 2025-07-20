// Import Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { config } from './config.js';

// Initialize Supabase client
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);

// Import other modules
import { UserProfileManager } from './modules/userProfile.js';
import { showToast, showLoadingOverlay, hideLoadingOverlay } from './utils/helpers.js';

// Comment out problematic imports and manager usage
// import langManager from './utils/language.js';
// import { settingsManager } from '../../services/settingsManager.js';
// import { languageManager } from '../../services/languageManager.js';

class SettingsManager {
    constructor() {
        this.userId = null;
        this.userProfileManager = new UserProfileManager();
        this.initialize();
    }

    async initialize() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !session.user) {
                window.location.href = '/login.html';
                return;
            }

            this.userId = session.user.id;
            await this.initializeUserProfile();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing settings:', error);
            showToast('Error initializing settings', 'error');
        }
    }

    async initializeUserProfile() {
        await this.userProfileManager.initialize(this.userId);
    }

    setupEventListeners() {
        // Tab Navigation
        const tabLinks = document.querySelectorAll('.settings-tabs a');
        const settingsSections = document.querySelectorAll('.settings-section');

        tabLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Deactivate all tabs
                tabLinks.forEach(tab => tab.classList.remove('active'));
                
                // Hide all sections
                settingsSections.forEach(section => section.classList.remove('active'));
                
                // Activate the clicked tab
                link.classList.add('active');
                
                // Show the corresponding section
                const targetSectionId = link.getAttribute('href').substring(1);
                document.getElementById(targetSectionId).classList.add('active');
            });
        });

        // Sign out handler
        const signOutLink = document.querySelector('a[onclick="handleSignOut()"]');
        if (signOutLink) {
            signOutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSignOut();
            });
        }

        // Language change handler
        const userLanguageSelect = document.getElementById('user-language');
        if (userLanguageSelect) {
            userLanguageSelect.addEventListener('change', function(e) {
                const lang = e.target.value;
                localStorage.setItem('preferredLanguage', lang);
                if (window.languageManager) {
                    window.languageManager.setLanguage(lang);
                }
            });
        }
    }

    async handleSignOut() {
        try {
            const repoName = 'Walaka';
            const isGitHubPages = window.location.hostname.includes('github.io');
            const basePath = isGitHubPages ? `/${repoName}/` : '/';
            await supabase.auth.signOut();
            window.location.href = basePath + 'login.html';
        } catch (error) {
            console.error('Error signing out:', error);
            showToast('Error signing out', 'error');
        }
    }
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});

document.addEventListener('DOMContentLoaded', async () => {
  // await langManager.init();
  // await settingsManager.init();

  // let appearanceSettings = settingsManager.getAppearanceSettings();
  // let invoiceSettings = ... // if it uses settingsManager, comment out

  // let notificationSettings = ... // if it uses settingsManager, comment out
  // let securitySettings = ... // if it uses settingsManager, comment out

  // Initialize variables
  let userSettings = {
    name: '',
    email: '',
    phone: '',
    language: 'pt-MZ'
  };

  let businessSettings = {
    name: '',
    taxId: '',
    address: '',
    website: '',
    email: ''
  };

  let appearanceSettings = {
    theme: 'light',
    accentColor: '#007ec7',
    fontSize: 'medium',
    sidebarPosition: 'left',
    logo: null
  };

  let invoiceSettings = {
    prefix: 'FAT-',
    nextNumber: 1001,
    template: 'classic',
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

  // Add template manager object
  window.invoicetemplatemanager = {
    getSelectedTemplate: function() {
      return localStorage.getItem('selectedInvoiceTemplate') || 'classic';
    },
    saveTemplateSelection: function(template) {
      localStorage.setItem('selectedInvoiceTemplate', template);
    },
    previewTemplate: function(template) {
      // For now, just log the template selection
      console.log('Previewing template:', template);
      // You can add actual preview logic here later
    }
  };

  async function fetchUserSettings() {
    if (typeof supabase === 'undefined') return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    const userId = session.user.id;

    try {
      const { data: userRecord, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user settings:', error);
        return;
      }

      if (userRecord) {
        userSettings = {
          name: userRecord.username || '',
          email: userRecord.email || '',
          phone: userRecord.phone || '',
          language: userRecord.language || 'pt-MZ'
        };
      }
    } catch (e) {
      console.error('Error fetching user settings:', e);
    }
  }

  async function fetchBusinessSettings() {
    if (typeof supabase === 'undefined') return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    const userId = session.user.id;

    try {
      const { data: businessRecord, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching business settings:', error);
        return;
      }

      if (businessRecord) {
        businessSettings = {
          name: businessRecord.name || '',
          taxId: businessRecord.tax_id || '',
          address: businessRecord.address || '',
          website: businessRecord.website || '',
          email: businessRecord.email || ''
        };
      }
    } catch (e) {
      console.error('Error fetching business settings:', e);
    }
  }

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
  const userNameDisplay = document.getElementById('user-displayname');
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
  // languageSelect.value = langManager.currentLang;

  // Language change handler
  // languageSelect.addEventListener('change', async (e) => {
  //   const newLang = e.target.value;
  //   const locale = languageManager.locales[newLang];
  //   
  //   if (locale) {
  //       // Update currency and format settings
  //       defaultCurrencyInput.value = locale.currency;
  //       await settingsManager.updateInvoiceSettings({
  //           currency: locale.currency
  //       });
  //       
  //       // Update language
  //       userSettings.language = newLang;
  //       await saveUserPreferences({
  //           language: newLang
  //       });
  //       
  //       showToast('success', 'Sucesso', 'Idioma atualizado com sucesso');
  //   }
  // });

  // Initialize Settings
  async function initializeSettings() {
    try {
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

      // Get the selected template from localStorage or use default
      // Prioritize value from invoiceSettings if it exists
      const selectedTemplate = invoiceSettings.template || window.invoicetemplatemanager.getSelectedTemplate();
      invoiceTemplateInput.value = selectedTemplate;

      // Preview the selected template
      window.invoicetemplatemanager.previewTemplate(selectedTemplate);

      invoiceColorInput.value = invoiceSettings.color;
      invoiceColorValue.textContent = invoiceSettings.color;
      defaultCurrencyInput.value = invoiceSettings.currency;
      defaultTaxRateInput.value = invoiceSettings.taxRate;
      paymentTermsInput.value = invoiceSettings.paymentTerms;
      invoiceNotesInput.value = invoiceSettings.notes;

      // Load notification settings from database
      await loadNotificationSettings();

      // Load security settings
      twoFaToggle.checked = securitySettings.twoFactorEnabled;
      if (securitySettings.twoFactorEnabled) {
        twoFaSetup.classList.remove('hidden');
      }
      sessionTimeoutInput.value = securitySettings.sessionTimeout;
      requireLoginConfirmationToggle.checked = securitySettings.requireLoginConfirmation;
    } catch (error) {
      console.error('Error initializing settings:', error);
    }
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
        
        // Save to localStorage
        saveSettingsToStorage();

        // --- NEW: Save language to localStorage and update languageManager ---
        localStorage.setItem('preferredLanguage', userSettings.language);
        if (window.languageManager) {
          window.languageManager.setLanguage(userSettings.language);
        }

        hideLoadingOverlay();
        showToast('success', 'Success', 'User settings updated successfully.');
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
          // await settingsManager.updateAppearanceSettings({ logo: logoData });
          
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
      // await settingsManager.updateInvoiceSettings({
      //   prefix: invoicePrefixInput.value,
      //   nextNumber: parseInt(invoiceNextNumberInput.value),
      //   template: invoiceTemplateInput.value,
      //   color: invoiceColorInput.value,
      //   currency: defaultCurrencyInput.value,
      //   taxRate: parseFloat(defaultTaxRateInput.value),
      //   paymentTerms: paymentTermsInput.value,
      //   notes: invoiceNotesInput.value
      // });
      
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
    saveNotificationSettingsBtn.addEventListener('click', async function() {
      showLoadingOverlay();
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
          throw new Error('No active session found');
        }

        const notificationData = {
          user_id: session.user.id,
          invoice_created: notifyInvoiceCreated.checked,
          payment_received: notifyPaymentReceived.checked,
          invoice_due: notifyInvoiceDue.checked,
          invoice_overdue: notifyInvoiceOverdue.checked,
          product_low_stock: notifyProductLowStock.checked,
          system_updates: notifySystemUpdates.checked,
          client_activity: notifyClientActivity.checked,
          login_attempts: notifyLoginAttempts.checked
        };

        const { error } = await supabase
          .from('notification_settings')
          .upsert(notificationData, { onConflict: 'user_id' });

        if (error) throw error;

        // Update local settings
        notificationSettings = {
          emailNotifications: {
            invoiceCreated: notificationData.invoice_created,
            paymentReceived: notificationData.payment_received,
            invoiceDue: notificationData.invoice_due,
            invoiceOverdue: notificationData.invoice_overdue
          },
          systemNotifications: {
            productLowStock: notificationData.product_low_stock,
            systemUpdates: notificationData.system_updates,
            clientActivity: notificationData.client_activity,
            loginAttempts: notificationData.login_attempts
          }
        };
        
        hideLoadingOverlay();
        showToast('Notification settings saved successfully', 'success');
      } catch (error) {
        console.error('Error saving notification settings:', error);
        showToast('Error saving notification settings', 'error');
        hideLoadingOverlay();
      }
    });

    resetNotificationSettingsBtn.addEventListener('click', function() {
      showConfirmationModal(
        'Reset Notification Settings',
        'Are you sure you want to reset the notification settings to their default values?',
        async function() {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session || !session.user) {
              throw new Error('No active session found');
            }

            // Reset to default values
            const defaultNotificationData = {
              user_id: session.user.id,
              invoice_created: true,
              payment_received: true,
              invoice_due: true,
              invoice_overdue: true,
              product_low_stock: true,
              system_updates: true,
              client_activity: false,
              login_attempts: true
            };

            const { error } = await supabase
              .from('notification_settings')
              .upsert(defaultNotificationData, { onConflict: 'user_id' });

            if (error) throw error;

            // Update form checkboxes
            notifyInvoiceCreated.checked = true;
            notifyPaymentReceived.checked = true;
            notifyInvoiceDue.checked = true;
            notifyInvoiceOverdue.checked = true;
            notifyProductLowStock.checked = true;
            notifySystemUpdates.checked = true;
            notifyClientActivity.checked = false;
            notifyLoginAttempts.checked = true;

            // Update local settings
            notificationSettings = {
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
            
            showToast('info', 'Reset Complete', 'Notification settings have been reset to defaults.');
          } catch (error) {
            console.error('Error resetting notification settings:', error);
            showToast('error', 'Error', `Failed to reset notification settings: ${error.message}`);
          }
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

  // Load notification settings from database
  async function loadNotificationSettings() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found');
      }

      const { data: notificationData, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (notificationData) {
        // Update form checkboxes
        notifyInvoiceCreated.checked = notificationData.invoice_created;
        notifyPaymentReceived.checked = notificationData.payment_received;
        notifyInvoiceDue.checked = notificationData.invoice_due;
        notifyInvoiceOverdue.checked = notificationData.invoice_overdue;
        notifyProductLowStock.checked = notificationData.product_low_stock;
        notifySystemUpdates.checked = notificationData.system_updates;
        notifyClientActivity.checked = notificationData.client_activity;
        notifyLoginAttempts.checked = notificationData.login_attempts;

        // Update local settings
        notificationSettings = {
          emailNotifications: {
            invoiceCreated: notificationData.invoice_created,
            paymentReceived: notificationData.payment_received,
            invoiceDue: notificationData.invoice_due,
            invoiceOverdue: notificationData.invoice_overdue
          },
          systemNotifications: {
            productLowStock: notificationData.product_low_stock,
            systemUpdates: notificationData.system_updates,
            clientActivity: notificationData.client_activity,
            loginAttempts: notificationData.login_attempts
          }
        };
      } else {
        // Use default values if no settings exist
        console.log('No notification settings found, using defaults');
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      // Continue with default values if there's an error
    }
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
  async function init() {
    await loadSettingsFromStorage();
    await initializeSettings();
    setupTabs();
    setupUserProfileSettings();
    setupBusinessSettings();
    setupAppearanceSettings();
    setupInvoiceSettings();
    setupNotificationSettings();
    setupSecuritySettings();
    setupEventListeners();
    
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
          const repoName = 'Walaka';
          const isGitHubPages = window.location.hostname.includes('github.io');
          const basePath = isGitHubPages ? `/${repoName}/` : '/';
          window.location.href = basePath + 'login.html';
        }, 1500);
      }
    );
  };

  // Display user name function
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

    // Update subtitle with displayName
    const subtitle = document.getElementById('dashboard-subtitle');
    if (subtitle) {
      ['en', 'pt'].forEach(lang => {
        if (subtitle.dataset[lang]) {
          subtitle.dataset[lang] = subtitle.dataset[lang].replace(/John/g, displayName);
        }
      });
      subtitle.textContent = subtitle.textContent.replace(/John/g, displayName);
    }
  });

  // Dropdown open/close logic for user menu
  const userProfile = document.getElementById('userProfile');
  const userDropdown = document.getElementById('userDropdown');

  let dropdownTimeout;

  function openDropdown() {
    clearTimeout(dropdownTimeout);
    userProfile.classList.add('open');
  }
  function closeDropdown() {
    dropdownTimeout = setTimeout(() => {
      userProfile.classList.remove('open');
    }, 150);
  }

  userProfile.addEventListener('mouseenter', openDropdown);
  userProfile.addEventListener('mouseleave', closeDropdown);
  userDropdown.addEventListener('mouseenter', openDropdown);
  userDropdown.addEventListener('mouseleave', closeDropdown);

  // Optional: close on click outside
  document.addEventListener('click', function(e) {
    if (!userProfile.contains(e.target)) {
      userProfile.classList.remove('open');
    }
  });

  function setupEventListeners() {
    // Template selection
    const templateSelect = document.getElementById('invoice-template');
    if (templateSelect) {
      console.log('Template select element found:', templateSelect);
      
      // Add change event listener
      templateSelect.addEventListener('change', function() {
        const selectedTemplateValue = this.value;
        console.log('Template changed to:', selectedTemplateValue);
        
        // Save to localStorage
        window.invoicetemplatemanager.saveTemplateSelection(selectedTemplateValue);
        
        // Preview the template
        window.invoicetemplatemanager.previewTemplate(selectedTemplateValue);
        
        // Show success message
        showToast('success', 'Template Updated', `Invoice template changed to ${selectedTemplateValue}`);
      });
    } else {
      console.error('Template select element not found!');
    }
    
    // Save invoice settings
    const saveInvoiceSettingsBtn = document.getElementById('save-invoice-settings');
    if (saveInvoiceSettingsBtn) {
      saveInvoiceSettingsBtn.addEventListener('click', saveInvoiceSettings);
    }
    
    // Reset invoice settings
    const resetInvoiceSettingsBtn = document.getElementById('reset-invoice-settings');
    if (resetInvoiceSettingsBtn) {
      resetInvoiceSettingsBtn.addEventListener('click', resetInvoiceSettings);
    }
  }

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();
      
      if (error) throw error;
      
      if (data) {
        // Populate form fields
        document.getElementById('invoice-prefix').value = data.invoice_prefix || '';
        document.getElementById('invoice-next-number').value = data.invoice_next_number || 1;
        document.getElementById('invoice-template').value = data.invoice_template || 'classic';
        document.getElementById('invoice-color').value = data.invoice_color || '#007ec7';
        document.getElementById('default-currency').value = data.default_currency || 'MZN';
        document.getElementById('default-tax-rate').value = data.default_tax_rate || 23;
        document.getElementById('payment-terms').value = data.payment_terms || 'net-30';
        document.getElementById('invoice-notes').value = data.invoice_notes || '';
        
        // Update color value display
        document.getElementById('invoice-color-value').textContent = data.invoice_color || '#007ec7';
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast('Error loading settings', 'error');
    }
  }

  async function saveInvoiceSettings() {
    try {
      const settings = {
        invoice_prefix: document.getElementById('invoice-prefix').value,
        invoice_next_number: parseInt(document.getElementById('invoice-next-number').value),
        invoice_template: document.getElementById('invoice-template').value,
        invoice_color: document.getElementById('invoice-color').value,
        default_currency: document.getElementById('default-currency').value,
        default_tax_rate: parseFloat(document.getElementById('default-tax-rate').value),
        payment_terms: document.getElementById('payment-terms').value,
        invoice_notes: document.getElementById('invoice-notes').value
      };

      // Assuming you have a user ID to associate settings with
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
          showToast('error', 'Authentication Error', 'User not logged in.');
          return;
      }
      settings.user_id = session.user.id;

      const { error } = await supabase
        .from('settings')
        .upsert([settings], { onConflict: 'user_id' }); // Use onConflict to update existing user settings

      if (error) throw error;

      // Update local invoiceSettings object after successful save
      invoiceSettings = settings;

      showToast('success', 'Success', 'Invoice settings updated successfully.');
    } catch (error) {
      console.error('Error saving settings:', error);
      showToast('Error saving settings', 'error');
    }
  }

  function resetInvoiceSettings() {
    // Reset to default values
    document.getElementById('invoice-prefix').value = 'INV-';
    document.getElementById('invoice-next-number').value = 1;
    document.getElementById('invoice-template').value = 'classic';
    document.getElementById('invoice-color').value = '#007ec7';
    document.getElementById('default-currency').value = 'MZN';
    document.getElementById('default-tax-rate').value = 23;
    document.getElementById('payment-terms').value = 'net-30';
    document.getElementById('invoice-notes').value = '';
    
    // Update color value display
    document.getElementById('invoice-color-value').textContent = '#007ec7';
    
    // Update template preview
    window.invoicetemplatemanager.previewTemplate('classic');
    
    showToast('Settings reset to defaults', 'info');
  }

  function previewTemplate(selectedTemplate) {
    // Implementation of previewTemplate function
    console.log(`Previewing template: ${selectedTemplate}`);
  }

  function saveTemplateSelection(selectedTemplate) {
    // Implementation of saveTemplateSelection function
    console.log(`Selected template: ${selectedTemplate}`);
  }
});
