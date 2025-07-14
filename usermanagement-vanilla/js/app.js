import { api } from './api.js';
import { ui } from './ui.js';
import { toast } from './toast.js';
import { eventBus, toggleLoading } from './utilities.js';
import authHandler from './auth-handler.js';

// --- User creation limit enforcement based on subscription ---
async function getCurrentEnvironmentId(supabase) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return null;
    const { data: userRow } = await supabase
        .from('users')
        .select('environment_id')
        .eq('id', session.user.id)
        .single();
    return userRow?.environment_id || null;
}

async function getMaxUsersForEnvironment(supabase, environmentId) {
    if (!environmentId) return 1;
    const { data: subs } = await supabase
        .from('subscriptions')
        .select('max_users, end_date, status')
        .eq('environment_id', environmentId)
        .order('end_date', { ascending: false })
        .limit(1);
    if (subs && subs.length > 0 && subs[0].status === 'active') {
        return subs[0].max_users || 1;
    }
    return 1;
}

async function getUserCountForEnvironment(supabase, environmentId) {
    if (!environmentId) return 0;
    const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('environment_id', environmentId);
    return count || 0;
}

async function canAddUser(supabase) {
    const environmentId = await getCurrentEnvironmentId(supabase);
    const maxUsers = await getMaxUsersForEnvironment(supabase, environmentId);
    const userCount = await getUserCountForEnvironment(supabase, environmentId);
    return userCount < maxUsers;
}

// Show a custom modal when user limit is reached
function showUserLimitModal() {
    // Remove any existing modal
    const existing = document.getElementById('user-limit-modal');
    if (existing) existing.remove();
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'user-limit-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.35)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div style="background:#fff;padding:2.5em 2em 2em 2em;border-radius:16px;max-width:400px;box-shadow:0 8px 32px rgba(0,0,0,0.18);text-align:center;">
        <div style="font-size:2.5em;color:#f59e42;margin-bottom:0.5em;"><i class='fas fa-users-slash'></i></div>
        <h2 style="margin-bottom:0.5em;">User Limit Reached</h2>
        <p style="margin-bottom:1.5em;">You have reached the maximum number of users for your subscription plan.<br>Please upgrade your plan to add more users.</p>
        <button id="upgrade-plan-btn" style="background:#2563eb;color:#fff;padding:0.7em 2em;border:none;border-radius:8px;font-size:1.1em;font-weight:600;cursor:pointer;transition:background 0.2s;">Upgrade Plan</button>
        <button id="close-user-limit-modal" style="margin-left:1em;background:#e5e7eb;color:#374151;padding:0.7em 1.5em;border:none;border-radius:8px;font-size:1em;font-weight:500;cursor:pointer;transition:background 0.2s;">Close</button>
      </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('close-user-limit-modal').onclick = () => modal.remove();
    document.getElementById('upgrade-plan-btn').onclick = () => {
        modal.remove();
        window.location.href = '/profile.html';
    };
}

// Intercept Add User button
const addUserBtn = document.getElementById('addUserBtn');
if (addUserBtn) {
    addUserBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (await canAddUser(window.supabase)) {
            // Show add user modal (assume showAddUserModal exists)
            if (typeof showAddUserModal === 'function') {
                showAddUserModal();
            }
        } else {
            showUserLimitModal();
        }
    });
}

class App {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.init();
    }

    async init() {
        try {
            console.log('App initialization started');
            toggleLoading(true);
            
            // Wait for global Supabase client to be available
            if (!window.supabase) {
                console.log('Waiting for Supabase client to be available...');
                await new Promise(resolve => {
                    const checkSupabase = setInterval(() => {
                        if (window.supabase) {
                            clearInterval(checkSupabase);
                            console.log('Supabase client is now available');
                            resolve();
                        }
                    }, 100);
                    
                    // Timeout after 10 seconds
                    setTimeout(() => {
                        clearInterval(checkSupabase);
                        console.log('Supabase client timeout - continuing anyway');
                        resolve();
                    }, 10000);
                });
            } else {
                console.log('Supabase client already available');
            }
            
            // Simple auth check - be more lenient like the main system
            console.log('Checking authentication...');
            const isAuthenticated = await authHandler.initialize();
            console.log('Authentication result:', isAuthenticated);
            
            if (!isAuthenticated) {
                console.log('User not authenticated, but continuing with limited functionality');
                this.currentUser = null;
                // Don't redirect, just continue with limited functionality
            } else {
                console.log('User is authenticated');
                this.currentUser = await api.getCurrentUserProfile();
            }

            // Load users
            console.log('Loading users...');
            this.users = await api.fetchUsers();
            ui.renderUsers(this.users);
            ui.renderRoleInfo(this.users);
            
            // Emit ready event
            console.log('App initialization complete');
            eventBus.emit('app:ready');

        } catch (error) {
            console.error('Error during app initialization:', error);
            toast.show({
                title: 'Error',
                description: 'Failed to load users',
                type: 'error'
            });
        } finally {
            toggleLoading(false);
        }
    }

    async loadUsers() {
        try {
            this.users = await api.fetchUsers();
            ui.renderUsers(this.users);
            ui.renderRoleInfo(this.users);
        } catch (error) {
            console.error('Error loading users:', error);
            toast.show({
                title: 'Error',
                description: 'Failed to load users',
                type: 'error'
            });
        }
    }

    async updateStats() {
        const totalUsers = this.users.length;
        const activeUsers = this.users.filter(user => user.status === 'active').length;
        
        document.getElementById('totalUsersCount').textContent = totalUsers;
        document.getElementById('activeUsersCount').textContent = activeUsers;
    }
}

const app = new App();
export { app };