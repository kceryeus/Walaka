class SettingsManager {
    constructor() {
        this.settings = {
            invoice: {
                prefix: 'INV-',
                nextNumber: 1001,
                template: 'template1',
                color: '#007ec7',
                currency: 'EUR',
                taxRate: 23,
                paymentTerms: 'net-30',
                notes: 'Thank you for your business.'
            },
            appearance: {
                logo: null,
                theme: 'light',
                accentColor: '#007ec7',
                fontSize: 'medium'
            }
        };
        this.listeners = [];
    }

    async init() {
        // Load from localStorage or backend
        const storedSettings = localStorage.getItem('appSettings');
        if (storedSettings) {
            this.settings = JSON.parse(storedSettings);
        }
    }

    getInvoiceSettings() {
        return this.settings.invoice;
    }

    getAppearanceSettings() {
        return this.settings.appearance;
    }

    async updateInvoiceSettings(settings) {
        this.settings.invoice = { ...this.settings.invoice, ...settings };
        await this.saveSettings();
        this.notifyListeners('invoice');
    }

    async updateAppearanceSettings(settings) {
        this.settings.appearance = { ...this.settings.appearance, ...settings };
        await this.saveSettings();
        this.notifyListeners('appearance');
    }

    async saveSettings() {
        localStorage.setItem('appSettings', JSON.stringify(this.settings));
        // Here you could also save to backend
    }

    addListener(callback) {
        this.listeners.push(callback);
    }

    notifyListeners(type) {
        this.listeners.forEach(callback => callback(type, this.settings));
    }
}

export const settingsManager = new SettingsManager();
