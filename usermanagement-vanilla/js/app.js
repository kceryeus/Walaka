class App {
    constructor() {
        this.loadUsers();
    }

    async loadUsers() {
        try {
            const users = await api.fetchUsers();
            ui.renderUsers(users);
            ui.renderRoleInfo(users);
        } catch (error) {
            toast.show({
                title: 'Error',
                description: 'Failed to fetch users',
                type: 'error'
            });
        }
    }
}

const app = new App(); 