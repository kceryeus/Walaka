// Session state management and middleware
let currentSession = null;
let refreshTimer = null;
let sessionTimeoutWarning = null;

const SESSION_CHECK_INTERVAL = 1 * 60 * 1000; // Check every minute
const SESSION_WARNING_THRESHOLD = 5 * 60 * 1000; // Warn 5 minutes before expiry

// Initialize auth state
export async function initializeAuth() {
    try {
        // Get initial session
        const { data: { session }, error } = await window.supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
            await handleSessionStart(session);
        } else {
            redirectToLogin();
        }

        // Set up auth state change listener
        window.supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.id);
            
            switch (event) {
                case 'SIGNED_IN':
                    await handleSessionStart(session);
                    break;
                    
                case 'SIGNED_OUT':
                    await handleSessionEnd();
                    break;
                    
                case 'TOKEN_REFRESHED':
                    await handleSessionRefresh(session);
                    break;
                    
                case 'USER_UPDATED':
                    await handleUserUpdate(session);
                    break;
            }
        });

        // Start session monitoring
        startSessionMonitoring();

    } catch (error) {
        console.error('Error initializing auth:', error);
        redirectToLogin();
    }
}

// Handle new session start
async function handleSessionStart(session) {
    try {
        currentSession = session;
        clearTimers();
        
        // Update user's last session time
        await window.supabase
            .from('users')
            .update({
                last_session: new Date().toISOString(),
                session_count: window.supabase.raw('session_count + 1')
            })
            .eq('id', session.user.id);

        // Set up session refresh timer
        const expiresIn = new Date(session.expires_at * 1000) - Date.now();
        if (expiresIn > 0) {
            refreshTimer = setTimeout(async () => {
                await refreshSession();
            }, expiresIn - SESSION_WARNING_THRESHOLD);
        }

        // Dispatch event for other parts of the app
        window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { authenticated: true, user: session.user }
        }));

    } catch (error) {
        console.error('Error in handleSessionStart:', error);
    }
}

// Handle session end
async function handleSessionEnd() {
    currentSession = null;
    clearTimers();
    
    window.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: { authenticated: false, user: null }
    }));
    
    redirectToLogin();
}

// Handle session refresh
async function handleSessionRefresh(session) {
    try {
        currentSession = session;
        clearTimers();

        // Update last activity
        await window.supabase
            .from('users')
            .update({
                last_session: new Date().toISOString()
            })
            .eq('id', session.user.id);

        startSessionMonitoring();

    } catch (error) {
        console.error('Error in handleSessionRefresh:', error);
    }
}

// Handle user data updates
async function handleUserUpdate(session) {
    if (!session) return;
    
    try {
        // Refresh user data in local storage
        const { data: userData, error } = await window.supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (error) throw error;

        // Store updated user data
        localStorage.setItem('userData', JSON.stringify(userData));

        // Notify app of user update
        window.dispatchEvent(new CustomEvent('userDataUpdated', {
            detail: { user: userData }
        }));

    } catch (error) {
        console.error('Error updating user data:', error);
    }
}

// Monitor session status
function startSessionMonitoring() {
    // Clear any existing monitors
    clearTimers();

    // Set up new monitoring interval
    refreshTimer = setInterval(async () => {
        try {
            const { data: { session }, error } = await window.supabase.auth.getSession();
            
            if (error || !session) {
                await handleSessionEnd();
                return;
            }

            // Check if session is nearing expiry
            const expiresAt = new Date(session.expires_at * 1000);
            const timeToExpiry = expiresAt - Date.now();

            if (timeToExpiry < SESSION_WARNING_THRESHOLD && !sessionTimeoutWarning) {
                showSessionWarning();
            }

        } catch (error) {
            console.error('Error in session monitoring:', error);
        }
    }, SESSION_CHECK_INTERVAL);
}

// Show session expiry warning
function showSessionWarning() {
    // Clear any existing warning
    if (sessionTimeoutWarning) {
        clearTimeout(sessionTimeoutWarning);
    }

    // Show warning to user
    const shouldExtend = confirm('Your session is about to expire. Would you like to extend it?');
    
    if (shouldExtend) {
        refreshSession();
    } else {
        sessionTimeoutWarning = setTimeout(() => {
            window.supabase.auth.signOut();
        }, SESSION_WARNING_THRESHOLD);
    }
}

// Refresh the session
async function refreshSession() {
    try {
        const { data: { session }, error } = await window.supabase.auth.refreshSession();
        if (error) throw error;
        
        if (session) {
            await handleSessionRefresh(session);
        } else {
            await handleSessionEnd();
        }
    } catch (error) {
        console.error('Error refreshing session:', error);
        await handleSessionEnd();
    }
}

// Clear all timers
function clearTimers() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
    if (sessionTimeoutWarning) {
        clearTimeout(sessionTimeoutWarning);
        sessionTimeoutWarning = null;
    }
}

// Redirect to login page
function redirectToLogin() {
    const currentPath = window.location.pathname;
    if (!currentPath.includes('login.html')) {
        window.location.href = '/login.html';
    }
}

// Export current session getter
export function getCurrentSession() {
    return currentSession;
}

// Initialize auth when the script loads
if (typeof window !== 'undefined') {
    window.addEventListener('load', initializeAuth);
}
