// Authentication utilities
// import { supabase } from './supabaseClient.js';
const supabase = window.supabase;

export const auth = {
    // Check if user is authenticated
    async checkAuth() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            return !!session;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
    },

    // Handle logout
    async logout() {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Failed to sign out. Please try again.');
        }
    },

    // Protect page from unauthorized access
    async protectPage() {
        const isAuthenticated = await this.checkAuth();
        if (!isAuthenticated) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    },

    // Initialize auth listeners and protection
    async init() {
        // Check authentication status
        await this.protectPage();

        // Set up auth state change listener
        supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                window.location.href = '/login.html';
            }
        });

        // Set up logout handler if logout link exists
        const logoutLink = document.querySelector('#userDropdown a[href="#"]:last-child');
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.logout();
            });
        }
    }
};

// Initialize auth when the page loads
document.addEventListener('DOMContentLoaded', () => {
    auth.init();
}); 