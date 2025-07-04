// Simple API class for user management
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
// import { createUserWithEnvironment } from '../../js/auth-utils.js';

const supabaseUrl = 'https://qvmtozjvjflygbkjecyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo';
const supabase = createClient(supabaseUrl, supabaseKey);

class API {
    constructor() {
        this.supabase = supabase;
    }

    async fetchUsers() {
        try {
            // Confirm current user session exists
            const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
            if (sessionError) throw new Error('Could not get current session: ' + sessionError.message);

            if (!session?.user?.id) throw new Error('No current user session found.');

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
            const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';

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

            const { data: { user }, error: signUpError } = await this.supabase.auth.signUp({
                email: userData.email,
                password: randomPassword,
                options: {
                    emailRedirectTo: 'http://localhost:3000/usermanagement-vanilla/setup-password.html',
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
}

// Note: If you see a GoTrueClient warning, ensure you only create the Supabase client once and reuse it across your app.

const api = new API();
export { api };