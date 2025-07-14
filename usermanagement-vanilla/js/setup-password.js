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

console.log('[DEBUG] setup-password.js script loaded');
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[DEBUG] DOMContentLoaded fired');
    // Always log device time for debugging (moved to top)
    const now = Math.floor(Date.now() / 1000);
    console.log('==============================');
    console.log('[DEBUG] Device current time (epoch):', now, '- (ISO):', new Date(now * 1000).toISOString());
    console.log('==============================');
    const form = document.getElementById('passwordSetupForm');
    const errorMessage = document.getElementById('errorMessage');

    // Log the current URL
    console.log('[DEBUG] window.location.href:', window.location.href);

    // Get the access token from the URL (query string or hash fragment)
    let params = new URLSearchParams(window.location.search);
    if (!params.has('access_token')) {
        // Try hash fragment
        if (window.location.hash && window.location.hash.length > 1) {
            params = new URLSearchParams(window.location.hash.substring(1));
            console.log('[DEBUG] Parsed URLSearchParams from hash:', Array.from(params.entries()));
        }
    }
    console.log('[DEBUG] All URLSearchParams:', Array.from(params.entries()));
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (!accessToken) {
        console.warn('[DEBUG] access_token is missing from URL parameters!');
        showError('Invalid or expired invitation link');
        return;
    }

    // Debug: Log JWT and device time for clock skew (expecting port 3000)
    if (accessToken) {
        try {
            const jwt = accessToken.split('.')[1];
            const decoded = JSON.parse(atob(jwt.replace(/-/g, '+').replace(/_/g, '/')));
            const iat = decoded.iat;
            const exp = decoded.exp;
            const now = Math.floor(Date.now() / 1000);
            console.log('[DEBUG] JWT issued at (iat):', iat, '-', new Date(iat * 1000).toISOString());
            console.log('[DEBUG] JWT expires at (exp):', exp, '-', new Date(exp * 1000).toISOString());
            console.log('[DEBUG] Device current time:', now, '-', new Date(now * 1000).toISOString());
            if (now < iat) {
                console.warn('[DEBUG] Device time is behind JWT issued-at time by', iat - now, 'seconds');
            }
        } catch (err) {
            console.warn('[DEBUG] Could not decode JWT for clock skew check:', err);
        }
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