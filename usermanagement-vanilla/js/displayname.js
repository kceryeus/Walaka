// Function to update user display name
async function updateUserDisplayName() {
    try {
        // Use global Supabase client
        if (!window.supabase) {
            console.log('Supabase not available yet for display name update');
            return;
        }

        const { data: { user } } = await window.supabase.auth.getUser();
        if (!user) return;

        const { data: userData, error } = await window.supabase
            .from('users')
            .select('username')
            .eq('id', user.id)
            .single();

        if (error) {
            console.error('Error fetching user data:', error);
            return;
        }

        const displayName = userData?.username || user.email;
        const displayNameElement = document.getElementById('user-displayname');
        if (displayNameElement) {
            displayNameElement.textContent = displayName;
        }
    } catch (error) {
        console.error('Error updating display name:', error);
    }
}

// Update display name when auth state changes
function setupDisplayNameListener() {
    if (!window.supabase) {
        console.log('Supabase not available for display name listener');
        return;
    }

    window.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN') {
            updateUserDisplayName();
        } else if (event === 'SIGNED_OUT') {
            const displayNameElement = document.getElementById('user-displayname');
            if (displayNameElement) {
                displayNameElement.textContent = 'Loading...';
            }
        }
    });
}

// Wait for Supabase to be available and then setup
function initializeDisplayName() {
    if (window.supabase) {
        setupDisplayNameListener();
        updateUserDisplayName();
    } else {
        // Wait for Supabase to be available
        const checkSupabase = setInterval(() => {
            if (window.supabase) {
                clearInterval(checkSupabase);
                setupDisplayNameListener();
                updateUserDisplayName();
            }
        }, 100);
        
        // Stop checking after 10 seconds
        setTimeout(() => {
            clearInterval(checkSupabase);
        }, 10000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeDisplayName);