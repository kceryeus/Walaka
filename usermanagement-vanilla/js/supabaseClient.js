// Use the global Supabase client from the CDN
// Assumes <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> is loaded in HTML

if (!window.supabase) {
  window.supabase = window.createClient(
    'https://qvmtozjvjflygbkjecyj.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      }
    }
  );
}

// Auth state change listener is now handled by auth.js
/*
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
        window.location.href = '/login.html';
    }
});
*/ 