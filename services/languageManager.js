class LanguageManager {
    constructor(basePath = '/') {
        this.basePath = basePath;
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
            const path = `${this.basePath}assets/translations/${lang}.json`;
            console.log(`[languageManager] Loading translations for:`, lang, `from ${path}`);
            const response = await fetch(path); // Use the constructed path
            this.translations = await response.json();
            this.currentLang = lang;
            localStorage.setItem('preferredLanguage', lang);
            console.log(`[languageManager] Translations loaded for:`, lang, this.translations);
        } catch (error) {
            console.error('[languageManager] Error loading translations:', error);
        }
    }

    async setLanguage(lang) {
        console.log(`[languageManager] Setting language to:`, lang);
        await this.loadTranslations(lang);
        this.applyTranslations();
        document.documentElement.setAttribute('lang', lang);
        window.dispatchEvent(new Event('languageChanged'));
        console.log(`[languageManager] Language set and translations applied:`, lang);
    }

    translate(key) {
        return this.translations[key] || key;
    }

    applyTranslations() {
        console.log('[languageManager] Applying translations for:', this.currentLang, this.translations);
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            element.textContent = this.translate(key);
        });
        document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            element.placeholder = this.translate(key);
        });
        console.log('[languageManager] Translations applied for:', this.currentLang);
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

// window.languageManager = new LanguageManager();
// export default window.languageManager;
