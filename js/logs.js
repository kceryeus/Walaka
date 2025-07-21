import { supabase } from '../auth.js';
import { logUserAction } from './logUserAction.js';

// Add translation loader and helper at the top
let translations = {};
let userLang = localStorage.getItem('preferredLanguage') || navigator.language?.slice(0,2) || 'pt';
if (!['pt','en'].includes(userLang)) userLang = 'pt';
async function loadTranslations() {
  const resp = await fetch(`assets/translations/${userLang}.json`);
  translations = await resp.json();
}
function t(key) {
  return translations[key] || translations[`log_action_${key}`] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

async function isAdmin() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('[logs.js] getSession:', { session, sessionError });
  if (!session || !session.user) {
    console.warn('[logs.js] Nenhuma sessão ou usuário encontrado.');
    return false;
  }
  const { data: user, error: userError } = await supabase.from('users').select('role').eq('id', session.user.id).single();
  console.log('[logs.js] user lookup:', { user, userError });
  return user && user.role === 'admin';
}

async function loadLogs(filter = '') {
  await loadTranslations();
  let query = supabase.from('logs').select('*, users(username)').order('timestamp', { ascending: false }).limit(100);
  if (filter) query = query.eq('action_type', filter);
  const { data: logs, error: logsError } = await query;
  console.log('[logs.js] loadLogs:', { filter, logs, logsError });
  const tbody = document.querySelector('#logsTable tbody');
  const emptyDiv = document.getElementById('logsEmpty');
  tbody.innerHTML = '';
  if (!logs || logs.length === 0) {
    emptyDiv.style.display = 'block';
    return;
  }
  emptyDiv.style.display = 'none';
  logs.forEach(log => {
    const tr = document.createElement('tr');
    if (log.redflag) tr.style.background = '#ffebee';
    // Determine how to render the description
    let desc = '';
    const translatedType = t('log_action_' + log.action_type);
    if (!log.description) {
      desc = translatedType;
    } else {
      // If description is a simple value (like a plan name or payment method), append it
      // If description starts with 'Changed plan to: ', extract the value
      if (log.action_type === 'change_plan' && log.description.startsWith('Changed plan to: ')) {
        desc = `${translatedType}: ${log.description.replace('Changed plan to: ', '')}`;
      } else if (log.action_type === 'select_payment_method' && log.description.startsWith('Selected payment method: ')) {
        desc = `${translatedType}: ${log.description.replace('Selected payment method: ', '')}`;
      } else if (log.action_type === 'page_visit' && log.description.startsWith('User visited page: ')) {
        desc = `${translatedType}: ${log.description.replace('User visited page: ', '')}`;
      } else if (log.action_type === 'choose_plan' && log.description.startsWith('Chose plan: ')) {
        desc = `${translatedType}: ${log.description.replace('Chose plan: ', '')}`;
      } else if (log.action_type === 'complete_payment' && log.description.startsWith('Completed payment for plan: ')) {
        desc = `${translatedType}: ${log.description.replace('Completed payment for plan: ', '')}`;
      } else if (log.action_type === 'save_billing' && log.description.startsWith('Saved billing info')) {
        desc = translatedType;
      } else if (log.action_type === 'cancel_subscription') {
        desc = translatedType;
      } else {
        // If description is not a known pattern, show only the description
        desc = log.description;
      }
    }
    tr.innerHTML = `
      <td>${new Date(log.timestamp).toLocaleString()}</td>
      <td>${log.users?.username || log.user_id}</td>
      <td>${translatedType}</td>
      <td>${desc}</td>
      <td><button class="redflag-btn" data-id="${log.id}" style="color:${log.redflag ? '#b71c1c' : '#888'};background:none;border:none;cursor:pointer;">${log.redflag ? '🚩' : 'Marcar'}</button></td>
    `;
    tbody.appendChild(tr);
  });
  // Adiciona listeners para os botões redflag
  document.querySelectorAll('.redflag-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = btn.getAttribute('data-id');
      const { data: log } = await supabase.from('logs').select('redflag').eq('id', id).single();
      const newFlag = !log.redflag;
      const { error } = await supabase.from('logs').update({ redflag: newFlag }).eq('id', id);
      if (!error) loadLogs(document.getElementById('actionFilter').value);
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Log page visit
  const pageName = window.location.pathname.split('/').pop() || 'unknown';
  logUserAction('page_visit', `User visited page: ${pageName}`);

  // Log major button clicks (buttons with data-log-action attribute)
  document.body.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-log-action]');
    if (btn) {
      const actionType = btn.getAttribute('data-log-action');
      const desc = btn.getAttribute('data-log-desc') || btn.textContent.trim();
      logUserAction(actionType, desc);
    }
  });

  const admin = await isAdmin();
  if (!admin) {
    console.warn('[logs.js] Usuário não é admin ou não autenticado. Redirecionando para login.');
    alert('Acesso restrito a administradores.');
    window.location.href = 'login.html';
    return;
  }
  loadLogs();
  document.getElementById('actionFilter').addEventListener('change', e => loadLogs(e.target.value));
}); 