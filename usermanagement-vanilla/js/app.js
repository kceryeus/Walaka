import { api } from './api.js';
import { ui } from './ui.js';

class App {
    constructor() {
        this.loadUsers();
    }

    async loadUsers() {
        try {
            console.log('Fetching users...');
            const users = await api.fetchUsers();
            console.log('Fetched users:', users);
            ui.renderUsers(users);
            ui.renderRoleInfo(users);
        } catch (error) {
            console.error('Error loading users:', error);
            toast.show({
                title: 'Error',
                description: 'Failed to fetch users',
                type: 'error'
            });
        }
    }
}

const app = new App(); 