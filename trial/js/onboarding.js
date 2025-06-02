let currentStep = 1;
const totalSteps = 4;

async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login.html';
        return;
    }
    return session;
}

async function nextStep(step) {
    if (step < totalSteps) {
        if (await validateStep(step)) {
            hideStep(step);
            showStep(step + 1);
            updateProgress(step + 1);
            currentStep = step + 1;
        }
    }
}

function prevStep(step) {
    if (step > 1) {
        hideStep(step);
        showStep(step - 1);
        updateProgress(step - 1);
        currentStep = step - 1;
    }
}

async function validateStep(step) {
    const session = await checkAuth();
    if (!session) return false;

    switch(step) {
        case 1:
            return true;
        case 2:
            return validateCompanyInfo();
        case 3:
            return validateDocumentSetup();
        case 4:
            return validateSubscription();
        default:
            return false;
    }
}

async function completeSetup() {
    try {
        const session = await checkAuth();
        if (!session) return;

        const userData = collectUserData();
        
        // Save all collected data
        const { error } = await supabase
            .from('user_settings')
            .insert([userData]);

        if (error) throw error;

        // Mark onboarding as complete
        await supabase
            .from('profiles')
            .update({ onboarding_completed: true })
            .eq('user_id', session.user.id);

        // Redirect to dashboard
        window.location.href = '/dashboard.html';

    } catch (error) {
        console.error('Setup completion failed:', error);
        showNotification('Error completing setup');
    }
}

// ... Helper functions ...

document.addEventListener('DOMContentLoaded', async () => {
    const session = await checkAuth();
    if (session) {
        // Initialize forms and event listeners
        setupFormHandlers();
        loadIndustryOptions();
        loadTemplateOptions();
        loadSubscriptionPlans();
    }
});
