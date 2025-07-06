import { api } from './api.js';
import { ui } from './ui.js';
import { toast } from './toast.js';
import { eventBus, toggleLoading } from './utilities.js';
import authHandler from './auth-handler.js';

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
                // Don't redirect, just continue with limited functionality
            } else {
                console.log('User is authenticated');
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