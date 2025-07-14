// Supabase service for handling all database operations
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseService = {
    // User Profile Operations
    async getUserProfile(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();
        
        if (error) throw error;
        return data;
    },

    async updateUserProfile(userId, profileData) {
        const { data, error } = await supabase
            .from('users')
            .update(profileData)
            .eq('id', userId)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    // Business Profile Operations
    async getBusinessProfile(userId) {
        const { data, error } = await supabase
            .from('business_profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) throw error;
        return data;
    },

    async updateBusinessProfile(userId, businessData) {
        const { data, error } = await supabase
            .from('business_profiles')
            .upsert({ user_id: userId, ...businessData })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    // Settings Operations
    async getSettings(userId) {
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) throw error;
        return data;
    },

    async updateSettings(userId, settingsData) {
        const { data, error } = await supabase
            .from('user_settings')
            .upsert({ user_id: userId, ...settingsData })
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },

    // File Upload Operations
    async uploadLogo(userId, file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-logo.${fileExt}`;
        const filePath = `logos/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('business-assets')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('business-assets')
            .getPublicUrl(filePath);

        return publicUrl;
    },

    async deleteLogo(userId, logoUrl) {
        const fileName = logoUrl.split('/').pop();
        const { error } = await supabase.storage
            .from('business-assets')
            .remove([`logos/${fileName}`]);

        if (error) throw error;
    }
}; 