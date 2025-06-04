// Centralized Supabase client configuration
const SUPABASE_URL = 'https://qvmtozjvjflygbkjecyj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo';

// Initialize Supabase client with consistent settings
const supabase = window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'supabase-auth-token'
    }
});

// Simple auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
        window.location.href = '/login.html';
    }
});

// Export for use in other files
export { supabase };
