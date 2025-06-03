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
            toggleLoading(true);
            
            // Simple auth check
            const isAuthenticated = await authHandler.initialize();
            if (!isAuthenticated) {
                window.location.href = '../login.html';
                return;
            }

            // Load users
            this.users = await api.fetchUsers();
            ui.renderUsers(this.users);
            ui.renderRoleInfo(this.users);
            
            // Emit ready event
            eventBus.emit('app:ready');

        } catch (error) {
            console.error('Error:', error);
            toast.show({
                title: 'Error',
                description: 'Failed to load users',
                type: 'error'
            });
        } finally {
            toggleLoading(false);
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