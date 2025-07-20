import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Replace these with your actual Supabase project URL and public anon key
const supabaseUrl = 'https://qvmtozjvjflygbkjecyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo';

const supabase = createClient(supabaseUrl, supabaseKey);

export { supabase, supabaseUrl, supabaseKey };

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
async function signUp(email, password) {
    const { user, session, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });

    if (error) {
        console.error('Error signing up:', error);
    } else {
        console.log('User signed up:', user);
        console.log('Session:', session);
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

// Centralized auth check for all protected pages
export async function requireAuth() {
    try {
        const repoName = 'Walaka';
        const isGitHubPages = window.location.hostname.includes('github.io');
        const basePath = isGitHubPages ? `/${repoName}/` : '/';
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !session.user) {
            window.location.href = basePath + 'login.html';
            throw new Error('Not authenticated');
        }
        return session;
    } catch (error) {
        const repoName = 'Walaka';
        const isGitHubPages = window.location.hostname.includes('github.io');
        const basePath = isGitHubPages ? `/${repoName}/` : '/';
        window.location.href = basePath + 'login.html';
        throw error;
    }
}

