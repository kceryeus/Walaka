// Simple API class for user management
// Use the global Supabase client instead of creating a new one

class API {
    constructor() {
        // Initialize Supabase client reference
        this.supabase = null;
        this.initializeSupabase();
    }

    initializeSupabase() {
        // Try to get the global Supabase client
        if (window.supabase) {
            this.supabase = window.supabase;
        } else {
            // Wait for it to be available
            const checkSupabase = setInterval(() => {
                if (window.supabase) {
                    this.supabase = window.supabase;
                    clearInterval(checkSupabase);
                }
            }, 100);
            
            // Stop checking after 10 seconds
            setTimeout(() => {
                clearInterval(checkSupabase);
            }, 10000);
        }
    }

    async fetchUsers() {
        try {
            // Wait for Supabase client to be available
            if (!this.supabase) {
                console.log('Waiting for Supabase client to be available...');
                await new Promise(resolve => {
                    const checkSupabase = setInterval(() => {
                        if (this.supabase) {
                            clearInterval(checkSupabase);
                            resolve();
                        }
                    }, 100);
                    
                    // Timeout after 10 seconds
                    setTimeout(() => {
                        clearInterval(checkSupabase);
                        resolve();
                    }, 10000);
                });
            }
            
            // Check if Supabase client is available after waiting
            if (!this.supabase) {
                console.error('Supabase client not available after waiting');
                return [];
            }
            
            // Check if auth is available
            if (!this.supabase.auth) {
                console.error('Supabase auth not available');
                return [];
            }
            
            // Confirm current user session exists
            const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
            if (sessionError) {
                console.error('Could not get current session:', sessionError);
                return [];
            }

            if (!session?.user?.id) {
                console.log('No current user session found, returning empty array');
                return [];
            }

            // Fetch all rows user is authorized to see (RLS handles filtering)
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching users:', error);
            return [];
        }
    }

    async createUser(userData) {
        try {
            // Check if Supabase client is available
            if (!this.supabase) {
                throw new Error('Supabase client not available');
            }
            
            const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';

            // Check if auth is available
            if (!this.supabase.auth) {
                throw new Error('Supabase auth not available');
            }
            
            // Get current user id from session
            const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
            if (sessionError) {
                throw new Error('Could not get current session: ' + sessionError.message);
            }
            const currentUserId = session?.user?.id;
            if (!currentUserId) {
                throw new Error('No current user session found.');
            }

            // Build metadata object
            const metadata = {
                username: userData.username,
                role: userData.role,
                created_by: currentUserId
            };

            const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
            const baseDomain = isLocalhost ? "http://localhost:3000" : "https://walakasoftware.com";

            const { data: { user }, error: signUpError } = await this.supabase.auth.signUp({
                email: userData.email,
                password: randomPassword,
                options: {
                    emailRedirectTo: `${baseDomain}/usermanagement-vanilla/setup-password.html`,
                    data: metadata
                }
            });

            if (signUpError) {
                console.error('Auth signUp failed:', signUpError);
                throw signUpError;
            }

            return { auth: user };
        } catch (error) {
            console.error('Invite failed:', error.message);
            throw error;
        }
    }

    async updateUser(userId, updates) {
        try {
            // Check if Supabase client is available
            if (!this.supabase) {
                throw new Error('Supabase client not available');
            }
            
            const { data, error } = await this.supabase
                .from('users')
                .update(updates)
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
            // Check if Supabase client is available
            if (!this.supabase) {
                throw new Error('Supabase client not available');
            }
            
            const { error } = await this.supabase
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

    async toggleUserStatus(userId) {
        try {
            if (!this.supabase) {
                throw new Error('Supabase client not available');
            }
            // Get current user status
            const { data: user, error: fetchError } = await this.supabase
                .from('users')
                .select('status')
                .eq('id', userId)
                .single();
            if (fetchError) throw fetchError;
            const newStatus = user.status === 'active' ? 'inactive' : 'active';
            const { data: updatedUser, error: updateError } = await this.supabase
                .from('users')
                .update({ status: newStatus })
                .eq('id', userId)
                .select()
                .single();
            if (updateError) throw updateError;
            return updatedUser;
        } catch (error) {
            console.error('Error toggling user status:', error);
            throw error;
        }
    }

    async getCurrentUserProfile() {
        if (!this.supabase) return null;
        const { data: { session } } = await this.supabase.auth.getSession();
        if (!session?.user?.id) return null;
        const { data, error } = await this.supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single();
        if (error) return null;
        return data;
    }
}

// Note: If you see a GoTrueClient warning, ensure you only create the Supabase client once and reuse it across your app.

const api = new API();
export { api };