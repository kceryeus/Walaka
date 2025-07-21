// clients.js
// Client autocomplete and management utilities for the invoice module

function showClientSuggestions(clients) {
    const clientInput = document.getElementById('client-list');
    if (!clientInput) return;

    let suggestionsBox = clientInput.parentNode.querySelector('.client-suggestions');
    if (!suggestionsBox) {
        suggestionsBox = document.createElement('div');
        suggestionsBox.className = 'client-suggestions';
        clientInput.parentNode.appendChild(suggestionsBox);
    }

    let html = '';
    if (clients.length > 0) {
        html += clients.map((client, idx) => `
            <div class="suggestion-item" data-client='${JSON.stringify(client)}' tabindex="0" data-index="${idx}">
                <span>${client.customer_name || ''} ${client.customer_tax_id ? `(${client.customer_tax_id})` : ''}</span>
                <button type="button" class="use-this-client-btn" data-client='${JSON.stringify(client)}'>Use this client</button>
            </div>
        `).join('');
    } else {
        html += '<div class="no-suggestions">No clients found.</div>';
    }
    // Always show add new client button
    html += '<button type="button" class="add-new-client-btn">Add New Client</button>';
    suggestionsBox.innerHTML = html;
    suggestionsBox.style.display = 'block';

    // Remove any previous event listeners by replacing the node
    const newBox = suggestionsBox.cloneNode(true);
    suggestionsBox.parentNode.replaceChild(newBox, suggestionsBox);

    // Add click handlers for use-this-client
    newBox.querySelectorAll('.use-this-client-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const client = JSON.parse(this.dataset.client);
            fillClientFields(client);
            document.getElementById('client-list').value = client.customer_name;
            hideClientSuggestions();
        });
    });
    // Add click handler for add-new-client
    const addBtn = newBox.querySelector('.add-new-client-btn');
    if (addBtn) {
        addBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            if (window.openModal) window.openModal('newClientModal');
        });
    }
    // Highlight the first suggestion by default
    const firstItem = newBox.querySelector('.suggestion-item');
    if (firstItem) firstItem.classList.add('active');
}

function hideClientSuggestions() {
    const suggestionsBox = document.querySelector('.client-suggestions');
    if (suggestionsBox) {
        suggestionsBox.style.display = 'none';
    }
}

function fillClientFields(client) {
    const fields = {
        'client-list': client.customer_name || client.customer_name,
        'clientEmail': client.email,
        'clientAddress': client.billing_address,
        'clientTaxId': client.customer_tax_id || client.nuit
    };
    Object.keys(fields).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = fields[id] || '';
    });
}

// Patch saveNewClient to update window.clients and refresh suggestions
async function saveNewClient(clientData) {
    try {
        const { data, error } = await window.supabase.from('clients').insert([clientData]).select();
        if (error) throw error;
        showNotification('Client added!');
        // Update window.clients
        if (!window.clients) window.clients = [];
        window.clients.push(data[0]);
        // Store in window.lastCreatedClient and localStorage (1 min expiry)
        window.lastCreatedClient = data[0];
        localStorage.setItem('lastCreatedClient', JSON.stringify({client: data[0], ts: Date.now()}));
        console.log('[saveNewClient] Saved client:', data[0]);
        // Refresh suggestions and auto-select new client
        showClientSuggestions([data[0]]);
        fillClientFields(data[0]);
        document.getElementById('client-list').value = data[0].customer_name;
        hideClientSuggestions();
        return data && data[0];
    } catch (err) {
        showNotification('Error adding client');
        console.error('Error saving new client:', err);
        return null;
    }
}

function setupClientAutocomplete() {
    const clientInput = document.getElementById('client-list');
    if (!clientInput) return;
    clientInput.addEventListener('input', async function() {
        const searchTerm = this.value.toLowerCase().trim();
        if (searchTerm.length < 2) {
            hideClientSuggestions();
            return;
        }
        try {
            const { data: clients, error } = await window.supabase
                .from('clients')
                .select('*')
                .ilike('customer_name', `%${searchTerm}%`)
                .limit(5);
            if (error) throw error;
            if (clients.length > 0) {
                showClientSuggestions(clients);
            } else {
                hideClientSuggestions();
            }
        } catch (err) {
            console.error('Error fetching clients:', err);
        }
    });
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.showClientSuggestions = showClientSuggestions;
    window.hideClientSuggestions = hideClientSuggestions;
    window.fillClientFields = fillClientFields;
    window.saveNewClient = saveNewClient;
    window.setupClientAutocomplete = setupClientAutocomplete;
}

// Fetch all clients on page load and store in window.clients
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async function() {
        try {
            const { data: clients, error } = await window.supabase
                .from('clients')
                .select('*');
            if (error) throw error;
            window.clients = clients || [];
            console.log('[clients.js] Loaded clients:', window.clients.length);
        } catch (err) {
            window.clients = [];
            console.error('[clients.js] Error loading clients:', err);
        }
    });
}

// Robustly attach useClientBtn handler whenever it appears in the DOM
function attachUseClientBtnHandler() {
    const useClientBtn = document.getElementById('useClientBtn');
    if (useClientBtn && !useClientBtn._handlerAttached) {
        console.log('[useClientBtn] Attaching handler to button');
        useClientBtn._handlerAttached = true;
        useClientBtn.addEventListener('click', function() {
            console.log('[useClientBtn] Button clicked');
            let client = null;
            // 1. Try data attribute
            if (useClientBtn.dataset.client) {
                try {
                    client = JSON.parse(useClientBtn.dataset.client);
                    console.log('[useClientBtn] Got client from data-client attribute:', client);
                } catch (e) {
                    console.warn('[useClientBtn] Failed to parse data-client attribute:', e);
                }
            }
            // 2. Try window.lastCreatedClient
            if (!client && window.lastCreatedClient) {
                client = window.lastCreatedClient;
                console.log('[useClientBtn] Got client from window.lastCreatedClient:', client);
            }
            // 3. Try localStorage (1 min expiry)
            if (!client) {
                const cached = localStorage.getItem('lastCreatedClient');
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        if (parsed && parsed.client && parsed.ts && (Date.now() - parsed.ts < 60*1000)) {
                            client = parsed.client;
                            console.log('[useClientBtn] Got client from localStorage:', client);
                        } else {
                            localStorage.removeItem('lastCreatedClient');
                            console.log('[useClientBtn] localStorage expired or invalid.');
                        }
                    } catch (e) {
                        console.warn('[useClientBtn] Failed to parse localStorage:', e);
                    }
                } else {
                    console.log('[useClientBtn] No client in localStorage.');
                }
            }
            if (client) {
                console.log('[useClientBtn] Filling client fields with:', client);
                if (typeof fillClientFields === 'function') fillClientFields(client);
                if (document.getElementById('client-list')) document.getElementById('client-list').value = client.customer_name;
                if (window.modalManager && typeof window.modalManager.closeModal === 'function') {
                    window.modalManager.closeModal('newClientModal');
                    console.log('[useClientBtn] Closed newClientModal.');
                }
            } else {
                showNotification('Could not find client data to use.', 'error');
                console.error('[useClientBtn] Could not find client data to use.');
            }
        });
    } else if (!useClientBtn) {
        // Only log if not found
        // console.log('[useClientBtn] Button not found in DOM.');
    }
}

// Attach on DOMContentLoaded and whenever the button appears
attachUseClientBtnHandler();
const observer = new MutationObserver(attachUseClientBtnHandler);
observer.observe(document.body, { childList: true, subtree: true });
