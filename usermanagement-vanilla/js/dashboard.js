// import { supabaseClient } from './api.js'; // Commented out: use window.supabase instead
// Use window.supabase directly in this file.

// Handle user profile dropdown
document.addEventListener('DOMContentLoaded', () => {
    const userProfile = document.getElementById('userProfile');
    const userDropdown = document.getElementById('userDropdown');

    if (userProfile && userDropdown) {
        userProfile.addEventListener('click', () => {
            userDropdown.classList.toggle('show');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!userProfile.contains(event.target)) {
                userDropdown.classList.remove('show');
            }
        });
    }

    // Handle logout
    const logoutLink = document.querySelector('#userDropdown a[href="#"]:last-child');
    if (logoutLink) {
        logoutLink.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const { error } = await window.supabase.auth.signOut();
                if (error) throw error;
                window.location.href = '../login.html';
            } catch (error) {
                console.error('Error signing out:', error);
                toast.show({
                    title: 'Error',
                    description: 'Failed to sign out',
                    type: 'error'
                });
            }
        });
    }
});

// Handle sidebar toggle
const menuToggle = document.querySelector('.menu-toggle');
if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('collapsed');
        document.querySelector('.main-content').classList.toggle('expanded');
    });
} 