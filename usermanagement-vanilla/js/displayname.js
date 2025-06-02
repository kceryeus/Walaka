import { supabaseClient } from './supabase.js';

// Function to update user display name
async function updateUserDisplayName() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return;

        const { data: userData, error } = await supabaseClient
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
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
        updateUserDisplayName();
    } else if (event === 'SIGNED_OUT') {
        const displayNameElement = document.getElementById('user-displayname');
        if (displayNameElement) {
            displayNameElement.textContent = 'Loading...';
        }
    }
});

// Initial update
updateUserDisplayName();