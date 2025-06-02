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

// Language toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const langButtons = document.querySelectorAll('.lang-btn');
    const defaultLang = 'en';
    let currentLang = localStorage.getItem('selectedLanguage') || defaultLang;

    // Initialize language
    setActiveLanguage(currentLang);

    // Add click event listeners to language buttons
    langButtons.forEach(button => {
        button.addEventListener('click', function() {
            const lang = this.dataset.lang;
            setActiveLanguage(lang);
            localStorage.setItem('selectedLanguage', lang);
        });
    });
});

// Set active language
function setActiveLanguage(lang) {
    // Update language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Update all elements with data-lang attribute
    document.querySelectorAll('[data-lang]').forEach(element => {
        if (element.dataset.lang === lang) {
            element.style.display = 'block';
        } else {
            element.style.display = 'none';
        }
    });

    // Update document language
    document.documentElement.setAttribute('lang', lang);

    // Update form placeholders and labels
    updateFormElements(lang);
}

// Update form elements based on language
function updateFormElements(lang) {
    const translations = {
        en: {
            'org-name': 'Organization Name',
            'org-industry': 'Select Industry',
            'org-location': 'Location',
            'org-address': 'Address',
            'org-tax-id': 'Tax ID / NUIT',
            'org-currency': 'Currency',
            'payment-terms': 'Default Payment Terms',
            'invoice-notes': 'Default Invoice Notes (Optional)',
            'mobile-number': 'Mobile Number'
        },
        pt: {
            'org-name': 'Nome da Organização',
            'org-industry': 'Selecione a Indústria',
            'org-location': 'Localização',
            'org-address': 'Endereço',
            'org-tax-id': 'ID Fiscal / NUIT',
            'org-currency': 'Moeda',
            'payment-terms': 'Condições de Pagamento Padrão',
            'invoice-notes': 'Notas Padrão da Fatura (Opcional)',
            'mobile-number': 'Número de Celular'
        }
    };

    // Update input placeholders
    Object.keys(translations[lang]).forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.placeholder = translations[lang][id];
        }
    });

    // Update select options
    const industrySelect = document.getElementById('org-industry');
    if (industrySelect) {
        const options = {
            en: {
                retail: 'Retail',
                manufacturing: 'Manufacturing',
                services: 'Services',
                technology: 'Technology',
                healthcare: 'Healthcare',
                education: 'Education',
                other: 'Other'
            },
            pt: {
                retail: 'Varejo',
                manufacturing: 'Fabricação',
                services: 'Serviços',
                technology: 'Tecnologia',
                healthcare: 'Saúde',
                education: 'Educação',
                other: 'Outro'
            }
        };

        Array.from(industrySelect.options).forEach(option => {
            if (option.value && options[lang][option.value]) {
                option.text = options[lang][option.value];
            }
        });
    }

    // Update payment terms options
    const paymentTermsSelect = document.getElementById('payment-terms');
    if (paymentTermsSelect) {
        const terms = {
            en: {
                due_on_receipt: 'Due on Receipt',
                net_15: 'Net 15',
                net_30: 'Net 30',
                net_45: 'Net 45',
                net_60: 'Net 60'
            },
            pt: {
                due_on_receipt: 'Vencimento no Recebimento',
                net_15: 'Líquido 15',
                net_30: 'Líquido 30',
                net_45: 'Líquido 45',
                net_60: 'Líquido 60'
            }
        };

        Array.from(paymentTermsSelect.options).forEach(option => {
            if (option.value && terms[lang][option.value]) {
                option.text = terms[lang][option.value];
            }
        });
    }
}
