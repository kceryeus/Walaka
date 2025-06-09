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
            // 1. Check if email already exists in user_management (NOT public.users)
            const { data: existingMeta, error: metaError } = await this.supabase
                .from('user_management')
                .select('id')
                .eq('email', userData.email)
                .maybeSingle();
            if (metaError) throw metaError;
            if (existingMeta) {
                throw new Error('A user with this email already exists in the system.');
            }

            // 2. Insert metadata into user_management
            const { data: userSession } = await this.supabase.auth.getUser();
            const creatorId = userSession?.user?.id || null;
            const { data: mgmtData, error: mgmtError } = await this.supabase
                .from('user_management')
                .insert([
                    {
                        username: userData.username,
                        email: userData.email,
                        role: userData.role,
                        status: 'pending',
                        created_by: creatorId
                    }
                ])
                .select()
                .single();
            if (mgmtError) {
                console.error('Supabase user_management insert error:', mgmtError, JSON.stringify(mgmtError));
                throw mgmtError;
            }

            // 3. Register user in Supabase Auth (send invite email)
            const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: userData.email,
                password: randomPassword,
                options: {
                    emailRedirectTo: 'http://localhost:5505/usermanagement-vanilla/setup-password.html',
                    data: {
                        username: userData.username,
                        role: userData.role
                    }
                }
            });
            if (authError) {
                console.error('Supabase Auth signUp error:', authError, JSON.stringify(authError));
                throw authError;
            }

            return { user_management: mgmtData, auth: authData };
        } catch (error) {
            // Improved error logging
            console.error('Error creating user:', error, JSON.stringify(error));
            throw error;
        }
    }

    async createUserInUsersTable(userData) {
        try {
            // Get the current authenticated user
            const { data: userSession } = await this.supabase.auth.getUser();
            const creatorId = userSession?.user?.id || null;

            // Insert into public.users table
            const { data, error } = await this.supabase
                .from('users')
                .insert([
                    {
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