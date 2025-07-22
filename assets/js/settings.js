// Remove the import statement since we're loading Supabase via CDN
// import { createClient } from '@supabase/supabase-js';

// Remove the Supabase initialization since it's now in the HTML
// const supabaseUrl = 'YOUR_SUPABASE_URL';
// const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
// const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Comment out problematic imports and manager usage
// import langManager from './utils/language.js';
// import { settingsManager } from '../../services/settingsManager.js';
// import { languageManager } from '../../services/languageManager.js';

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
    getSelectedTemplate: async function() {
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session || !session.user) return 'template01';

            const { data: invoiceData } = await window.supabase
                .from('invoice_settings')
                .select('template')
                .eq('user_id', session.user.id)
                .single();

            return invoiceData?.template || 'template01';
        } catch (error) {
            console.error('Error getting template:', error);
            return 'template01';
        }
    },
    saveTemplateSelection: async function(template) {
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session || !session.user) return;

            await window.supabase
                .from('invoice_settings')
                .upsert({
                    user_id: session.user.id,
                    template: template
                }, { onConflict: 'user_id' });
        } catch (error) {
            console.error('Error saving template:', error);
        }
    },
    loadTemplate: async function(templateName) {
        const templateFile = {
            'template01': 'template01.html',
            'template02': 'template02.html',
            'template03': 'template03.html',
            'template04': 'template04.html'
        }[templateName] || 'template01.html';

        try {
            const response = await fetch(templateFile);
            if (!response.ok) throw new Error('Template not found');
            return await response.text();
        } catch (error) {
            console.error('Error loading template:', error);
            throw error;
        }
    },
    previewTemplate: function(template) {
        // For now, just log the template selection
        console.log('Previewing template:', template);
        // You can add actual preview logic here later
    }
};

  async function fetchUserSettings() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        console.error('No active session found');
        return;
      }

      const userId = session.user.id;

      const { data: userRecord, error } = await window.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user settings:', error);
        showToast('error', 'Error', 'Failed to fetch user settings');
        return;
      }

      if (userRecord) {
        userSettings = {
          name: userRecord.username || '',
          email: userRecord.email || '',
          phone: userRecord.phone || '',
          language: userRecord.language || 'pt-MZ'
        };

        // Update UI with fetched data
        const userNameDisplay = document.getElementById('user-displayname');
        const userNameInput = document.getElementById('user-name-input');
        const userEmailInput = document.getElementById('user-email-input');
        const userPhoneInput = document.getElementById('user-phone');
        const userLanguageSelect = document.getElementById('user-language');

        if (userNameDisplay) userNameDisplay.textContent = userSettings.name;
        if (userNameInput) userNameInput.value = userSettings.name;
        if (userEmailInput) userEmailInput.value = userSettings.email;
        if (userPhoneInput) userPhoneInput.value = userSettings.phone;
        if (userLanguageSelect) userLanguageSelect.value = userSettings.language;
      }
    } catch (e) {
      console.error('Error in fetchUserSettings:', e);
      showToast('error', 'Error', 'Failed to fetch user settings');
    }
  }

  async function fetchBusinessSettings() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        console.error('No active session found');
        return;
      }

      const userId = session.user.id;

      const { data: businessRecord, error } = await window.supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching business settings:', error);
        showToast('error', 'Error', 'Failed to fetch business settings');
        return;
      }

      if (businessRecord) {
        businessSettings = {
          name: businessRecord.company_name || '',
          taxId: businessRecord.tax_id || '',
          address: businessRecord.address || '',
          website: businessRecord.website || '',
          email: businessRecord.email || ''
        };

        // Update UI with fetched data
        const businessNameInput = document.getElementById('business-name');
        const taxIdInput = document.getElementById('tax-id');
        const businessAddressInput = document.getElementById('business-address');
        const businessWebsiteInput = document.getElementById('business-website');
        const businessEmailInput = document.getElementById('business-email');

        if (businessNameInput) businessNameInput.value = businessSettings.name;
        if (taxIdInput) taxIdInput.value = businessSettings.taxId;
        if (businessAddressInput) businessAddressInput.value = businessSettings.address;
        if (businessWebsiteInput) businessWebsiteInput.value = businessSettings.website;
        if (businessEmailInput) businessEmailInput.value = businessSettings.email;
      }
    } catch (e) {
      console.error('Error in fetchBusinessSettings:', e);
      showToast('error', 'Error', 'Failed to fetch business settings');
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

    // Get the selected template from Supabase
    window.invoicetemplatemanager.getSelectedTemplate().then(template => {
        invoiceTemplateInput.value = template;
        // Preview the selected template with the current color
        previewTemplate(template);
    });

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

    saveUserSettingsBtn.addEventListener('click', async function() {
      if (!userNameInput.value || !userEmailInput.value) {
        showToast('error', 'Validation Error', 'Name and email are required fields.');
        return;
      }

      showLoadingOverlay();
      
      try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session || !session.user) {
          throw new Error('No active session found');
        }

        const userId = session.user.id;

        // Update user data in Supabase
        const { error } = await window.supabase
          .from('users')
          .update({
            username: userNameInput.value,
            email: userEmailInput.value,
            phone: userPhoneInput.value,
            language: userLanguageSelect.value,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (error) {
          console.error('Error updating user settings:', error);
          throw error;
        }

        // Update local settings
        userSettings.name = userNameInput.value;
        userSettings.email = userEmailInput.value;
        userSettings.phone = userPhoneInput.value;
        userSettings.language = userLanguageSelect.value;
        
        // Update language manager if language changed
        if (window.languageManager && window.languageManager.currentLang !== userLanguageSelect.value) {
          await window.languageManager.setLanguage(userLanguageSelect.value);
        }
        
        // Update UI
        userNameDisplay.textContent = userSettings.name;
        
        // Disable inputs
        userNameInput.disabled = true;
        userEmailInput.disabled = true;
        userPhoneInput.disabled = true;
        userLanguageSelect.disabled = true;
        
        // Update button visibility
        editUserSettingsBtn.style.display = 'inline-block';
        saveUserSettingsBtn.style.display = 'none';
        cancelUserSettingsBtn.style.display = 'none';
        
        showToast('success', 'Success', 'User settings updated successfully.');
      } catch (error) {
        console.error('Error updating user settings:', error);
        showToast('error', 'Error', 'Failed to update user settings');
      } finally {
        hideLoadingOverlay();
      }
    });
  }

  // Business Settings
  function setupBusinessSettings() {
    saveBusinessSettingsBtn.addEventListener('click', async function() {
      showLoadingOverlay();
      try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session || !session.user) {
          throw new Error('No active session found');
        }

        // First check if a record exists
        const { data: existingProfile, error: fetchError } = await window.supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw fetchError;
        }

        const businessProfile = {
          user_id: session.user.id,
          company_name: businessNameInput.value,
          tax_id: taxIdInput.value,
          address: businessAddressInput.value,
          website: businessWebsiteInput.value,
          email: businessEmailInput.value,
          created_at: existingProfile ? existingProfile.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        let result;
        if (existingProfile) {
          // Update existing record
          result = await window.supabase
            .from('business_profiles')
            .update(businessProfile)
            .eq('user_id', session.user.id);
        } else {
          // Insert new record
          result = await window.supabase
            .from('business_profiles')
            .insert([businessProfile]);
        }

        if (result.error) {
          console.error('Supabase error details:', result.error);
          throw result.error;
        }

        // Always reload from Supabase to get the latest values
        await loadBusinessProfileSettings();
        hideLoadingOverlay();
        showToast('success', 'Success', 'Business settings updated successfully.');
      } catch (error) {
        console.error('Error saving business settings:', error);
        hideLoadingOverlay();
        showToast('error', 'Error', `Failed to update business settings: ${error.message}`);
      }
    });

    resetBusinessSettingsBtn.addEventListener('click', function() {
      showConfirmationModal(
        'Reset Business Settings',
        'Are you sure you want to reset the business settings to their default values?',
        async function() {
          try {
            await loadBusinessProfileSettings();
            showToast('info', 'Reset Complete', 'Business settings have been reset.');
          } catch (error) {
            console.error('Error resetting business settings:', error);
            showToast('error', 'Error', `Failed to reset business settings: ${error.message}`);
          }
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

        try {
          showLoadingOverlay();
          const { data: { session } } = await window.supabase.auth.getSession();
          if (!session || !session.user) {
            throw new Error('No active session found');
          }

          // Upload logo to Supabase Storage
          const fileExt = file.name.split('.').pop();
          const fileName = `${session.user.id}/logo.${fileExt}`;
          const { data: uploadData, error: uploadError } = await window.supabase.storage
            .from('company-logos')
            .upload(fileName, file, { upsert: true });

          if (uploadError) throw uploadError;

          // Get public URL
          const { data: { publicUrl } } = window.supabase.storage
            .from('company-logos')
            .getPublicUrl(fileName);

          // Update appearance settings in database
          const { error: updateError } = await window.supabase
            .from('appearance_settings')
            .upsert({
              user_id: session.user.id,
              logo_url: publicUrl,
              updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });

          if (updateError) throw updateError;

          // Update local state and UI
          appearanceSettings.logo = publicUrl;
          logoPreviewImg.src = publicUrl;
          logoPreviewImg.style.display = 'block';
          logoPlaceholder.style.display = 'none';

          hideLoadingOverlay();
          showToast('success', 'Success', 'Logo uploaded successfully');
        } catch (error) {
          console.error('Error uploading logo:', error);
          hideLoadingOverlay();
          showToast('error', 'Error', 'Failed to upload logo');
        }
      }
    });

    removeLogoBtn.addEventListener('click', async function() {
      try {
        showLoadingOverlay();
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session || !session.user) {
          throw new Error('No active session found');
        }

        // Update appearance settings in database
        const { error: updateError } = await window.supabase
          .from('appearance_settings')
          .update({
            logo_url: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', session.user.id);

        if (updateError) throw updateError;

        // Update local state and UI
        appearanceSettings.logo = null;
        companyLogoInput.value = '';
        logoPreviewImg.src = '';
        logoPreviewImg.style.display = 'none';
        logoPlaceholder.style.display = 'flex';

        hideLoadingOverlay();
        showToast('success', 'Success', 'Logo removed successfully');
      } catch (error) {
        console.error('Error removing logo:', error);
        hideLoadingOverlay();
        showToast('error', 'Error', 'Failed to remove logo');
      }
    });

    // Color picker
    accentColorInput.addEventListener('input', function() {
      colorValue.textContent = this.value;
    });

    invoiceColorInput.addEventListener('input', function() {
      invoiceColorValue.textContent = this.value;
    });

    saveAppearanceSettingsBtn.addEventListener('click', async function() {
      showLoadingOverlay();
      
      try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session || !session.user) {
          throw new Error('No active session found');
        }

        // First check if a record exists
        const { data: existingSettings, error: fetchError } = await window.supabase
          .from('appearance_settings')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        const appearanceData = {
          user_id: session.user.id,
          theme: themeSelectionInput.value,
          accent_color: accentColorInput.value,
          font_size: fontSizeInput.value,
          sidebar_position: sidebarPositionInput.value,
          created_at: existingSettings ? existingSettings.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        let result;
        if (existingSettings) {
          // Update existing record
          result = await window.supabase
            .from('appearance_settings')
            .update(appearanceData)
            .eq('user_id', session.user.id);
        } else {
          // Insert new record
          result = await window.supabase
            .from('appearance_settings')
            .insert([appearanceData]);
        }

        if (result.error) {
          console.error('Supabase error details:', result.error);
          throw result.error;
        }

        // Update local settings
        appearanceSettings.theme = appearanceData.theme;
        appearanceSettings.accentColor = appearanceData.accent_color;
        appearanceSettings.fontSize = appearanceData.font_size;
        appearanceSettings.sidebarPosition = appearanceData.sidebar_position;
        
        // Apply theme changes
        applyThemeChanges();
        
        hideLoadingOverlay();
        showToast('success', 'Success', 'Appearance settings updated successfully');
      } catch (error) {
        console.error('Error saving appearance settings:', error);
        hideLoadingOverlay();
        showToast('error', 'Error', `Failed to update appearance settings: ${error.message}`);
      }
    });

    resetAppearanceSettingsBtn.addEventListener('click', function() {
      showConfirmationModal(
        'Reset Appearance Settings',
        'Are you sure you want to reset the appearance settings to their default values?',
        async function() {
          try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session || !session.user) {
              throw new Error('No active session found');
            }

            // Fetch the original appearance settings
            const { data: appearanceSettings, error } = await window.supabase
              .from('appearance_settings')
              .select('*')
              .eq('user_id', session.user.id)
              .single();

            if (error && error.code !== 'PGRST116') {
              throw error;
            }

            if (appearanceSettings) {
              themeSelectionInput.value = appearanceSettings.theme || 'light';
              accentColorInput.value = appearanceSettings.accent_color || '#007ec7';
              colorValue.textContent = appearanceSettings.accent_color || '#007ec7';
              fontSizeInput.value = appearanceSettings.font_size || 'medium';
              sidebarPositionInput.value = appearanceSettings.sidebar_position || 'left';
              
              if (appearanceSettings.logo_url) {
                logoPreviewImg.src = appearanceSettings.logo_url;
                logoPreviewImg.style.display = 'block';
                logoPlaceholder.style.display = 'none';
              } else {
                logoPreviewImg.src = '';
                logoPreviewImg.style.display = 'none';
                logoPlaceholder.style.display = 'flex';
              }
            } else {
              // Reset to default values if no settings exist
              themeSelectionInput.value = 'light';
              accentColorInput.value = '#007ec7';
              colorValue.textContent = '#007ec7';
              fontSizeInput.value = 'medium';
              sidebarPositionInput.value = 'left';
              logoPreviewImg.src = '';
              logoPreviewImg.style.display = 'none';
              logoPlaceholder.style.display = 'flex';
            }

            showToast('info', 'Reset Complete', 'Appearance settings have been reset');
          } catch (error) {
            console.error('Error resetting appearance settings:', error);
            showToast('error', 'Error', `Failed to reset appearance settings: ${error.message}`);
          }
        }
      );
    });

    // Sync theme dropdown with current theme
    if (themeSelectionInput) {
      // Set dropdown to current theme on load
      const currentTheme = document.documentElement.getAttribute('data-theme') || localStorage.getItem('theme') || 'light';
      themeSelectionInput.value = currentTheme;

      // When dropdown changes, update theme and save to Supabase
      themeSelectionInput.addEventListener('change', async function() {
        const newTheme = this.value;
        if (window.setTheme) window.setTheme(newTheme);
        // Save to Supabase appearance_settings
        try {
          const { data: { session } } = await window.supabase.auth.getSession();
          if (session && session.user) {
            await window.supabase
              .from('appearance_settings')
              .upsert({
                user_id: session.user.id,
                theme: newTheme,
                updated_at: new Date().toISOString()
              }, { onConflict: 'user_id' });
          }
        } catch (err) {
          console.error('Failed to save theme to Supabase:', err);
        }
      });

      // When theme changes elsewhere, update dropdown
      window.addEventListener('themechange', (e) => {
        if (themeSelectionInput.value !== e.detail.theme) {
          themeSelectionInput.value = e.detail.theme;
        }
      });
    }
  }

  // Invoice Settings
  function setupInvoiceSettings() {
    saveInvoiceSettingsBtn.addEventListener('click', async function() {
      if (!invoicePrefixInput.value || !invoiceNextNumberInput.value) {
        showToast('error', 'Validation Error', 'Invoice prefix and next number are required.');
        return;
      }

      showLoadingOverlay();
      
      try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session || !session.user) {
          throw new Error('No active session found');
        }

        // First check if a record exists
        const { data: existingSettings, error: fetchError } = await window.supabase
          .from('invoice_settings')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        const invoiceData = {
          user_id: session.user.id,
          template: invoiceTemplateInput.value,
          content: {
            prefix: invoicePrefixInput.value,
            next_number: parseInt(invoiceNextNumberInput.value),
            color: invoiceColorInput.value,
            currency: defaultCurrencyInput.value,
            tax_rate: parseFloat(defaultTaxRateInput.value),
            payment_terms: paymentTermsInput.value,
            notes: invoiceNotesInput.value
          },
          created_at: existingSettings ? existingSettings.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        let result;
        if (existingSettings) {
          // Update existing record
          result = await window.supabase
            .from('invoice_settings')
            .update(invoiceData)
            .eq('user_id', session.user.id);
        } else {
          // Insert new record
          result = await window.supabase
            .from('invoice_settings')
            .insert([invoiceData]);
        }

        if (result.error) {
          console.error('Supabase error details:', result.error);
          throw result.error;
        }

        // Update local settings
        invoiceSettings = {
          prefix: invoiceData.content.prefix,
          nextNumber: invoiceData.content.next_number,
          template: invoiceData.template,
          color: invoiceData.content.color,
          currency: invoiceData.content.currency,
          taxRate: invoiceData.content.tax_rate,
          paymentTerms: invoiceData.content.payment_terms,
          notes: invoiceData.content.notes
        };
        
        hideLoadingOverlay();
        showToast('success', 'Success', 'Invoice settings updated successfully');
      } catch (error) {
        console.error('Error saving invoice settings:', error);
        hideLoadingOverlay();
        showToast('error', 'Error', `Failed to update invoice settings: ${error.message}`);
      }
    });

    resetInvoiceSettingsBtn.addEventListener('click', function() {
      showConfirmationModal(
        'Reset Invoice Settings',
        'Are you sure you want to reset the invoice settings to their default values?',
        async function() {
          try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session || !session.user) {
              throw new Error('No active session found');
            }

            // Fetch the original invoice settings
            const { data: invoiceData, error } = await window.supabase
              .from('invoice_settings')
              .select('*')
              .eq('user_id', session.user.id)
              .single();

            if (error && error.code !== 'PGRST116') {
              throw error;
            }

            if (invoiceData) {
              invoicePrefixInput.value = invoiceData.content.prefix || 'FAT-';
              invoiceNextNumberInput.value = invoiceData.content.next_number || 1001;
              invoiceTemplateInput.value = invoiceData.template || 'classic';
              invoiceColorInput.value = invoiceData.content.color || '#007ec7';
              invoiceColorValue.textContent = invoiceData.content.color || '#007ec7';
              defaultCurrencyInput.value = invoiceData.content.currency || 'MZN';
              defaultTaxRateInput.value = invoiceData.content.tax_rate || 17;
              paymentTermsInput.value = invoiceData.content.payment_terms || 'net-30';
              invoiceNotesInput.value = invoiceData.content.notes || 'Obrigado pela preferência. O pagamento deve ser efetuado no prazo de 30 dias.';
            } else {
              // Reset to default values if no settings exist
              invoicePrefixInput.value = 'FAT-';
              invoiceNextNumberInput.value = 1001;
              invoiceTemplateInput.value = 'classic';
              invoiceColorInput.value = '#007ec7';
              invoiceColorValue.textContent = '#007ec7';
              defaultCurrencyInput.value = 'MZN';
              defaultTaxRateInput.value = 17;
              paymentTermsInput.value = 'net-30';
              invoiceNotesInput.value = 'Obrigado pela preferência. O pagamento deve ser efetuado no prazo de 30 dias.';
            }

            showToast('info', 'Reset Complete', 'Invoice settings have been reset');
          } catch (error) {
            console.error('Error resetting invoice settings:', error);
            showToast('error', 'Error', `Failed to reset invoice settings: ${error.message}`);
          }
        }
      );
    });
  }

  // Notification Settings
  function setupNotificationSettings() {
    saveNotificationSettingsBtn.addEventListener('click', async function() {
      showLoadingOverlay();
      
      try {
        const { data: { session } } = await window.supabase.auth.getSession();
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

        const { error } = await window.supabase
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
      }
    });

    resetNotificationSettingsBtn.addEventListener('click', function() {
      showConfirmationModal(
        'Reset Notification Settings',
        'Are you sure you want to reset the notification settings to their default values?',
        async function() {
          try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session || !session.user) {
              throw new Error('No active session found');
            }

            // Fetch the original notification settings
            const { data: notificationData, error } = await window.supabase
              .from('notification_settings')
              .select('*')
              .eq('user_id', session.user.id)
              .single();

            if (error && error.code !== 'PGRST116') {
              throw error;
            }

            if (notificationData) {
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
              // Reset to default values if no settings exist
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
            }

            showToast('info', 'Reset Complete', 'Notification settings have been reset');
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

    saveSecuritySettingsBtn.addEventListener('click', async function() {
      try {
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session || !session.user) {
          throw new Error('No active session found');
        }

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

          try {
            // Update password in Supabase Auth
            const { error: passwordError } = await window.supabase.auth.updateUser({
              password: newPasswordInput.value
            });

            if (passwordError) {
              // Handle specific password update errors
              switch (passwordError.message) {
                case 'New password should be different from the old password.':
                  showToast('error', 'Password Error', 'New password must be different from your current password.');
                  break;
                case 'Password should be at least 6 characters.':
                  showToast('error', 'Password Error', 'Password must be at least 6 characters long.');
                  break;
                case 'Invalid login credentials':
                  showToast('error', 'Authentication Error', 'Current password is incorrect.');
                  break;
                default:
                  showToast('error', 'Password Error', 'Failed to update password. Please try again.');
              }
              return;
            }

            showToast('success', 'Success', 'Password updated successfully.');
          } catch (passwordError) {
            console.error('Error updating password:', passwordError);
            showToast('error', 'Password Error', 'Failed to update password. Please try again.');
            return;
          }
        }

        const securityData = {
          user_id: session.user.id,
          two_factor_enabled: twoFaToggle.checked,
          session_timeout: parseInt(sessionTimeoutInput.value),
          require_login_confirmation: requireLoginConfirmationToggle.checked
        };

        const { error } = await window.supabase
          .from('security_settings')
          .upsert(securityData, { onConflict: 'user_id' });

        if (error) {
          console.error('Error saving security settings:', error);
          showToast('error', 'Error', 'An unexpected error occurred. Please try again.');
          return;
        }

        // Update local settings
        securitySettings = {
          twoFactorEnabled: securityData.two_factor_enabled,
          sessionTimeout: securityData.session_timeout,
          requireLoginConfirmation: securityData.require_login_confirmation
        };
        
        // Reset password fields
        currentPasswordInput.value = '';
        newPasswordInput.value = '';
        confirmPasswordInput.value = '';
        passwordStrengthBar.style.width = '0%';
        passwordStrengthText.textContent = 'None';
        
        showToast('success', 'Success', 'Security settings updated successfully');
      } catch (error) {
        console.error('Error saving security settings:', error);
        showToast('error', 'Error', 'An unexpected error occurred. Please try again.');
      }
    });

    resetSecuritySettingsBtn.addEventListener('click', function() {
      showConfirmationModal(
        'Reset Security Settings',
        'Are you sure you want to reset the security settings to their default values?',
        async function() {
          try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session || !session.user) {
              throw new Error('No active session found');
            }

            // Reset to default values
            const defaultSettings = {
              user_id: session.user.id,
              two_factor_enabled: false,
              session_timeout: 30,
              require_login_confirmation: false
            };

            const { error } = await window.supabase
              .from('security_settings')
              .upsert(defaultSettings, { onConflict: 'user_id' });

            if (error) throw error;

            // Update UI
            twoFaToggle.checked = false;
            sessionTimeoutInput.value = 30;
            requireLoginConfirmationToggle.checked = false;
            currentPasswordInput.value = '';
            newPasswordInput.value = '';
            confirmPasswordInput.value = '';
            passwordStrengthBar.style.width = '0%';
            passwordStrengthText.textContent = 'None';

            // Update local settings
            securitySettings = {
              twoFactorEnabled: false,
              sessionTimeout: 30,
              requireLoginConfirmation: false
            };

            showToast('success', 'Success', 'Security settings have been reset to defaults');
          } catch (error) {
            console.error('Error resetting security settings:', error);
            showToast('error', 'Error', 'Failed to reset security settings');
          }
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

  async function loadSettingsFromStorage() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found');
      }

      // Load user settings
      const { data: userData } = await window.supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (userData) {
        userSettings = {
          name: userData.username || '',
          email: userData.email || '',
          phone: userData.phone || '',
          language: userData.language || 'pt-MZ'
        };
      }

      // Load appearance settings
      const { data: appearanceData } = await window.supabase
        .from('appearance_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (appearanceData) {
        appearanceSettings = {
          theme: appearanceData.theme || 'light',
          accentColor: appearanceData.accent_color || '#007ec7',
          fontSize: appearanceData.font_size || 'medium',
          sidebarPosition: appearanceData.sidebar_position || 'left',
          logo: appearanceData.logo_url || null
        };
      }

      // Load invoice settings
      const { data: invoiceData } = await window.supabase
        .from('invoice_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (invoiceData) {
        invoiceSettings = {
          prefix: invoiceData.content.prefix || 'FAT-',
          nextNumber: invoiceData.content.next_number || 1001,
          template: invoiceData.template || 'classic',
          color: invoiceData.content.color || '#007ec7',
          currency: invoiceData.content.currency || 'MZN',
          taxRate: invoiceData.content.tax_rate || 17,
          paymentTerms: invoiceData.content.payment_terms || 'net-30',
          notes: invoiceData.content.notes || 'Obrigado pela preferência. O pagamento deve ser efetuado no prazo de 30 dias.'
        };
      }

      // Load notification settings
      const { data: notificationData } = await window.supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (notificationData) {
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
      }

      // Load security settings
      const { data: securityData } = await window.supabase
        .from('security_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (securityData) {
        securitySettings = {
          twoFactorEnabled: securityData.two_factor_enabled,
          sessionTimeout: securityData.session_timeout || 30,
          requireLoginConfirmation: securityData.require_login_confirmation
        };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showToast('error', 'Error', 'Failed to load settings');
    }
  }

  // Initialize the application
  async function init() {
    try {
      // First fetch user settings
      await fetchUserSettings();

      // Fetch business profile and update input fields
      await loadBusinessProfileSettings();

      // Then initialize the rest
      await loadSettingsFromStorage();
      initializeSettings();
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
    } catch (error) {
      console.error('Error during initialization:', error);
      showToast('error', 'Error', 'Failed to initialize settings');
    }
  }

  // Start initialization
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

  // Display user name function
  // This function will fetch the username from the Supabase database and display it
  // in the user-displayname span element
  document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.supabase === 'undefined') return;

    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session || !session.user) return;

    let displayName = session.user.email;
    try {
      const { data: userRecord, error } = await window.supabase
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
        // Populate template options
        const templates = {
            'classic': 'Classic',
            'modern': 'Modern'
        };
        
        templateSelect.innerHTML = Object.entries(templates)
            .map(([value, label]) => `<option value="${value}">${label}</option>`)
            .join('');
        
        // Add change event listener
        templateSelect.addEventListener('change', function() {
            const selectedTemplate = this.value;
            
            // Save to Supabase
            window.invoicetemplatemanager.saveTemplateSelection(selectedTemplate);
            
            // Preview the template with the current color
            previewTemplate(selectedTemplate);
            
            // Show success message
            showToast('success', 'Template Updated', `Invoice template changed to ${templates[selectedTemplate]}`);
        });
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
      const { data, error } = await window.supabase
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
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
          showToast('error', 'Authentication Error', 'User not logged in.');
          return;
      }
      settings.user_id = session.user.id;

      const { error } = await window.supabase
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
    // Get the color from the invoice color input
    const colorInput = document.getElementById('invoice-color');
    const color = colorInput ? colorInput.value : '#007ec7';
    console.log('[Settings] previewTemplate called with:', selectedTemplate, color);
    if (window.invoicetemplatemanager && typeof window.invoicetemplatemanager.previewTemplate === 'function') {
        window.invoicetemplatemanager.previewTemplate(selectedTemplate, color);
    }
  }

  function saveTemplateSelection(selectedTemplate) {
    // Implementation of saveTemplateSelection function
    console.log(`Selected template: ${selectedTemplate}`);
  }

  // Business Profile Settings
  async function loadBusinessProfileSettings() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found');
      }

      const { data: businessProfile, error } = await window.supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      if (businessProfile) {
        businessSettings = {
          name: businessProfile.company_name || '',
          taxId: businessProfile.tax_id || '',
          address: businessProfile.address || '',
          website: businessProfile.website || '',
          email: businessProfile.email || ''
        };
        const businessNameInput = document.getElementById('business-name');
        if (!businessNameInput) console.warn('business-name input not found!');
        const taxIdInput = document.getElementById('tax-id');
        if (!taxIdInput) console.warn('tax-id input not found!');
        const businessAddressInput = document.getElementById('business-address');
        if (!businessAddressInput) console.warn('business-address input not found!');
        const businessWebsiteInput = document.getElementById('business-website');
        if (!businessWebsiteInput) console.warn('business-website input not found!');
        const businessEmailInput = document.getElementById('business-email');
        if (!businessEmailInput) console.warn('business-email input not found!');
        if (businessNameInput) businessNameInput.value = businessSettings.name;
        if (taxIdInput) taxIdInput.value = businessSettings.taxId;
        if (businessAddressInput) businessAddressInput.value = businessSettings.address;
        if (businessWebsiteInput) businessWebsiteInput.value = businessSettings.website;
        if (businessEmailInput) businessEmailInput.value = businessSettings.email;
      }
    } catch (error) {
      console.error('Error loading business profile:', error);
      showToast('Error loading business profile settings', 'error');
    }
  }

  async function saveBusinessProfileSettings() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found');
      }

      const businessProfile = {
        user_id: session.user.id,
        company_name: document.getElementById('business-name').value,
        tax_id: document.getElementById('tax-id').value,
        address: document.getElementById('business-address').value,
        website: document.getElementById('business-website').value,
        email: document.getElementById('business-email').value
      };

      const { error } = await window.supabase
        .from('business_profiles')
        .upsert(businessProfile, { onConflict: 'user_id' });

      if (error) throw error;

      showToast('Business profile settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving business profile:', error);
      showToast('Error saving business profile settings', 'error');
    }
  }

  // Appearance Settings
  async function loadAppearanceSettings() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found');
      }

      const { data: appearanceData, error } = await window.supabase
        .from('appearance_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      if (appearanceData) {
        document.getElementById('theme-selection').value = appearanceData.theme || 'light';
        document.getElementById('accent-color').value = appearanceData.accent_color || '#007ec7';
        document.getElementById('font-size').value = appearanceData.font_size || 'medium';
        document.getElementById('sidebar-position').value = appearanceData.sidebar_position || 'left';
        
        if (appearanceData.logo_url) {
          const logoPreview = document.getElementById('logo-preview-img');
          logoPreview.src = appearanceData.logo_url;
          logoPreview.style.display = 'block';
          document.querySelector('.logo-placeholder').style.display = 'none';
        }
      }
    } catch (error) {
      console.error('Error loading appearance settings:', error);
      showToast('Error loading appearance settings', 'error');
    }
  }

  async function saveAppearanceSettings() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found');
      }

      const appearanceData = {
        user_id: session.user.id,
        theme: document.getElementById('theme-selection').value,
        accent_color: document.getElementById('accent-color').value,
        font_size: document.getElementById('font-size').value,
        sidebar_position: document.getElementById('sidebar-position').value
      };

      const { error } = await window.supabase
        .from('appearance_settings')
        .upsert(appearanceData, { onConflict: 'user_id' });

      if (error) throw error;

      showToast('Appearance settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving appearance settings:', error);
      showToast('Error saving appearance settings', 'error');
    }
  }

  // Invoice Settings
  async function loadInvoiceSettings() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found');
      }

      // Fetch all fields as top-level columns
      const { data: invoiceData, error } = await window.supabase
        .from('invoice_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      if (invoiceData) {
        document.getElementById('invoice-prefix').value = invoiceData.prefix || 'INV-';
        document.getElementById('invoice-next-number').value = invoiceData.next_number || 1001;
        document.getElementById('invoice-template').value = invoiceData.template || 'classic';
        document.getElementById('invoice-color').value = invoiceData.color || '#007ec7';
        document.getElementById('invoice-color-value').textContent = invoiceData.color || '#007ec7';
        document.getElementById('default-currency').value = invoiceData.currency || 'MZN';
        document.getElementById('default-tax-rate').value = invoiceData.tax_rate || 17;
        document.getElementById('payment-terms').value = invoiceData.payment_terms || 'net-30';
        document.getElementById('invoice-notes').value = invoiceData.notes || '';
      }
    } catch (error) {
      console.error('Error loading invoice settings:', error);
      showToast('Error loading invoice settings', 'error');
    }
  }

  async function saveInvoiceSettings() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found');
      }

      // Save all fields as top-level columns
      const invoiceData = {
        user_id: session.user.id,
        prefix: invoicePrefixInput.value,
        next_number: parseInt(invoiceNextNumberInput.value),
        template: invoiceTemplateInput.value,
        color: invoiceColorInput.value,
        currency: defaultCurrencyInput.value,
        tax_rate: parseFloat(defaultTaxRateInput.value),
        payment_terms: paymentTermsInput.value,
        notes: invoiceNotesInput.value,
        updated_at: new Date().toISOString()
      };

      // Check if record exists
      const { data: existingSettings } = await window.supabase
        .from('invoice_settings')
        .select('id,created_at')
        .eq('user_id', session.user.id)
        .single();

      if (existingSettings) {
        invoiceData.created_at = existingSettings.created_at;
        await window.supabase
          .from('invoice_settings')
          .update(invoiceData)
          .eq('user_id', session.user.id);
      } else {
        invoiceData.created_at = new Date().toISOString();
        await window.supabase
          .from('invoice_settings')
          .insert([invoiceData]);
      }

      showToast('Invoice settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving invoice settings:', error);
      showToast('Error saving invoice settings', 'error');
    }
  }

  // Notification Settings
  async function loadNotificationSettings() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found');
      }

      const { data: notificationData, error } = await window.supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error) throw error;

      if (notificationData) {
        document.getElementById('notify-invoice-created').checked = notificationData.emailNotifications.invoiceCreated;
        document.getElementById('notify-payment-received').checked = notificationData.emailNotifications.paymentReceived;
        document.getElementById('notify-invoice-due').checked = notificationData.emailNotifications.invoiceDue;
        document.getElementById('notify-invoice-overdue').checked = notificationData.emailNotifications.invoiceOverdue;
        document.getElementById('notify-product-low-stock').checked = notificationData.systemNotifications.productLowStock;
        document.getElementById('notify-system-updates').checked = notificationData.systemNotifications.systemUpdates;
        document.getElementById('notify-client-activity').checked = notificationData.systemNotifications.clientActivity;
        document.getElementById('notify-login-attempts').checked = notificationData.systemNotifications.loginAttempts;
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
      showToast('Error loading notification settings', 'error');
    }
  }

  async function saveNotificationSettings() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found');
      }

      const notificationData = {
        user_id: session.user.id,
        invoice_created: document.getElementById('notify-invoice-created').checked,
        payment_received: document.getElementById('notify-payment-received').checked,
        invoice_due: document.getElementById('notify-invoice-due').checked,
        invoice_overdue: document.getElementById('notify-invoice-overdue').checked,
        product_low_stock: document.getElementById('notify-product-low-stock').checked,
        system_updates: document.getElementById('notify-system-updates').checked,
        client_activity: document.getElementById('notify-client-activity').checked,
        login_attempts: document.getElementById('notify-login-attempts').checked
      };

      const { error } = await window.supabase
        .from('notification_settings')
        .upsert(notificationData, { onConflict: 'user_id' });

      if (error) throw error;

      // Update local settings
      notificationSettings = {
        emailNotifications: {
          invoiceCreated: notificationData.emailNotifications.invoiceCreated,
          paymentReceived: notificationData.emailNotifications.paymentReceived,
          invoiceDue: notificationData.emailNotifications.invoiceDue,
          invoiceOverdue: notificationData.emailNotifications.invoiceOverdue
        },
        systemNotifications: {
          productLowStock: notificationData.systemNotifications.productLowStock,
          systemUpdates: notificationData.systemNotifications.systemUpdates,
          clientActivity: notificationData.systemNotifications.clientActivity,
          loginAttempts: notificationData.systemNotifications.loginAttempts
        }
      };

      showToast('Notification settings saved successfully', 'success');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      showToast('Error saving notification settings', 'error');
    }
  }

  // Security Settings
  async function loadSecuritySettings() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found');
      }

      const { data: securityData, error } = await window.supabase
        .from('security_settings')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (securityData) {
        twoFaToggle.checked = securityData.two_factor_enabled;
        sessionTimeoutInput.value = securityData.session_timeout || 30;
        requireLoginConfirmationToggle.checked = securityData.require_login_confirmation;

        // Update local settings
        securitySettings = {
          twoFactorEnabled: securityData.two_factor_enabled,
          sessionTimeout: securityData.session_timeout,
          requireLoginConfirmation: securityData.require_login_confirmation
        };
      } else {
        // Set default values if no settings exist
        twoFaToggle.checked = false;
        sessionTimeoutInput.value = 30;
        requireLoginConfirmationToggle.checked = false;

        // Update local settings with defaults
        securitySettings = {
          twoFactorEnabled: false,
          sessionTimeout: 30,
          requireLoginConfirmation: false
        };
      }
    } catch (error) {
      console.error('Error loading security settings:', error);
      showToast('error', 'Error', 'Failed to load security settings');
    }
  }

  async function saveSecuritySettings() {
    try {
      const { data: { session } } = await window.supabase.auth.getSession();
      if (!session || !session.user) {
        throw new Error('No active session found');
      }

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

        try {
          // Update password in Supabase Auth
          const { error: passwordError } = await window.supabase.auth.updateUser({
            password: newPasswordInput.value
          });

          if (passwordError) {
            // Handle specific password update errors
            switch (passwordError.message) {
              case 'New password should be different from the old password.':
                showToast('error', 'Password Error', 'New password must be different from your current password.');
                break;
              case 'Password should be at least 6 characters.':
                showToast('error', 'Password Error', 'Password must be at least 6 characters long.');
                break;
              case 'Invalid login credentials':
                showToast('error', 'Authentication Error', 'Current password is incorrect.');
                break;
              default:
                showToast('error', 'Password Error', 'Failed to update password. Please try again.');
            }
            return;
          }

          showToast('success', 'Success', 'Password updated successfully.');
        } catch (passwordError) {
          console.error('Error updating password:', passwordError);
          showToast('error', 'Password Error', 'Failed to update password. Please try again.');
          return;
        }
      }

      const securityData = {
        user_id: session.user.id,
        two_factor_enabled: twoFaToggle.checked,
        session_timeout: parseInt(sessionTimeoutInput.value),
        require_login_confirmation: requireLoginConfirmationToggle.checked
      };

      const { error } = await window.supabase
        .from('security_settings')
        .upsert(securityData, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving security settings:', error);
        showToast('error', 'Error', 'An unexpected error occurred. Please try again.');
        return;
      }

      // Update local settings
      securitySettings = {
        twoFactorEnabled: securityData.two_factor_enabled,
        sessionTimeout: securityData.session_timeout,
        requireLoginConfirmation: securityData.require_login_confirmation
      };
      
      // Reset password fields
      currentPasswordInput.value = '';
      newPasswordInput.value = '';
      confirmPasswordInput.value = '';
      passwordStrengthBar.style.width = '0%';
      passwordStrengthText.textContent = 'None';
      
      showToast('success', 'Success', 'Security settings updated successfully');
    } catch (error) {
      console.error('Error saving security settings:', error);
      showToast('error', 'Error', 'An unexpected error occurred. Please try again.');
    }
  }

  // Update the reset function
  function resetSecuritySettings() {
    showConfirmationModal(
      'Reset Security Settings',
      'Are you sure you want to reset the security settings to their default values?',
      async function() {
        try {
          const { data: { session } } = await window.supabase.auth.getSession();
          if (!session || !session.user) {
            throw new Error('No active session found');
          }

          // Reset to default values
          const defaultSettings = {
            user_id: session.user.id,
            two_factor_enabled: false,
            session_timeout: 30,
            require_login_confirmation: false
          };

          const { error } = await window.supabase
            .from('security_settings')
            .upsert(defaultSettings, { onConflict: 'user_id' });

          if (error) throw error;

          // Update UI
          twoFaToggle.checked = false;
          sessionTimeoutInput.value = 30;
          requireLoginConfirmationToggle.checked = false;
          currentPasswordInput.value = '';
          newPasswordInput.value = '';
          confirmPasswordInput.value = '';
          passwordStrengthBar.style.width = '0%';
          passwordStrengthText.textContent = 'None';

          // Update local settings
          securitySettings = {
            twoFactorEnabled: false,
            sessionTimeout: 30,
            requireLoginConfirmation: false
          };

          showToast('success', 'Success', 'Security settings have been reset to defaults');
        } catch (error) {
          console.error('Error resetting security settings:', error);
          showToast('error', 'Error', 'Failed to reset security settings');
        }
      }
    );
  }

  // Update the initialization code
  document.addEventListener('DOMContentLoaded', async () => {
    // ... existing initialization code ...

    // Load all settings
    await Promise.all([
      loadUserSettings(),
      loadBusinessProfileSettings(),
      loadAppearanceSettings(),
      loadInvoiceSettings(),
      loadNotificationSettings(),
      loadSecuritySettings()
    ]);

    // Add event listeners for save buttons
    document.getElementById('save-business-settings').addEventListener('click', saveBusinessProfileSettings);
    document.getElementById('save-appearance-settings').addEventListener('click', saveAppearanceSettings);
    document.getElementById('save-invoice-settings').addEventListener('click', saveInvoiceSettings);
    document.getElementById('save-notification-settings').addEventListener('click', saveNotificationSettings);
    document.getElementById('save-security-settings').addEventListener('click', saveSecuritySettings);

    // Add event listeners for reset buttons
    document.getElementById('reset-business-settings').addEventListener('click', loadBusinessProfileSettings);
    document.getElementById('reset-appearance-settings').addEventListener('click', loadAppearanceSettings);
    document.getElementById('reset-invoice-settings').addEventListener('click', loadInvoiceSettings);
    document.getElementById('reset-notification-settings').addEventListener('click', loadNotificationSettings);
    document.getElementById('reset-security-settings').addEventListener('click', resetSecuritySettings);
  });

  // Language switching logic - Updated to work with improved language manager
  document.addEventListener('DOMContentLoaded', async () => {
    // Wait for language manager to be initialized
    if (window.languageManager) {
      // The language manager is already initialized in settings.html
      // Just ensure the UI reflects the current language
      const langSelect = document.getElementById('user-language');
      if (langSelect) {
        langSelect.value = window.languageManager.currentLang;
        
        // Add change listener that works with the language manager
        langSelect.addEventListener('change', async (e) => {
          const newLang = e.target.value;
          await window.languageManager.setLanguage(newLang);
          
          // Update the select value to reflect the current language
          langSelect.value = window.languageManager.currentLang;
        });
      }
    }
  });

  // Remove the duplicate language handling code at the end
  // The language manager now handles all language synchronization
});
