class UI {
    constructor() {
        this.userModal = document.getElementById('userModal');
        this.confirmationModal = document.getElementById('confirmationModal');
        this.userForm = document.getElementById('userForm');
        this.usersTableBody = document.getElementById('usersTableBody');
        this.roleInfoCard = document.getElementById('roleInfoCard');
        this.currentUserId = null;

        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Add User Button
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.showUserModal();
        });

        // User Form
        this.userForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleUserFormSubmit();
        });

        // Cancel Buttons
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideUserModal();
        });

        document.getElementById('cancelConfirmBtn').addEventListener('click', () => {
            this.hideConfirmationModal();
        });

        // Confirm Button
        document.getElementById('confirmBtn').addEventListener('click', () => {
            this.handleConfirmation();
        });
    }

    showUserModal(user = null) {
        this.currentUserId = user?.id || null;
        const modalTitle = document.getElementById('modalTitle');
        const form = this.userForm;

        modalTitle.textContent = user ? 'Edit User' : 'Add New User';

        if (user) {
            form.username.value = user.username;
            form.email.value = user.email;
            form.role.value = user.role;
        } else {
            form.reset();
        }

        this.userModal.classList.remove('hidden');
    }

    hideUserModal() {
        this.userModal.classList.add('hidden');
        this.userForm.reset();
        this.currentUserId = null;
    }

    showConfirmationModal(user, action) {
        const message = document.getElementById('confirmationMessage');
        this.currentUserId = user.id;
        this.currentAction = action;

        switch (action) {
            case 'delete':
                message.textContent = `Are you sure you want to delete ${user.username}?`;
                break;
            case 'toggle':
                message.textContent = `Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} ${user.username}?`;
                break;
        }

        this.confirmationModal.classList.remove('hidden');
    }

    hideConfirmationModal() {
        this.confirmationModal.classList.add('hidden');
        this.currentUserId = null;
        this.currentAction = null;
    }

    async handleUserFormSubmit() {
        try {
            const formData = new FormData(this.userForm);
            const userData = {
                username: formData.get('username'),
                email: formData.get('email'),
                role: formData.get('role'),
                is_active: true
            };

            if (!this.currentUserId) {
                await api.createUser(userData);
                toast.show({
                    title: 'Success',
                    description: 'User created successfully. They will receive an email to set up their password.',
                    type: 'success'
                });
            } else {
                await api.updateUser(this.currentUserId, userData);
                toast.show({
                    title: 'Success',
                    description: 'User updated successfully',
                    type: 'success'
                });
            }

            this.hideUserModal();
            app.loadUsers();
        } catch (error) {
            toast.show({
                title: 'Error',
                description: error.message,
                type: 'error'
            });
        }
    }

    async handleConfirmation() {
        try {
            switch (this.currentAction) {
                case 'delete':
                    await api.deleteUser(this.currentUserId);
                    toast.show({
                        title: 'Success',
                        description: 'User deleted successfully',
                        type: 'success'
                    });
                    break;
                case 'toggle':
                    const user = await api.toggleUserStatus(this.currentUserId, true);
                    toast.show({
                        title: 'Success',
                        description: `User ${user.is_active ? 'activated' : 'deactivated'} successfully`,
                        type: 'success'
                    });
                    break;
            }

            this.hideConfirmationModal();
            app.loadUsers();
        } catch (error) {
            toast.show({
                title: 'Error',
                description: error.message,
                type: 'error'
            });
        }
    }

    renderUsers(users) {
        this.usersTableBody.innerHTML = '';
        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div>
                            <div class="text-sm font-medium text-gray-900">${user.username}</div>
                            <div class="text-sm text-gray-500">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        ${user.role}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                    }">
                        ${user.is_active ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                        class="text-blue-600 hover:text-blue-900 mr-4"
                        onclick="ui.showUserModal(${JSON.stringify(user)})"
                    >
                        Edit
                    </button>
                    <button
                        class="text-blue-600 hover:text-blue-900 mr-4"
                        onclick="ui.showConfirmationModal(${JSON.stringify(user)}, 'toggle')"
                    >
                        ${user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                        class="text-red-600 hover:text-red-900"
                        onclick="ui.showConfirmationModal(${JSON.stringify(user)}, 'delete')"
                    >
                        Delete
                    </button>
                </td>
            `;
            this.usersTableBody.appendChild(row);
        });
    }

    renderRoleInfo(users) {
        const adminCount = users.filter(user => user.role === 'admin').length;
        const userCount = users.filter(user => user.role === 'user').length;
        const activeCount = users.filter(user => user.is_active).length;

        this.roleInfoCard.innerHTML = `
            <div class="p-6">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Role Information</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="bg-blue-50 p-4 rounded-lg">
                        <p class="text-sm text-blue-600">Total Users</p>
                        <p class="text-2xl font-semibold text-blue-700">${users.length}</p>
                    </div>
                    <div class="bg-green-50 p-4 rounded-lg">
                        <p class="text-sm text-green-600">Active Users</p>
                        <p class="text-2xl font-semibold text-green-700">${activeCount}</p>
                    </div>
                    <div class="bg-purple-50 p-4 rounded-lg">
                        <p class="text-sm text-purple-600">Admin Users</p>
                        <p class="text-2xl font-semibold text-purple-700">${adminCount}</p>
                    </div>
                </div>
            </div>
        `;
    }
}

const ui = new UI(); 