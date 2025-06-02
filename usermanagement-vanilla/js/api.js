import { supabaseClient } from './supabase.js';

// Handle auth state changes
supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN') {
        const { user } = session;
        try {
            // Check if user already exists
            const { data: existingUser } = await supabaseClient
                .from('users')
                .select('id')
                .eq('id', user.id)
                .single();

            if (!existingUser) {
                // Create new user if doesn't exist
                const { error } = await supabaseClient
                    .from('users')
                    .insert({
                        id: user.id,
                        email: user.email,
                        created_by: null, // This will trigger the admin role assignment
                        username: user.email.split('@')[0], // Default username from email
                        status: 'active'
                    });

                if (error) {
                    console.error('Error creating user:', error);
                    toast.show({
                        title: 'Error',
                        description: 'Failed to create user profile',
                        type: 'error'
                    });
                }
            }
        } catch (error) {
            console.error('Error in auth state change handler:', error);
        }
    }
});

class API {
    async _callFunction(action, payload = {}) {
        const { data, error: functionError } = await supabaseClient.functions.invoke('service-role', {
            body: JSON.stringify({ action, ...payload }) // Ensure body is stringified
        });

        if (functionError) {
            // Handle errors from invoking the function itself (e.g., network issue, function not found)
            console.error(`Error invoking function for action "${action}":`, functionError);
            throw functionError;
        }

        // The function response is expected to be JSON, parse it if it's a string
        // Supabase functions might return the data directly or it might be stringified
        let responseData = data;
        if (typeof data === 'string') {
            try {
                responseData = JSON.parse(data);
            } catch (e) {
                // If it's not JSON, it might be a simple string response or an unhandled error string
                console.error('Function returned non-JSON string:', data);
                throw new Error('Unexpected response from server function.');
            }
        }


        if (responseData && responseData.error) {
            // Handle errors returned by the business logic within the function
            console.error(`Error from function action "${action}":`, responseData.error);
            throw new Error(responseData.error);
        }

        // Check if responseData itself is the data or if it's nested under a 'data' key
        // Based on your edge function, it returns { data: users } or { data: profileData } etc.
        return responseData && responseData.data !== undefined ? responseData.data : responseData;
    }

    async fetchUsers() {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .select('id, username, email, role, status, created_by');

            if (error) {
                console.error('Error fetching users:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('Error in fetchUsers API call:', error);
            throw error;
        }
    }

    async createUser(userData) {
        try {
            const { data, error } = await supabaseClient
                .from('users')
                .insert({
                    ...userData,
                    created_by: (await supabaseClient.auth.getUser()).data.user?.id
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating user:', error);
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
            return true;
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

export { api, supabaseClient };