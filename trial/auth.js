import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qvmtozjvjflygbkjecyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Example function to sign in a user
async function signIn(email, password) {
    const { user, session, error } = await supabase.auth.signIn({
        email: email,
        password: password,
    });

    if (error) {
        console.error('Error signing in:', error);
    } else {
        console.log('User signed in:', user);
        console.log('Session:', session);
    }
}

// Example function to sign up a new user
async function signUp(email, password, username = '') {
    try {
        const response = await fetch('/functions/create-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + supabaseKey
            },
            body: JSON.stringify({
                email,
                password,
                username: username || email.split('@')[0],
                role: 'user'
            })
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to create user');
        }

        console.log('User signed up:', result);
        return result;
    } catch (error) {
        console.error('Error signing up:', error);
        throw error;
    }
}

// Example function to sign out the current user
async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        console.error('Error signing out:', error);
    } else {
        console.log('User signed out');
    }
}

async function initUser(userId) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .update({
                trial_start_date: new Date().toISOString().split('T')[0],
                invoices_created: 0 
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Error initializing user trial:', error);
        throw error;
    }
}

async function initializeUserTrial(userId) {
    try {
        const now = new Date();
        const trialEndDate = new Date(now);
        trialEndDate.setDate(trialEndDate.getDate() + 14);

        const { data, error } = await supabase
            .from('user_trials')
            .insert([{
                user_id: userId,
                trial_start_date: now.toISOString(),
                trial_end_date: trialEndDate.toISOString(),
                invoices_created_count: 0,
                max_free_invoices: 5,
                is_active_trial: true,
                plan_status: 'trial'
            }])
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error initializing trial:', error);
        throw error;
    }
}

async function checkTrialStatus(userId) {
    try {
        let { data: trial, error } = await supabase
            .from('user_trials')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error && error.code === 'PGRST116') {
            // Trial record doesn't exist, create it
            trial = await initializeTrialUser(userId);
        } else if (error) {
            throw error;
        }

        const now = new Date();
        const trialEnd = new Date(trial.trial_end_date);
        const daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
        const invoicesLeft = Math.max(0, trial.max_invoices - trial.invoices_created);

        return {
            canCreate: trial.is_active && now < trialEnd && trial.invoices_created < trial.max_invoices,
            daysLeft,
            invoicesLeft,
            isExpired: now > trialEnd || trial.invoices_created >= trial.max_invoices,
            unlimited: false
        };
    } catch (error) {
        console.error('Error checking trial status:', error);
        throw error;
    }
}

async function incrementInvoiceCount(userId) {
    try {
        const { error } = await supabase
            .from('user_trials')
            .update({ 
                invoices_created: supabase.raw('invoices_created + 1')
            })
            .eq('user_id', userId);

        if (error) throw error;
    } catch (error) {
        console.error('Error incrementing invoice count:', error);
        throw error;
    }
}

// Add DEV_MODE check to requireAuth
const isDevelopmentMode = () => localStorage.getItem('devMode') === 'true';

async function requireAuth() {
    if (isDevelopmentMode()) {
        console.log('Development mode: Bypassing authentication');
        return true;
    }

    try {
        const { data: { user }, error } = await supabase.auth.getSession();
        if (error || !user) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
        return false;
    }
}

// Add DEV_MODE check to checkAuthState
async function checkAuthState() {
    if (isDevelopmentMode()) {
        console.log('Development mode: Skipping auth check');
        return;
    }

    // ...existing auth check code...
}

// Make functions globally available
window.checkTrialStatus = checkTrialStatus;
window.incrementInvoiceCount = incrementInvoiceCount;
window.initializeTrialUser = initializeTrialUser;

// Handle user signup
document.addEventListener('DOMContentLoaded', function() {
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            try {
                const { data: { user }, error } = await supabase.auth.signUp({
                    email: this.email.value,
                    password: this.password.value
                });

                if (error) throw error;

                // Initialize trial for new user
                await initializeTrialUser(user.id);
                
                window.location.href = '/dashboard.html';
            } catch (error) {
                console.error('Signup error:', error);
                alert('Error during signup: ' + error.message);
            }
        });
    }
});

window.checkTrialStatus = checkTrialStatus; // Make available globally
window.incrementInvoiceCount = incrementInvoiceCount; // Make available globally

// Remove Supabase initialization since we're using the shared instance

async function checkAuth() {
    try {
        const { data: { session }, error } = await window.supabase.auth.getSession();
        console.log('Auth check result:', { session, error });
        
        if (error) throw error;
        if (!session) {
            window.location.href = '/login.html';
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Auth check failed:', error);
        window.location.href = '/login.html';
        return false;
    }
}

// Handle logout
async function handleLogout() {
    try {
        const { error } = await window.supabase.auth.signOut();
        if (error) throw error;
        window.location.href = '/login.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// Export functions
export {
    signIn,
    signUp,
    signOut,
    initUser,
    initializeUserTrial,
    checkTrialStatus,
    incrementInvoiceCount,
    requireAuth,
    checkAuthState,
    checkAuth,
    handleLogout
};

