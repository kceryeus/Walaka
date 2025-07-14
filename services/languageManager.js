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
            // console.log(`[languageManager] Loading translations for:`, lang, `from ${path}`);
            const response = await fetch(path); // Use the constructed path
            this.translations = await response.json();
            this.currentLang = lang;
            localStorage.setItem('preferredLanguage', lang);
            // console.log(`[languageManager] Translations loaded for:`, lang, this.translations);
        } catch (error) {
            console.error('[languageManager] Error loading translations:', error);
        }
    }

    async setLanguage(lang) {
        // console.log(`[languageManager] Setting language to:`, lang);
        await this.loadTranslations(lang);
        this.applyTranslations();
        document.documentElement.setAttribute('lang', lang);
        // Save to database if user is authenticated
        await this.saveLanguageToDatabase(lang);
        window.dispatchEvent(new Event('languageChanged'));
        // console.log(`[languageManager] Language set and translations applied:`, lang);
    }

    async saveLanguageToDatabase(lang) {
        try {
            if (window.supabase) {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session && session.user) {
                    const { error } = await window.supabase
                        .from('users')
                        .update({ 
                            language: lang,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', session.user.id);

                    if (error) {
                        console.error('[languageManager] Error saving language to database:', error);
                    } else {
                        // console.log('[languageManager] Language saved to database:', lang);
                    }
                }
            }
        } catch (error) {
            console.error('[languageManager] Error in saveLanguageToDatabase:', error);
        }
    }

    async loadLanguageFromDatabase() {
        try {
            if (window.supabase) {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session && session.user) {
                    const { data: userData, error } = await window.supabase
                        .from('users')
                        .select('language')
                        .eq('id', session.user.id)
                        .single();

                    if (error) {
                        console.error('[languageManager] Error loading language from database:', error);
                        return this.currentLang;
                    }

                    if (userData && userData.language) {
                        // console.log('[languageManager] Language loaded from database:', userData.language);
                        return userData.language;
                    }
                }
            }
        } catch (error) {
            console.error('[languageManager] Error in loadLanguageFromDatabase:', error);
        }
        return this.currentLang;
    }

    async initialize() {
        // console.log('[languageManager] Initializing language manager...');
        // First try to load from database (if user is authenticated)
        const dbLanguage = await this.loadLanguageFromDatabase();
        // Use database language if available, otherwise use localStorage
        const preferredLanguage = dbLanguage || localStorage.getItem('preferredLanguage') || 'pt';
        // console.log('[languageManager] Preferred language:', preferredLanguage);
        // Set the language
        await this.setLanguage(preferredLanguage);
        // console.log('[languageManager] Language manager initialized');
    }

    replaceVariables(str, variables = {}) {
        if (!str) return str;
        return str.replace(/\{(\w+)\}/g, (match, key) => variables[key] !== undefined ? variables[key] : match);
    }

    translate(key, variables = {}) {
        const str = this.translations[key] || key;
        return this.replaceVariables(str, variables);
    }

    applyTranslations(variables = {}) {
        // console.log('[languageManager] Applying translations for:', this.currentLang, this.translations);
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            element.textContent = this.translate(key, variables);
        });
        document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            element.placeholder = this.translate(key, variables);
        });
        // console.log('[languageManager] Translations applied for:', this.currentLang);
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

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageManager;
}
// window.languageManager = new LanguageManager();
// export default window.languageManager;
