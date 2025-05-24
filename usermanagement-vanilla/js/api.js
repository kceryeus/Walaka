// Initialize Supabase client with anon key
const supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

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
            // Query the 'users' table directly, selecting specific columns
            const { data, error } = await supabaseClient
                .from('users')
                .select('id, username, email, role, status'); // Select only needed columns

            if (error) {
                console.error('Error fetching users:', error);
                throw error;
            }

            console.log('Users fetched:', data);
            return data;
        } catch (error) {
            console.error('Error in fetchUsers API call:', error);
            throw error;
        }
    }

    async createUser(userData) {
        console.log('Creating user via function with data:', userData);
        return await this._callFunction('createUser', { userData });
    }

    async updateUser(userId, userData) {
        console.log(`Updating user ${userId} via function with data:`, userData);
        return await this._callFunction('updateUser', { userId, userData });
    }

    async deleteUser(userId) {
        console.log(`Deleting user ${userId} via function...`);
        return await this._callFunction('deleteUser', { userId });
    }

    async toggleUserStatus(userId, currentStatus) {
        console.log(`Toggling status for user ${userId} (current: ${currentStatus}) via function...`);
        return await this._callFunction('toggleUserStatus', { userId, currentStatus });
    }
}

const api = new API();