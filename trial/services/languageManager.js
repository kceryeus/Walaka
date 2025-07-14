class LanguageManager {
    constructor() {
        this.currentLang = 'pt-MZ';
        this.fallbackLang = 'pt-PT';
        
        this.locales = {
            'pt-MZ': {
                name: 'Português (Moçambique)',
                currency: 'MZN',
                currencySymbol: 'MT',
                dateFormat: 'DD/MM/YYYY',
                thousandsSeparator: '.',
                decimalSeparator: ',',
                taxName: 'IVA'
            },
            'pt-PT': {
                name: 'Português (Portugal)',
                currency: 'EUR',
                currencySymbol: '€',
                dateFormat: 'DD/MM/YYYY',
                thousandsSeparator: '.',
                decimalSeparator: ',',
                taxName: 'IVA'
            }
        };
    }

    getLocale() {
        return this.locales[this.currentLang] || this.locales[this.fallbackLang];
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

export const languageManager = new LanguageManager();
