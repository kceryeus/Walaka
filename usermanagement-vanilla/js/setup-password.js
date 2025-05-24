const supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('passwordSetupForm');
    const errorMessage = document.getElementById('errorMessage');

    // Get the access token from the URL
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (!accessToken) {
        showError('Invalid or expired invitation link');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const password = form.password.value;
        const confirmPassword = form.confirmPassword.value;

        // Validate passwords
        if (password.length < 8) {
            showError('Password must be at least 8 characters long');
            return;
        }

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        try {
            // Set the session using the tokens from the URL
            const { error: sessionError } = await supabaseClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (sessionError) throw sessionError;

            // Update the user's password
            const { error: updateError } = await supabaseClient.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            // Redirect to the login page or dashboard
            window.location.href = '/login.html?message=password-set-success';
        } catch (error) {
            console.error('Error setting password:', error);
            showError(error.message);
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
}); 