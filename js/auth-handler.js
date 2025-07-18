import { supabase } from './supabaseClient.js';

// Simple auth state listener that handles all redirects
supabase.auth.onAuthStateChange((event, session) => {
    const repoName = 'Walaka';
    const isGitHubPages = window.location.hostname.includes('github.io');
    const basePath = isGitHubPages ? `/${repoName}/` : '/';
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('login.html');

    if (event === 'SIGNED_OUT' || !session) {
        if (!isLoginPage) {
            window.location.href = basePath + 'login.html';
        }
    } else if (isLoginPage && event === 'SIGNED_IN') {
        window.location.href = basePath + 'dashboard.html';
    }
});

// Utility function to check if user is authenticated
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

// Utility function to get current user
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Utility function to handle sign out
export async function signOut() {
    await supabase.auth.signOut();
}
