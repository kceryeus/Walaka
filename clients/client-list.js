/**
 * Client List Handler
 * Manages the client list functionality
 */

// Make initialization function globally available
window.initClientList = async () => {
  try {
    await initSearchAndFilters();
    await initViewToggle();
    await initDeleteModal();
    await initPagination();
    await refreshClientList();
  } catch (error) {
    console.error('Error initializing client list:', error);
  }
};

// Global variables for list state
let currentPage = 1;
const pageSize = 10;
let filteredClients = [];
let allClients = [];
let searchQuery = '';
let statusFilter = 'all';
let typeFilter = 'all';
let viewMode = 'grid';

/**
 * Fetch clients from Supabase
 */
async function fetchClientsFromSupabase() {
  try {
    if (!window.supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await window.supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching clients:', error);
      return [];
    }

    console.log('Fetched clients (RLS enforced):', data);
    return data || [];
  } catch (err) {
    console.error('Error fetching clients:', err);
    showErrorMessage('Error fetching clients: ' + (err.message || err));
    return [];
  }
}

/**
 * Initialize search and filter functionality
 */
function initSearchAndFilters() {
  const searchInput = document.getElementById('client-search');
  const statusFilterSelect = document.getElementById('status-filter');
  const typeFilterSelect = document.getElementById('type-filter');
  
  if (!searchInput || !statusFilterSelect || !typeFilterSelect) return;
  
  // Setup search debounce
  searchInput.addEventListener('input', window.appUtils.debounce(() => {
    searchQuery = searchInput.value.toLowerCase().trim();
    currentPage = 1; // Reset to first page on search
    refreshClientList();
  }, 300));
  
  // Setup status filter
  statusFilterSelect.addEventListener('change', () => {
    statusFilter = statusFilterSelect.value;
    currentPage = 1; // Reset to first page on filter change
    refreshClientList();
  });
  
  // Setup type filter
  typeFilterSelect.addEventListener('change', () => {
    typeFilter = typeFilterSelect.value;
    currentPage = 1; // Reset to first page on filter change
    refreshClientList();
  });
}

/**
 * Initialize view toggle (grid/list)
 */
function initViewToggle() {
  const gridViewBtn = document.getElementById('grid-view-btn');
  const listViewBtn = document.getElementById('list-view-btn');
  const clientList = document.getElementById('client-list');
  
  if (!gridViewBtn || !listViewBtn || !clientList) return;
  
  // Set initial view from localStorage or default to grid
  viewMode = localStorage.getItem('client-view-mode') || 'grid';
  updateViewMode(viewMode);
  
  // Grid view button
  gridViewBtn.addEventListener('click', () => {
    updateViewMode('grid');
  });
  
  // List view button
  listViewBtn.addEventListener('click', () => {
    updateViewMode('list');
  });
  
  // Helper to update view mode
  function updateViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('client-view-mode', mode);
    
    // Update buttons
    gridViewBtn.classList.toggle('active', mode === 'grid');
    listViewBtn.classList.toggle('active', mode === 'list');
    
    // Update list class
    clientList.className = `client-list ${mode}-view`;
    
    // Refresh list to apply the new view
    refreshClientList();
  }
}

/**
 * Initialize delete confirmation modal
 */
function initDeleteModal() {
  const deleteModal = document.getElementById('delete-modal');
  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  const closeModalBtns = document.querySelectorAll('.close-modal');
  
  if (!deleteModal || !confirmDeleteBtn || !cancelDeleteBtn) return;
  
  let clientToDelete = null;
  
  // Setup delete client function for external access
  window.deleteClient = (clientId) => {
    clientToDelete = clientId;
    deleteModal.classList.add('active');
  };
  
  // Confirm delete button
  confirmDeleteBtn.addEventListener('click', () => {
    if (clientToDelete) {
      // Delete the client
      const success = removeClient(clientToDelete);
      if (success) {
        window.appUtils.showToast('Client deleted successfully', 'success');
        refreshClientList();
      } else {
        window.appUtils.showToast('Error deleting client', 'error');
      }
      clientToDelete = null;
    }
    deleteModal.classList.remove('active');
  });
  
  // Cancel delete button
  cancelDeleteBtn.addEventListener('click', () => {
    clientToDelete = null;
    deleteModal.classList.remove('active');
  });
  
  // Close modal buttons
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      clientToDelete = null;
      deleteModal.classList.remove('active');
    });
  });
}

/**
 * Initialize pagination controls
 */
function initPagination() {
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  
  if (!prevPageBtn || !nextPageBtn || !pageInfo) return;
  
  // Previous page button
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      refreshClientList();
    }
  });
  
  // Next page button
  nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredClients.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      refreshClientList();
    }
  });
}

/**
 * Update pagination controls
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 */
function updatePaginationControls(currentPage, totalPages) {
  const pageInfo = document.getElementById('page-info');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  
  if (!pageInfo || !prevPageBtn || !nextPageBtn) return;
  
  pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= totalPages;
}

/**
 * Show error message in the client list container
 * @param {string} message - Error message to display
 */
function showErrorMessage(message) {
  const clientList = document.getElementById('client-list');
  if (!clientList) return;
  
  clientList.innerHTML = `
    <div class="error-state">
      <i class="fas fa-exclamation-circle"></i>
      <h3>Error</h3>
      <p>${message}</p>
    </div>
  `;
}

