// Authentication utilities
// import { supabase } from './supabaseClient.js';

const auth = {
    // Check if user is authenticated
    async checkAuth() {
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            return !!session;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
    },

    // Handle logout
    async logout() {
        try {
            const { error } = await window.supabase.auth.signOut();
            if (error) throw error;
            const repoName = 'Walaka';
            const isGitHubPages = window.location.hostname.includes('github.io');
            const basePath = isGitHubPages ? `/${repoName}/` : '/';
            window.location.href = basePath + 'login.html';
        } catch (error) {
            console.error('Error signing out:', error);
            alert('Failed to sign out. Please try again.');
        }
    },

    // Protect page from unauthorized access
    async protectPage() {
        const isAuthenticated = await this.checkAuth();
        if (!isAuthenticated) {
            // window.location.href = '/login.html';
            console.log('[auth.js] Would redirect to /login.html: not authenticated');
            return false;
        }
        return true;
    },

    // Initialize auth listeners and protection
    async init() {
        // Check authentication status
        await this.protectPage();

        // Set up auth state change listener
        window.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || !session) {
                // window.location.href = '/login.html';
                console.log(`[auth.js] Would redirect to /login.html: event = ${event}, session =`, session);
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
window.auth = auth;

// Initialize auth when the page loads
function waitForSupabaseClient(callback) {
    if (window.supabase) {
        callback();
    } else {
        setTimeout(() => waitForSupabaseClient(callback), 50);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    waitForSupabaseClient(() => {
        auth.init();
    });
}); 