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

    suggestionsBox.innerHTML = clients.map((client, idx) => `
        <div class="suggestion-item" data-client='${JSON.stringify(client)}' tabindex="0" data-index="${idx}">
            ${client.customer_name || ''} ${client.customer_tax_id ? `(${client.customer_tax_id})` : ''}
        </div>
    `).join('');

    suggestionsBox.style.display = 'block';

    // Remove any previous event listeners by replacing the node
    const newBox = suggestionsBox.cloneNode(true);
    suggestionsBox.parentNode.replaceChild(newBox, suggestionsBox);

    // Add click handlers for suggestions
    newBox.querySelectorAll('.suggestion-item').forEach(item => {
        item.addEventListener('click', function(e) {
            const client = JSON.parse(this.dataset.client);
            fillClientFields(client);
            document.getElementById('client-list').value = client.customer_name;
            hideClientSuggestions();
        });
    });

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

async function saveNewClient(clientData) {
    try {
        const { data, error } = await window.supabase.from('clients').insert([clientData]).select();
        if (error) throw error;
        showNotification('Client added!');
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
