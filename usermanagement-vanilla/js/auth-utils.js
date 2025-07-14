// Shared authentication utilities

window.checkFirstTimeLogin = async function(supabase, userId) {
    try {
        const [
            { data: userData, error: userError },
            { data: authData, error: authError }
        ] = await Promise.all([
            supabase
                .from('users')
                .select('language, preferences')
                .eq('id', userId)
                .single(),
            supabase
                .from('auth.users')
                .select('refreshed_at')
                .eq('id', userId)
                .single()
        ]);

        if (userError) throw userError;
        if (authError) throw authError;

        // First time login if no refresh history and missing profile data
        return !authData.refreshed_at && (!userData.language || !userData.preferences);
    } catch (error) {
        console.error('Error checking first time login:', error);
        return false;
    }
} 