/**
 * Get client by ID from Supabase
 * @param {string} clientId - ID of client to retrieve
 * @returns {Promise<Object|null>} - Client data or null if not found
 */
async function getClientById(clientId) {
  try {
    if (!window.supabase) {
      throw new Error('Supabase client not initialized');
    }
    const environment_id = await window.getCurrentEnvironmentId();
    const { data, error } = await window.supabase
      .from('clients')
      .select('*')
      .eq('customer_id', clientId)
      .eq('environment_id', environment_id)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching client:', error);
    return null;
  }
}

// Make getClientById globally available
window.getClientById = getClientById;

/**
 * Render client list
 * @param {Array} clients - Array of clients to render
 */
function renderClientList(clients) {
  const clientList = document.getElementById('client-list');
  if (!clientList) return;
  
  // Clear existing content
  clientList.innerHTML = '';
  
  if (!clients || clients.length === 0) {
    clientList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-users"></i>
        <h3>No clients found</h3>
        <p>Try adjusting your search or filters, or add a new client.</p>
      </div>
    `;
    return;
  }
  
  // Render each client
  clients.forEach(client => {
    const clientElement = document.createElement('div');
    clientElement.className = 'client-item';
    clientElement.innerHTML = `
      <div class="client-info">
        <div class="client-header">
          <span class="status-badge ${client.status || 'active'}">${client.status || 'Active'}</span>
          <span class="client-type-badge ${client.client_type}">${client.client_type === 'business' ? 'Business' : 'Individual'}</span>
        </div>
        <h4>${client.customer_name || 'N/A'}</h4>
        <p><strong>NIF/NUIT:</strong> ${client.customer_tax_id || 'N/A'}</p>
        <p><strong>Contact:</strong> ${client.contact || 'N/A'}</p>
        <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
        <p><strong>Phone:</strong> ${client.telephone || 'N/A'}</p>
        <p><strong>Address:</strong> ${client.billing_address || 'N/A'}</p>
      </div>
      <div class="client-actions">
        <button class="status-toggle-btn" onclick="toggleClientStatus('${client.customer_id}', '${client.status || 'active'}')" 
                title="Toggle client status">
          <i class="fas ${client.status === 'inactive' ? 'fa-toggle-off' : 'fa-toggle-on'}"></i>
          ${client.status === 'inactive' ? 'Activate' : 'Deactivate'}
        </button>
        <button class="edit-btn" onclick="editClient('${client.customer_id}')" title="Edit client">
          <i class="fas fa-edit"></i>
        </button>
      </div>
    `;
    clientList.appendChild(clientElement);
  });
}

/**
 * Toggle client status between active and inactive
 * @param {string} clientId - ID of the client
 * @param {string} currentStatus - Current status of the client
 */
async function toggleClientStatus(clientId, currentStatus) {
  try {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const environment_id = await window.getCurrentEnvironmentId();
    const { error } = await window.supabase
      .from('clients')
      .update({ status: newStatus })
      .eq('customer_id', clientId)
      .eq('environment_id', environment_id);
    if (error) throw error;
    window.appUtils.showToast(`Client ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
    refreshClientList();
  } catch (error) {
    console.error('Error toggling client status:', error);
    window.appUtils.showToast('Error updating client status', 'error');
  }
}

// Add this to the window object for global access
window.toggleClientStatus = toggleClientStatus;

/**
 * Refresh the client list with current filters and pagination
 */
async function refreshClientList() {
  try {
    const clientList = document.getElementById('client-list');
    if (!clientList) return;

    // Show loading state
    clientList.innerHTML = `
      <div class="loading-indicator">
        <i class="fas fa-spinner fa-spin"></i>
        <span>Loading clients...</span>
      </div>
    `;

    // Fetch fresh data
    allClients = await fetchClientsFromSupabase();

    // Apply filters
    filteredClients = allClients.filter(client => {
      if (statusFilter !== 'all' && client.status !== statusFilter) {
        return false;
      }
      if (typeFilter !== 'all' && client.client_type !== typeFilter) {
        return false;
      }
      if (searchQuery) {
        const searchFields = [
          client.company_name,
          client.contact,
          client.email,
          client.customer_tax_id,
          client.billing_address,
          client.city
        ].filter(Boolean).map(field => field.toLowerCase());
        return searchFields.some(field => field.includes(searchQuery));
      }
      return true;
    });

    // Update pagination
    const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
    currentPage = Math.min(currentPage, totalPages);
    
    // Update pagination controls
    updatePaginationControls(currentPage, totalPages);

    // Get current page of clients
    const startIndex = (currentPage - 1) * pageSize;
    const currentPageClients = filteredClients.slice(startIndex, startIndex + pageSize);

    // Render clients
    renderClientList(currentPageClients);

  } catch (error) {
    console.error('Error refreshing client list:', error);
    showErrorMessage('Failed to load clients. Please try again later.');
  }
}

// Make refresh function globally available
window.refreshClientList = refreshClientList;

// Update the deleteClient function
async function deleteClient(clientId) {
  try {
    const environment_id = await window.getCurrentEnvironmentId();
    const { error } = await window.supabase
      .from('clients')
      .delete()
      .eq('customer_id', clientId)
      .eq('environment_id', environment_id);
    if (error) throw error;
    window.appUtils.showToast('Client deleted successfully', 'success');
    refreshClientList();
  } catch (error) {
    console.error('Error deleting client:', error);
    window.appUtils.showToast('Error deleting client: ' + error.message, 'error');
  }
}
