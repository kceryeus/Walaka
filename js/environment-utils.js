let cachedEnvironmentId = null;

async function getCurrentEnvironmentId(forceRefresh = false) {
    if (cachedEnvironmentId && !forceRefresh) return cachedEnvironmentId;

    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session || !session.user) throw new Error('Not authenticated');

    const { data: user, error } = await window.supabase
        .from('users')
        .select('environment_id')
        .eq('id', session.user.id)
        .single();

    if (error) throw error;
    cachedEnvironmentId = user.environment_id;
    return cachedEnvironmentId;
}

function clearCachedEnvironmentId() {
    cachedEnvironmentId = null;
}
window.clearCachedEnvironmentId = clearCachedEnvironmentId;

window.getCurrentEnvironmentId = getCurrentEnvironmentId;

// New: Get parent environment if user is a child
let cachedEffectiveEnvironmentId = null;
async function getEffectiveEnvironmentId(forceRefresh = false) {
    if (cachedEffectiveEnvironmentId && !forceRefresh) return cachedEffectiveEnvironmentId;
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session || !session.user) throw new Error('Not authenticated');
    // Fetch current user
    const { data: user, error } = await window.supabase
        .from('users')
        .select('environment_id, created_by')
        .eq('id', session.user.id)
        .single();
    if (error) throw error;
    let environment_id = user.environment_id;
    if (user.created_by) {
        const { data: parent, error: parentError } = await window.supabase
            .from('users')
            .select('environment_id')
            .eq('id', user.created_by)
            .single();
        if (parentError) throw parentError;
        environment_id = parent.environment_id;
    }
    cachedEffectiveEnvironmentId = environment_id;
    return environment_id;
}
window.getEffectiveEnvironmentId = getEffectiveEnvironmentId;

window.getEffectiveEnvironmentId = async function() {
    // Use window.supabase (should be initialized globally)
    const { data: { session } } = await window.supabase.auth.getSession();
    if (!session || !session.user) return null;
    const userId = session.user.id;
    const { data: userRow } = await window.supabase
        .from('users')
        .select('created_by, environment_id')
        .eq('id', userId)
        .single();
    if (userRow && userRow.created_by) {
        // Fetch parent's environment_id
        const { data: parentRow } = await window.supabase
            .from('users')
            .select('environment_id')
            .eq('id', userRow.created_by)
            .single();
        return parentRow ? parentRow.environment_id : userRow.environment_id;
    }
    return userRow ? userRow.environment_id : null;
}; 