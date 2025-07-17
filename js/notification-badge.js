// Notification Badge Synchronization Utility
// This utility keeps the notification badge count synchronized across all pages

class NotificationBadgeManager {
    constructor() {
        this.badgeElements = [];
        this.unreadCount = 0;
        this.isInitialized = false;
        this.checkInterval = null;
    }

    // Initialize the notification badge manager
    async initialize() {
        if (this.isInitialized) return;
        
        // Find all notification badges on the page
        this.findBadgeElements();
        
        // Set up periodic checks for new notifications
        this.startPeriodicChecks();
        
        // Initial count update
        await this.updateBadgeCount();
        
        this.isInitialized = true;
        // console.log('NotificationBadgeManager initialized');
    }

    // Find all notification badge elements on the page
    findBadgeElements() {
        // Look for badges in different possible locations
        const selectors = [
            '.notification-bell .badge',
            '.notification-badge',
            '.badge',
            '[class*="badge"]'
        ];

        this.badgeElements = [];
        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Only include elements that are actually notification badges
                if (this.isNotificationBadge(element)) {
                    this.badgeElements.push(element);
                }
            });
        });

        // console.log(`Found ${this.badgeElements.length} notification badge elements`);
    }

    // Check if an element is actually a notification badge
    isNotificationBadge(element) {
        // Check if it's inside a notification bell or has notification-related classes
        const parent = element.closest('.notification-bell, .notification-badge');
        const classes = element.className.toLowerCase();
        const text = element.textContent;
        
        return parent || 
               classes.includes('badge') || 
               classes.includes('notification') ||
               (text && !isNaN(parseInt(text)) && parseInt(text) <= 999); // Reasonable notification count
    }

    // Update the badge count across all pages
    async updateBadgeCount() {
        try {
            // Check if Supabase is available
            if (!window.supabase) {
                // console.log('Supabase not available yet, skipping badge update');
                return;
            }

            // Get current user
            let session;
            try {
                // Check if auth is available
                if (!window.supabase.auth) {
                    // console.log('Supabase auth not available yet');
                    this.setBadgeCount(0);
                    return;
                }
                
                // Try to get session with error handling
                const { data, error } = await window.supabase.auth.getSession();
                if (error) {
                    // console.log('Error getting auth session:', error);
                    this.setBadgeCount(0);
                    return;
                }
                session = data.session;
            } catch (authError) {
                // console.log('Auth session not available:', authError);
                this.setBadgeCount(0);
                return;
            }

            if (!session || !session.user) {
                this.setBadgeCount(0);
                return;
            }

            // Fetch unread notifications count
            const { data: notifications, error } = await window.supabase
                .from('notifications')
                .select('id, read')
                .eq('user_id', session.user.id)
                .eq('read', false);

            if (error) {
                console.error('Error fetching notification count:', error);
                return;
            }

            const unreadCount = notifications ? notifications.length : 0;
            this.setBadgeCount(unreadCount);
            
            // console.log(`Updated notification badge count: ${unreadCount}`);
        } catch (error) {
            console.error('Error updating notification badge count:', error);
        }
    }

    // Set the badge count on all badge elements
    setBadgeCount(count) {
        this.unreadCount = count;
        
        this.badgeElements.forEach(badge => {
            badge.textContent = count;
            
            // Show/hide badge based on count
            if (count > 0) {
                badge.style.display = 'block';
                badge.style.visibility = 'visible';
            } else {
                badge.style.display = 'none';
            }
        });

        // Dispatch custom event for other components that might need to know
        window.dispatchEvent(new CustomEvent('notificationCountUpdated', {
            detail: { count: count }
        }));
    }

    // Start periodic checks for new notifications
    startPeriodicChecks() {
        // Check every 30 seconds for new notifications
        this.checkInterval = setInterval(() => {
            this.updateBadgeCount();
        }, 30000); // 30 seconds
    }

    // Stop periodic checks
    stopPeriodicChecks() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    // Force refresh the badge count (useful when notifications are created/updated)
    async refresh() {
        await this.updateBadgeCount();
    }

    // Clean up when page is unloaded
    cleanup() {
        this.stopPeriodicChecks();
    }

    // Test function to create a test notification
    async createTestNotification() {
        try {
            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session || !session.user) {
                console.error('No user session found');
                return;
            }
            // Use the global helper to create notification and send email
            if (window.createNotification) {
                await window.createNotification(
                    'system',
                    'Test Notification',
                    'This is a test notification to verify badge synchronization.',
                    null,
                    session.user.id
                );
            }
            await this.refresh();
        } catch (error) {
            console.error('Error in createTestNotification:', error);
        }
    }

    // Test function to clear all notifications
    async clearAllNotifications() {
        try {
            if (!window.supabase) {
                console.error('Supabase not available');
                return;
            }

            const { data: { session } } = await window.supabase.auth.getSession();
            if (!session || !session.user) {
                console.error('No user session found');
                return;
            }

            const { error } = await window.supabase
                .from('notifications')
                .delete()
                .eq('user_id', session.user.id);

            if (error) {
                console.error('Error clearing notifications:', error);
            } else {
                // console.log('All notifications cleared successfully');
                await this.refresh();
            }
        } catch (error) {
            console.error('Error in clearAllNotifications:', error);
        }
    }

    // Test function to check notification badge status
    getStatus() {
        return {
            initialized: this.isInitialized,
            badgeElements: this.badgeElements.length,
            unreadCount: this.unreadCount,
            supabaseAvailable: !!window.supabase,
            supabaseAuthAvailable: !!(window.supabase && window.supabase.auth),
            currentPath: window.location.pathname
        };
    }
}

