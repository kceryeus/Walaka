// Basic authentication handler
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const supabaseUrl = 'https://qvmtozjvjflygbkjecyj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo';
const supabase = createClient(supabaseUrl, supabaseKey);

class AuthHandler {
    constructor() {
        this.user = null;
        this.setupAuthStateChange();
    }

    async initialize() {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            this.user = session?.user || null;
            return !!this.user;
        } catch (error) {
            console.error('Auth error:', error);
            return false;
        }
    }

    setupAuthStateChange() {
        supabase.auth.onAuthStateChange((event, session) => {
            this.user = session?.user || null;
            if (event === 'SIGNED_OUT') {
                window.location.href = '../login.html';
            }
        });
    }

    getCurrentUser() {
        return this.user;
    }
}

const authHandler = new AuthHandler();
export default authHandler;
