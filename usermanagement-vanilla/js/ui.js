import { toast } from './toast.js';
import { api } from './api.js';
import { app } from './app.js';
import authHandler from './auth-handler.js';
// import { createUserWithEnvironment } from './auth-utils.js'; // Commented out: now using global version or not used
// If you need to create a user with environment, use window.createUserWithEnvironment(userData) instead.

class UI {
    constructor() {
        this.userModal = document.getElementById('userModal');
        this.confirmationModal = document.getElementById('confirmationModal');
        this.userForm = document.getElementById('userForm');
        this.usersTableBody = document.getElementById('usersTableBody');
        this.roleInfoCard = document.getElementById('roleInfoCard');
        this.currentUserId = null;
        this.currentAction = null;
        this.isLoading = false;

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

    setLoading(loading) {
        this.isLoading = loading;
        const submitBtn = this.userForm.querySelector('button[type="submit"]');
        const confirmBtn = document.getElementById('confirmBtn');
        
        if (submitBtn) {
            submitBtn.disabled = loading;
            submitBtn.innerHTML = loading ? 
                '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...' : 
                'Save';
        }
        
        if (confirmBtn) {
            confirmBtn.disabled = loading;
            confirmBtn.innerHTML = loading ? 
                '<i class="fas fa-spinner fa-spin mr-2"></i>Processing...' : 
                'Confirm';
        }
    }

    showUserModal(user = null) {
        this.currentUserId = user?.id || null;
        const modalTitle = document.getElementById('modalTitle');
        const form = this.userForm;
        const roleSelect = form.role;

        modalTitle.textContent = user ? 'Edit User' : 'Add New User';

        // Reset form and set values if editing
        form.reset();
        if (user) {
            form.username.value = user.username || '';
            form.email.value = user.email || '';
            form.role.value = user.role || 'viewer';
        }

        // Use the current logged-in user's role for the dropdown
        this.updateRoleOptions(roleSelect, app.currentUser);

        this.userModal.classList.remove('hidden');
    }

    updateRoleOptions(roleSelect, user) {
        // Remove all existing options
        while (roleSelect.firstChild) {
            roleSelect.removeChild(roleSelect.firstChild);
        }

        // Add role options based on permissions
        const roles = user?.role === 'admin' ? 
            ['admin', 'editor', 'viewer'] : 
            ['editor', 'viewer'];

        roles.forEach(role => {
            const option = document.createElement('option');
            option.value = role;
            option.textContent = role.charAt(0).toUpperCase() + role.slice(1);
            if (user && user.role === role) option.selected = true;
            roleSelect.appendChild(option);
        });
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
                message.textContent = `Are you sure you want to ${user.status === 'active' ? 'deactivate' : 'activate'} ${user.username}?`;
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
                username: formData.get('username')?.trim(),
                email: formData.get('email')?.trim(),
                role: formData.get('role'),
                status: 'active'
            };

            // Validation
            if (!userData.username || !userData.email) {
                toast.show({
                    title: 'Validation Error',
                    description: 'Username and email are required',
                    type: 'error'
                });
                return;
            }

            if (!this.validateEmail(userData.email)) {
                toast.show({
                    title: 'Validation Error',
                    description: 'Please enter a valid email address',
                    type: 'error'
                });
                return;
            }

            this.setLoading(true);

            if (!this.currentUserId) {
                // Actually create the user in Supabase Auth
                let createdUser;
                try {
                    const result = await api.createUser(userData);
                    createdUser = result.auth;
                } catch (err) {
                    toast.show({
                        title: 'Error',
                        description: 'Failed to create user in Auth: ' + (err.message || err),
                        type: 'error'
                    });
                    this.setLoading(false);
                    return;
                }

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
            console.error('Error in handleUserFormSubmit:', error);
            toast.show({
                title: 'Error',
                description: error.message,
                type: 'error'
            });
        } finally {
            this.setLoading(false);
        }
    }

    validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
                    const user = await api.toggleUserStatus(this.currentUserId);
                    toast.show({
                        title: 'Success',
                        description: `User ${user.status === 'active' ? 'activated' : 'deactivated'} successfully`,
                        type: 'success'
                    });
                    break;
            }
            this.hideConfirmationModal();
            // Always refresh user list after action
            app.loadUsers();
        } catch (error) {
            console.error('Error in handleConfirmation:', error);
            toast.show({
                title: 'Error',
                description: error.message,
                type: 'error'
            });
            this.hideConfirmationModal();
        }
    }

    renderUsers(users) {
        this.usersTableBody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                <i class="fas fa-user text-gray-500"></i>
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">
                                ${user.username}
                                ${user.created_by ? '' : '<span class="ml-2 px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800">Owner</span>'}
                            </div>
                            <div class="text-sm text-gray-500">${user.email}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${user.role === 'admin' ? 'bg-red-100 text-red-800' : 
                          user.role === 'editor' ? 'bg-blue-100 text-blue-800' : 
                          'bg-green-100 text-green-800'}">
                        ${user.role}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                        ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                        ${user.status}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div class="flex justify-end space-x-2">
                        <button 
                            class="edit-user"
                            data-user='${JSON.stringify(user)}'
                            title="Edit user"
                        >
                            <i class="fas fa-edit text-indigo-600"></i>
                        </button>
                        ${user.created_by ? `
                            <button 
                                class="toggle-user status-toggle-btn"
                                data-user='${JSON.stringify(user)}'
                                title="${user.status === 'active' ? 'Deactivate' : 'Activate'} user"
                            >
                                <i class="fas ${user.status === 'active' ? 'fa-toggle-on status-active' : 'fa-toggle-off status-inactive'}"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            `;

            // Add event listeners
            const editBtn = tr.querySelector('.edit-user');
            const toggleBtn = tr.querySelector('.toggle-user');

            editBtn?.addEventListener('click', () => {
                const userData = JSON.parse(editBtn.dataset.user);
                this.showUserModal(userData);
            });

            toggleBtn?.addEventListener('click', async () => {
                const userData = JSON.parse(toggleBtn.dataset.user);
                this.showConfirmationModal(userData, 'toggle');
            });

            this.usersTableBody.appendChild(tr);
        });
    }

    renderRoleInfo(users) {
        const roleStats = users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {});

        const totalUsers = users.length;
        const colors = {
            admin: 'red',
            editor: 'blue',
            viewer: 'green'
        };

        this.roleInfoCard.innerHTML = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-medium text-gray-900">Role Distribution</h3>
                    <span class="text-sm text-gray-500">${totalUsers} total users</span>
                </div>
                <div class="flex items-center space-x-8">
                    ${Object.entries(roleStats).map(([role, count]) => `
                        <div class="flex-1">
                            <div class="flex items-center justify-between mb-2">
                                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-${colors[role]}-100 text-${colors[role]}-800">
                                    ${role}
                                </span>
                                <span class="text-sm font-medium text-gray-900">${count}</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-${colors[role]}-500 h-2 rounded-full" style="width: ${(count / totalUsers) * 100}%"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
}

const ui = new UI();
export { ui };