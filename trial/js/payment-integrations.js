const PAYMENT_GATEWAYS = {
    EMOLA: {
        name: 'E-MOLA',
        icon: 'fas fa-mobile-alt',
        fields: ['merchantId', 'phoneNumber']
    },
    MPESA: {
        name: 'M-PESA',
        icon: 'fas fa-mobile',
        fields: ['apiKey', 'phoneNumber']
    },
    BCI: {
        name: 'BCI',
        icon: 'fas fa-university',
        fields: ['accountNumber', 'nib', 'accountName']
    },
    BIM: {
        name: 'BIM',
        icon: 'fas fa-university',
        fields: ['accountNumber', 'nib', 'accountName']
    },
    FNB: {
        name: 'FNB',
        icon: 'fas fa-university',
        fields: ['accountNumber', 'branchCode', 'accountName']
    },
    MOZA: {
        name: 'MOZA',
        icon: 'fas fa-university',
        fields: ['accountNumber', 'nib', 'accountName']
    }
};

class PaymentGatewayManager {
    constructor() {
        this.paymentMethods = new Map();
    }

    async initializeGateways() {
        const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('user_id', getCurrentUserId());

        if (error) throw error;
        
        data.forEach(method => {
            this.paymentMethods.set(method.gateway, method);
        });
    }

    async savePaymentMethod(gateway, details) {
        const { data, error } = await supabase
            .from('payment_methods')
            .upsert([{
                user_id: getCurrentUserId(),
                gateway,
                details,
                active: true
            }]);

        if (error) throw error;
        return data;
    }
}
