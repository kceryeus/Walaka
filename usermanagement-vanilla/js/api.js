// Initialize Supabase client with anon key
const supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

class API {
    async fetchUsers() {
        try {
            console.log('Fetching users...');
            const { data, error } = await supabaseClient
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    }

    async createUser(userData) {
        try {
            console.log('Creating user with data:', userData);
            
            // Create user profile in the users table
            const { data, error } = await supabaseClient
                .from('users')
                .insert([
                    {
                        email: userData.email,
                        username: userData.username,
                        role: userData.role,
                        status: 'active'
                    }
                ])
                .select()
                .single();

            if (error) throw error;

            toast.show({
                title: 'Success',
                description: 'User created successfully',
                type: 'success'
            });

            return data;
        } catch (error) {
            console.error('Error creating user:', error);

            toast.show({
                title: 'Error',
                description: error.message || 'Failed to create user',
                type: 'error'
            });

            throw error;
        }
    }

    async updateUser(userId, userData) {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .update(userData)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            const { error } = await supabaseClient
                .from('users')
                .delete()
                .eq('id', userId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    async toggleUserStatus(userId, currentStatus) {
        try {
            const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
            const { data, error } = await supabaseClient
                .from('users')
                .update({ status: newStatus })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error toggling user status:', error);
            throw error;
        }
    }
}

const api = new API(); 