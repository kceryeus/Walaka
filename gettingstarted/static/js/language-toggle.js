/**
 * Language Toggle Module
 * Manages the language switching functionality for the WALAKA ERP System
 */

// Store the current language
let currentLanguage = 'en';

/**
 * Toggle the application language
 * @param {string} lang - The language code to switch to ('en' or 'pt')
 */
function toggleLanguage(lang) {
    // Update the current language
    currentLanguage = lang;
    
    // Add the language class to the body
    document.body.classList.remove('language-en', 'language-pt');
    document.body.classList.add(`language-${lang}`);
    
    // Set active state for language buttons
    document.querySelectorAll('.language-toggle button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(`lang-${lang}`).classList.add('active');
    
    // Show only elements with the selected language
    showSelectedLanguageElements(lang);
    
    // Store the selected language in localStorage
    localStorage.setItem('walaka_language', lang);
}

/**
 * Show only elements with the selected language
 * @param {string} lang - The language code ('en' or 'pt')
 */
function showSelectedLanguageElements(lang) {
    // Hide all language elements
    document.querySelectorAll('[data-lang]').forEach(el => {
        // For elements that are language containers
        if (el.getAttribute('data-lang') === 'en' || el.getAttribute('data-lang') === 'pt') {
            el.style.display = el.getAttribute('data-lang') === lang ? '' : 'none';
        }
    });

    // Special case for form placeholders and options
    document.querySelectorAll('input[placeholder][data-en], input[placeholder][data-pt]').forEach(input => {
        input.placeholder = input.dataset[lang] || '';
    });

    document.querySelectorAll('option[data-en], option[data-pt]').forEach(option => {
        if (option.dataset[lang]) {
            option.textContent = option.dataset[lang];
        }
    });
}

/**
 * Initialize the language system
 */
function initLanguage() {
    // Get the stored language or default to 'en'
    const storedLanguage = localStorage.getItem('walaka_language') || 'en';
    
    // Set the initial language
    toggleLanguage(storedLanguage);

    // Add click handlers to language toggle buttons
    document.querySelectorAll('.language-toggle button').forEach(button => {
        button.addEventListener('click', () => {
            const lang = button.id.replace('lang-', '');
            toggleLanguage(lang);
        });
    });
}

// Initialize language system when DOM is loaded
document.addEventListener('DOMContentLoaded', initLanguage);

// Export functions for use in other modules
window.wakaLanguage = {
    toggle: toggleLanguage,
    getCurrent: () => currentLanguage
};
