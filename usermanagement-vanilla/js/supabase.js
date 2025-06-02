import { config } from './config.js';

// Initialize a single Supabase client instance
const supabaseClient = supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

export { supabaseClient }; 