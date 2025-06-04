import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.0.0/+esm';

const supabaseUrl = 'https://qvmtozjvjflygbkjecyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo';

// Initialize the Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Export both the initialized client and the raw values
export { supabaseClient, supabaseUrl, supabaseKey };

// API functions
export async function createUser(userData) {
    try {
        const { data, error } = await supabaseClient
            .from('users')
            .insert([userData])
            .select();

        if (error) throw error;
        return data[0];
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
}
