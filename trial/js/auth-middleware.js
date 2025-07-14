// Simple auth middleware
import { supabase } from '../../js/supabaseClient.js';

export async function initializeAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (!session) {
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Error initializing auth:', error);
        window.location.href = '/login.html';
    }
}

// Export simplified auth check function
export async function checkAuth() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return !!session;
    } catch (error) {
        console.error('Auth check failed:', error);
        return false;
    }
}

// Initialize auth when the script loads
if (typeof window !== 'undefined') {
    window.addEventListener('load', initializeAuth);
}