// Global notification badge manager instance
window.notificationBadgeManager = new NotificationBadgeManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for Supabase to be available
    if (window.supabase) {
        await window.notificationBadgeManager.initialize();
    } else {
        // Wait for Supabase to be loaded
        const checkSupabase = setInterval(() => {
            if (window.supabase) {
                clearInterval(checkSupabase);
                window.notificationBadgeManager.initialize();
            }
        }, 100);
        
        // Stop checking after 10 seconds to avoid infinite loop
        setTimeout(() => {
            clearInterval(checkSupabase);
            // console.log('Supabase not available after 10 seconds, notification badge will not be initialized');
        }, 10000);
    }
});

// Listen for global notification creation events to refresh badge instantly
window.addEventListener('notificationCreated', () => {
    if (window.notificationBadgeManager && typeof window.notificationBadgeManager.refresh === 'function') {
        window.notificationBadgeManager.refresh();
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.notificationBadgeManager) {
        window.notificationBadgeManager.cleanup();
    }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationBadgeManager;
}

// Global test functions for debugging
window.testNotificationBadge = {
    // Check the status of the notification badge manager
    status: () => {
        if (window.notificationBadgeManager) {
            // console.log('Notification Badge Status:', window.notificationBadgeManager.getStatus());
            return window.notificationBadgeManager.getStatus();
        } else {
            // console.log('Notification badge manager not available');
            return null;
        }
    },
    
    // Create a test notification
    createTest: async () => {
        if (window.notificationBadgeManager) {
            await window.notificationBadgeManager.createTestNotification();
        } else {
            // console.log('Notification badge manager not available');
        }
    },
    
    // Clear all notifications
    clearAll: async () => {
        if (window.notificationBadgeManager) {
            await window.notificationBadgeManager.clearAllNotifications();
        } else {
            // console.log('Notification badge manager not available');
        }
    },
    
    // Force refresh the badge count
    refresh: async () => {
        if (window.notificationBadgeManager) {
            await window.notificationBadgeManager.refresh();
        } else {
            // console.log('Notification badge manager not available');
        }
    },
    
    // Test Supabase connection
    testSupabase: () => {
        // console.log('Supabase available:', !!window.supabase);
        // console.log('Supabase auth available:', !!(window.supabase && window.supabase.auth));
        // if (window.supabase) {
        //     console.log('Supabase client:', window.supabase);
        // }
        return {
            supabaseAvailable: !!window.supabase,
            supabaseAuthAvailable: !!(window.supabase && window.supabase.auth)
        };
    }
}; 