import { supabase } from '../auth.js';

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
    tr.innerHTML = `
      <td>${new Date(log.timestamp).toLocaleString()}</td>
      <td>${log.users?.username || log.user_id}</td>
      <td>${log.action_type}</td>
      <td>${log.description}</td>
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