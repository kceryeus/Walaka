class LanguageManager {
    constructor() {
        this.currentLang = localStorage.getItem('preferredLanguage') || 'pt';
        this.translations = {};
        this.locales = {
            'pt': {
                name: 'Português',
                currency: 'MZN',
                currencySymbol: 'MT',
                dateFormat: 'DD/MM/YYYY',
                thousandsSeparator: '.',
                decimalSeparator: ',',
                taxName: 'IVA'
            },
            'en': {
                name: 'English',
                currency: 'USD',
                currencySymbol: '$',
                dateFormat: 'MM/DD/YYYY',
                thousandsSeparator: ',',
                decimalSeparator: '.',
                taxName: 'VAT'
            }
        };
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`assets/translations/${lang}.json`); // Use the selected language
            this.translations = await response.json();
            this.currentLang = lang;
            localStorage.setItem('preferredLanguage', lang);
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    async setLanguage(lang) {
        await this.loadTranslations(lang);
        this.applyTranslations();
        document.documentElement.setAttribute('lang', lang);
        window.dispatchEvent(new Event('languageChanged'));
    }

    translate(key) {
        return this.translations[key] || key;
    }

    applyTranslations() {
        console.log('Applying translations for:', this.currentLang, this.translations);
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            element.textContent = this.translate(key);
        });
        document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            element.placeholder = this.translate(key);
        });
    }

    getLocale() {
        return this.locales[this.currentLang] || this.locales['pt'];
    }

    formatNumber(number, decimals = 2) {
        const locale = this.getLocale();
        return number.toLocaleString(this.currentLang, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    formatCurrency(amount) {
        const locale = this.getLocale();
        return amount.toLocaleString(this.currentLang, {
            style: 'currency',
            currency: locale.currency
        });
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString(this.currentLang);
    }
}

window.languageManager = new LanguageManager();
export default window.languageManager;
