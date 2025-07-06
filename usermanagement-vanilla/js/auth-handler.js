// Basic authentication handler
// Use the global Supabase client instead of creating a new one

class AuthHandler {
    constructor() {
        this.user = null;
        // Don't setup auth state change immediately - wait for Supabase to be available
    }

    async initialize() {
        try {
            // Use the global Supabase client
            if (!window.supabase) {
                console.error('Global Supabase client not available');
                return false;
            }
            
            if (!window.supabase.auth) {
                console.error('Supabase auth not available');
                return false;
            }
            
            // Setup auth state change listener now that Supabase is available
            this.setupAuthStateChange();
            
            const { data: { session }, error } = await window.supabase.auth.getSession();
            if (error) {
                console.error('Error getting session:', error);
                // Don't redirect immediately, just log the error
                return false;
            }
            
            this.user = session?.user || null;
            
            // Log the authentication status but don't redirect
            if (this.user) {
                console.log('User authenticated:', this.user.email);
                return true;
            } else {
                console.log('No user session found, but not redirecting');
                return false;
            }
        } catch (error) {
            console.error('Auth error:', error);
            return false;
        }
    }

    setupAuthStateChange() {
        if (!window.supabase) {
            console.error('Global Supabase client not available');
            return;
        }
        
        if (!window.supabase.auth) {
            console.error('Supabase auth not available');
            return;
        }
        
        try {
            window.supabase.auth.onAuthStateChange((event, session) => {
                this.user = session?.user || null;
                if (event === 'SIGNED_OUT') {
                    console.log('User signed out, but not redirecting immediately');
                    // Don't redirect immediately, just log the event
                }
            });
        } catch (error) {
            console.error('Error setting up auth state change:', error);
        }
    }

    getCurrentUser() {
        return this.user;
    }
}

const authHandler = new AuthHandler();
export default authHandler;
