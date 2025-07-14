/**
 * Language Toggle Module
 * Handles language switching for the WALAKA ERP system
 */

/**
 * Toggle the application language
 * @param {string} lang - The language code to switch to ('en' or 'pt')
 */
function toggleLanguage(lang) {
    // Update active language button
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.lang-btn[data-lang="${lang}"]`).classList.add('active');
    
    // Show elements with the selected language
    showSelectedLanguageElements(lang);
    
    // Save preference to local storage
    localStorage.setItem('waLangPreference', lang);
}

/**
 * Show only elements with the selected language
 * @param {string} lang - The language code ('en' or 'pt')
 */
function showSelectedLanguageElements(lang) {
    // Hide all language-specific elements
    document.querySelectorAll('[data-lang]').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show elements for the selected language
    document.querySelectorAll(`[data-lang="${lang}"]`).forEach(el => {
        // Check if element is a block element or should be displayed as something else
        if (el.tagName === 'SPAN' && el.parentElement.tagName === 'BUTTON') {
            el.style.display = 'inline-flex';
        } else if (el.tagName === 'SPAN' && el.parentElement.classList.contains('plan-price')) {
            el.style.display = 'inline';
        } else if (el.tagName === 'SPAN' && el.parentElement.tagName === 'LABEL') {
            el.style.display = 'flex';
        } else if (el.tagName === 'SPAN' && el.parentElement.classList.contains('detail-label')) {
            el.style.display = 'inline';
        } else if (el.tagName === 'OPTION') {
            el.style.display = 'block';
        } else if (el.tagName === 'LABEL') {
            el.style.display = 'block';
        } else if (el.tagName === 'BUTTON') {
            el.style.display = 'inline-flex';
        } else if (el.tagName === 'LI') {
            el.style.display = 'flex';
        } else {
            el.style.display = 'block';
        }
    });
}

/**
 * Initialize the language system
 */
function initLanguage() {
    // Set default language or use stored preference
    const storedLang = localStorage.getItem('waLangPreference') || 'en';
    toggleLanguage(storedLang);
    
    // Add event listeners to language toggle buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const lang = this.getAttribute('data-lang');
            toggleLanguage(lang);
        });
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initLanguage);
