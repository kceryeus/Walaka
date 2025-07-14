import { supabase } from '../services/supabaseService.js';
import { showToast, showLoadingOverlay, hideLoadingOverlay, showConfirmationModal, validateEmail, validatePhone } from '../utils/helpers.js';

export class UserProfileManager {
    constructor() {
        this.userId = null;
        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // User Profile Elements
        this.userNameDisplay = document.getElementById('user-displayname');
        this.userNameInput = document.getElementById('user-name-input');
        this.userEmailInput = document.getElementById('user-email-input');
        this.userPhoneInput = document.getElementById('user-phone');
        this.userLanguageSelect = document.getElementById('user-language');
        this.editUserSettingsBtn = document.getElementById('edit-user-settings');
        this.saveUserSettingsBtn = document.getElementById('save-user-settings');
        this.cancelUserSettingsBtn = document.getElementById('cancel-user-settings');
    }

    bindEvents() {
        this.editUserSettingsBtn.addEventListener('click', () => this.enableEditing());
        this.cancelUserSettingsBtn.addEventListener('click', () => this.cancelEditing());
        this.saveUserSettingsBtn.addEventListener('click', () => this.saveUserProfile());
    }

    async initialize(userId) {
        this.userId = userId;
        try {
            showLoadingOverlay();
            const { data: userProfile, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) throw error;
            
            this.populateForm(userProfile);
            hideLoadingOverlay();
        } catch (error) {
            console.error('Error initializing user profile:', error);
            showToast('Error loading user profile', 'error');
            hideLoadingOverlay();
        }
    }

    populateForm(userProfile) {
        this.userNameDisplay.textContent = userProfile.username || '';
        this.userNameInput.value = userProfile.username || '';
        this.userEmailInput.value = userProfile.email || '';
        this.userPhoneInput.value = userProfile.phone || '';
        this.userLanguageSelect.value = userProfile.language || 'pt-MZ';
    }

    enableEditing() {
        this.userNameInput.disabled = false;
        this.userEmailInput.disabled = false;
        this.userPhoneInput.disabled = false;
        this.userLanguageSelect.disabled = false;
        
        this.editUserSettingsBtn.style.display = 'none';
        this.saveUserSettingsBtn.style.display = 'inline-block';
        this.cancelUserSettingsBtn.style.display = 'inline-block';
    }

    cancelEditing() {
        this.userNameInput.disabled = true;
        this.userEmailInput.disabled = true;
        this.userPhoneInput.disabled = true;
        this.userLanguageSelect.disabled = true;
        
        this.editUserSettingsBtn.style.display = 'inline-block';
        this.saveUserSettingsBtn.style.display = 'none';
        this.cancelUserSettingsBtn.style.display = 'none';
        
        // Reload the current data
        this.initialize(this.userId);
    }

    async saveUserProfile() {
        // Validate inputs
        if (!this.userNameInput.value.trim()) {
            showToast('Name is required', 'error');
            return;
        }

        if (!validateEmail(this.userEmailInput.value)) {
            showToast('Please enter a valid email address', 'error');
            return;
        }

        if (this.userPhoneInput.value && !validatePhone(this.userPhoneInput.value)) {
            showToast('Please enter a valid phone number', 'error');
            return;
        }

        try {
            showLoadingOverlay();
            
            const profileData = {
                username: this.userNameInput.value.trim(),
                email: this.userEmailInput.value.trim(),
                phone: this.userPhoneInput.value.trim(),
                language: this.userLanguageSelect.value
            };

            const { error } = await supabase
                .from('users')
                .update(profileData)
                .eq('id', this.userId);

            if (error) throw error;
            
            this.userNameDisplay.textContent = profileData.username;
            this.cancelEditing();
            
            showToast('Profile updated successfully', 'success');
        } catch (error) {
            console.error('Error saving user profile:', error);
            showToast('Error updating profile', 'error');
        } finally {
            hideLoadingOverlay();
        }
    }
} 