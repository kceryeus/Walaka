// User dropdown functionality for banks page
document.addEventListener('DOMContentLoaded', function() {
    const userProfile = document.getElementById('userProfile');
    const userDropdown = document.getElementById('userDropdown');

    if (userProfile && userDropdown) {
        // Toggle dropdown on click
        userProfile.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            userProfile.classList.toggle('open');
            userProfile.classList.toggle('show'); // For compatibility with existing code
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(event) {
            if (!userProfile.contains(event.target)) {
                userProfile.classList.remove('open');
                userProfile.classList.remove('show'); // For compatibility with existing code
            }
        });

        // Handle dropdown menu item clicks
        userDropdown.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                // Close dropdown when a menu item is clicked
                userProfile.classList.remove('open');
                userProfile.classList.remove('show'); // For compatibility with existing code
            }
        });

        // Handle logout functionality
        const logoutLink = userDropdown.querySelector('a[href="#"]:last-child');
        if (logoutLink) {
            logoutLink.addEventListener('click', async function(e) {
                e.preventDefault();
                try {
                    if (window.supabase && window.supabase.auth) {
                        const { error } = await window.supabase.auth.signOut();
                        if (error) throw error;
                        window.location.href = '../login.html';
                    } else {
                        console.error('Supabase auth not available');
                        window.location.href = '../login.html';
                    }
                } catch (error) {
                    console.error('Error signing out:', error);
                    // Still redirect to login page even if there's an error
                    window.location.href = '../login.html';
                }
            });
        }
    }

    // Handle menu toggle for mobile
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainContent = document.querySelector('.main-content');
    
    if (menuToggle && sidebar && mainContent) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
            document.body.classList.toggle('sidebar-collapsed');
        });
    }
}); 