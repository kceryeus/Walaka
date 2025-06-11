import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Initialize Supabase client with consistent configuration
const supabaseUrl = 'https://qvmtozjvjflygbkjecyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo';

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
});

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
        }        try {
            // Initialize session with the reset token
            const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });

            if (sessionError) throw sessionError;

            // Get current session to verify user
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session found');

            // Update the user's password in auth
            const { error: updateError } = await supabase.auth.updateUser({
                password: password
            });

            if (updateError) throw updateError;

            // Record password change in database
            const { error: dbError } = await supabase
                .from('user_security_events')
                .insert([{
                    user_id: session.user.id,
                    event_type: 'password_reset',
                    created_at: new Date().toISOString(),
                    ip_address: null, // Could be implemented with a server-side function
                    user_agent: navigator.userAgent
                }]);

            if (dbError && dbError.code !== '42P01') { // Ignore if table doesn't exist
                console.error('Error logging security event:', dbError);
            }

            // Redirect to login page with success message
            window.location.href = '/login.html?message=password-set-success';
        } catch (error) {
            console.error('Error setting password:', error);
            showError(error.message || 'An error occurred while setting your password');
        }
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }
}); 