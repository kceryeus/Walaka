// Initialize Supabase client
window.supabase = supabase.createClient(
    'https://qvmtozjvjflygbkjecyj.supabase.co',  // Replace with your Supabase project URL
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2bXRvemp2amZseWdia2plY3lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYxMjc2MjMsImV4cCI6MjA2MTcwMzYyM30.DJMC1eM5_EouM1oc07JaoXsMX_bSLn2AVCozAcdfHmo'             // Replace with your Supabase anon key
);

// Centralized auth check for all protected pages
window.requireAuth = async function requireAuth() {
    try {
        const repoName = 'Walaka';
        const isGitHubPages = window.location.hostname.includes('github.io');
        const basePath = isGitHubPages ? `/${repoName}/` : '/';
        const { data: { session } } = await window.supabase.auth.getSession();
        if (!session || !session.user) {
            window.location.href = basePath + 'login.html';
            throw new Error('Not authenticated');
        }
        return session;
    } catch (error) {
        const repoName = 'Walaka';
        const isGitHubPages = window.location.hostname.includes('github.io');
        const basePath = isGitHubPages ? `/${repoName}/` : '/';
        window.location.href = basePath + 'login.html';
        throw error;
    }
}

// Universal logout handler for all pages
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('a[href="#"], button.logout, .logout-btn').forEach(function(el) {
      if (
        el.textContent.trim().toLowerCase().includes('logout') ||
        el.innerHTML.toLowerCase().includes('fa-sign-out-alt')
      ) {
        el.addEventListener('click', async function(e) {
          e.preventDefault();
          try {
            if (window.supabase && window.supabase.auth) {
              await window.supabase.auth.signOut();
            }
          } catch (err) {
            console.error('Error signing out:', err);
          }
          // No manual redirect here; let onAuthStateChange handle it.
        });
      }
    });
  });
} 