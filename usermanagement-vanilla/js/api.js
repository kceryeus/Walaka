// Simple API class for user management
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://qvmtozjvjflygbkjecyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo';
const supabase = createClient(supabaseUrl, supabaseKey);

class API {
    constructor() {
        this.supabase = supabase;
    }

    async fetchUsers() {
        try {
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

            // Build metadata object
            const metadata = {
                username: userData.username,
                role: userData.role
            };
            if (userData.created_by) {
                metadata.created_by = userData.created_by;
            }

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

    async createUserInUsersTable(userData) {
        try {
            // Get the current authenticated user
            const { data: userSession } = await this.supabase.auth.getUser();
            const creatorId = userSession?.user?.id || null;

            // Insert into public.users table
            // The id should be set to the Supabase Auth user id (userData.id)
            // created_by is set to the current user's id (creatorId)
            const { data, error } = await this.supabase
                .from('users')
                .insert([
                    {
                        id: userData.id, // This should be the id from Supabase Auth
                        username: userData.username,
                        email: userData.email,
                        role: userData.role,
                        created_by: creatorId // Set the creator's user id
                    }
                ])
                .select()
                .single();
            if (error) {
                console.error('Supabase users insert error:', error, JSON.stringify(error));
                throw error;
            }
            return data;
        } catch (error) {
            console.error('Error creating user in users table:', error, JSON.stringify(error));
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