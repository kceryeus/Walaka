import { supabase } from '../auth.js';

export async function logUserAction(action_type, description = '', details = null) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const user_id = session && session.user ? session.user.id : null;
    const payload = {
      user_id,
      action_type,
      description,
      details: details ? JSON.stringify(details) : null,
      timestamp: new Date().toISOString(),
    };
    await supabase.from('logs').insert([payload]);
  } catch (err) {
    console.error('[logUserAction] Failed to log action:', err);
  }
}

// Optionally attach to window for non-module scripts
if (typeof window !== 'undefined') {
  window.logUserAction = logUserAction;
} 