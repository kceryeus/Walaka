class LanguageManager {
    constructor() {
        this.currentLang = localStorage.getItem('preferredLanguage') || 'pt';
        this.translations = {};
    }

    async init() {
        await this.loadTranslations(this.currentLang);
        this.applyTranslations();
    }

    async loadTranslations(lang) {
        try {
            const response = await fetch(`/assets/translations/${lang}.json`);
            this.translations = await response.json();
        } catch (error) {
            console.error('Error loading translations:', error);
        }
    }

    async setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('preferredLanguage', lang);
        await this.loadTranslations(lang);
        this.applyTranslations();
        document.documentElement.setAttribute('lang', lang);
    }

    translate(key) {
        return this.translations[key] || key;
    }

    applyTranslations() {
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            element.textContent = this.translate(key);
        });

        document.querySelectorAll('[data-translate-placeholder]').forEach(element => {
            const key = element.getAttribute('data-translate-placeholder');
            element.placeholder = this.translate(key);
        });
    }
}

const langManager = new LanguageManager();
export default langManager;
