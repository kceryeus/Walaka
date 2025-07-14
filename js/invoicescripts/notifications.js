// notifications.js
// Notification utility and top bar functionality

/**
 * Display the current user's name
 */
async function displayUserName() {
    const supabase = window.supabase;
    if (typeof supabase === 'undefined' || !supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    let displayName = session.user.email;
    try {
        const { data: userRecord, error } = await supabase
            .from('users')
            .select('username')
            .eq('id', session.user.id)
            .maybeSingle();

        if (userRecord && userRecord.username) {
            displayName = userRecord.username;
        }
    } catch (e) {
        console.error('Error fetching user record:', e);
    }

    const userSpan = document.getElementById('user-displayname');
    if (userSpan) userSpan.textContent = displayName;
}

/**
 * Initialize dropdown functionality for user menu
 */
function initUserDropdown() {
    const userProfile = document.getElementById('userProfile');
    const userDropdown = document.getElementById('userDropdown');

    if (!userProfile || !userDropdown) return;

    let dropdownTimeout;

    function openDropdown() {
        clearTimeout(dropdownTimeout);
        userProfile.classList.add('open');
    }

    function closeDropdown() {
        dropdownTimeout = setTimeout(() => {
            userProfile.classList.remove('open');
        }, 150);
    }

    // Mouse events for desktop
    userProfile.addEventListener('mouseenter', openDropdown);
    userProfile.addEventListener('mouseleave', closeDropdown);
    userDropdown.addEventListener('mouseenter', openDropdown);
    userDropdown.addEventListener('mouseleave', closeDropdown);

    // Click events for mobile
    userProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.innerWidth <= 768) {
            userProfile.classList.toggle('open');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!userProfile.contains(e.target)) {
            userProfile.classList.remove('open');
        }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            userProfile.classList.remove('open');
        }
    });
}

/**
 * Handle sign out
 */
async function handleSignOut() {
    try {
        await window.supabase.auth.signOut();
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

/**
 * Show notification message
 */
function showNotification(message, type = 'info') {
    // In a real application, you would use a proper notification system
    if (type === 'error') {
        console.error(message);
    } else {
        console.log(message);
    }
    
    // Fallback to alert for now
    alert(message);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    await displayUserName();
    initUserDropdown();
    
    // Set up sign out handler
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', handleSignOut);
    }
});

// Export functions for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        displayUserName,
        initUserDropdown,
        handleSignOut,
        showNotification
    };
}

// Attach to window for global use
if (typeof window !== 'undefined') {
    window.displayUserName = displayUserName;
    window.initUserDropdown = initUserDropdown;
    window.handleSignOut = handleSignOut;
    window.showNotification = showNotification;
}

// Optionally, you can extend this file later with toast notifications or custom UI.
