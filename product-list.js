/**
 * Product List Handler
 * Manages the product list functionality
 */

import { getCurrentEnvironmentId } from './js/environment-utils.js';

// Make initialization function globally available
window.initProductList = async () => {
  try {
    await initSearchAndFilters();
    await initViewToggle();
    await initDeleteModal();
    await initPagination();
    await refreshProductList();
  } catch (error) {
    console.error('Error initializing product list:', error);
  }
};

// Global variables for list state
let currentPage = 1;
const pageSize = 10;
let filteredProducts = [];
let allProducts = [];
let searchQuery = '';
let industryFilter = 'all';
let vatFilter = 'all';
let viewMode = 'grid';

/**
 * Fetch products from Supabase
 */
async function fetchProductsFromSupabase() {
  try {
    if (!window.supabase) {
      throw new Error('Supabase client not initialized');
    }
    const environment_id = await getCurrentEnvironmentId();
    const { data, error } = await window.supabase
      .from('products')
      .select('*')
      .eq('environment_id', environment_id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching products:', err);
    return [];
  }
}

/**
 * Initialize search and filter functionality
 */
function initSearchAndFilters() {
  const searchInput = document.getElementById('product-search');
  const industryFilterSelect = document.getElementById('industry-filter');
  const vatFilterSelect = document.getElementById('vat-filter');
  
  if (!searchInput || !industryFilterSelect || !vatFilterSelect) return;
  
  // Setup search debounce
  searchInput.addEventListener('input', window.appUtils.debounce(() => {
    searchQuery = searchInput.value.toLowerCase().trim();
    currentPage = 1; // Reset to first page on search
    refreshProductList();
  }, 300));
  
  // Setup industry filter
  industryFilterSelect.addEventListener('change', () => {
    industryFilter = industryFilterSelect.value;
    currentPage = 1; // Reset to first page on filter change
    refreshProductList();
  });
  
  // Setup VAT filter
  vatFilterSelect.addEventListener('change', () => {
    vatFilter = vatFilterSelect.value;
    currentPage = 1; // Reset to first page on filter change
    refreshProductList();
  });
}

/**
 * Initialize view toggle (grid/list)
 */
function initViewToggle() {
  const gridViewBtn = document.getElementById('grid-view-btn');
  const listViewBtn = document.getElementById('list-view-btn');
  const productList = document.getElementById('product-list');
  
  if (!gridViewBtn || !listViewBtn || !productList) return;
  
  // Set initial view from localStorage or default to grid
  viewMode = localStorage.getItem('product-view-mode') || 'grid';
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
    localStorage.setItem('product-view-mode', mode);
    
    // Update buttons
    gridViewBtn.classList.toggle('active', mode === 'grid');
    listViewBtn.classList.toggle('active', mode === 'list');
    
    // Update list class
    productList.className = `product-list ${mode}-view`;
    
    // Refresh list to apply the new view
    refreshProductList();
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
  
  let productToDelete = null;
  
  // Setup delete product function for external access
  window.deleteProduct = async (productId) => {
    try {
      const environment_id = await getCurrentEnvironmentId();
      const { error } = await window.supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('environment_id', environment_id);
      if (error) throw error;
      window.appUtils.showToast('Product deleted successfully', 'success');
      refreshProductList();
    } catch (error) {
      console.error('Error deleting product:', error);
      window.appUtils.showToast('Error deleting product', 'error');
    }
  };
  
  // Confirm delete button
  confirmDeleteBtn.addEventListener('click', async () => {
    if (productToDelete) {
      try {
        await window.deleteProduct(productToDelete);
      } catch (error) {
        console.error('Error confirming delete:', error);
        window.appUtils.showToast('Error confirming delete', 'error');
      }
      productToDelete = null;
    }
    deleteModal.classList.remove('active');
  });
  
  // Cancel delete button
  cancelDeleteBtn.addEventListener('click', () => {
    productToDelete = null;
    deleteModal.classList.remove('active');
  });
  
  // Close modal buttons
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      productToDelete = null;
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
      refreshProductList();
    }
  });
  
  // Next page button
  nextPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredProducts.length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      refreshProductList();
    }
  });
}

/**
 * Update pagination controls
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
 * Format currency value
 */
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-MZ', {
    style: 'currency',
    currency: 'MZN'
  }).format(value);
}

/**
 * Format VAT rate for display
 */
function formatVatRate(vat) {
  return `${(vat * 100).toFixed(0)}%`;
}

/**
 * Render product list
 */
function renderProductList(products) {
  const productList = document.getElementById('product-list');
  if (!productList) return;

  if (products.length === 0) {
    productList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-box-open"></i>
        <h3>No Products Found</h3>
        <p>Add your first product to get started</p>
      </div>
    `;
    return;
  }

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const productsToShow = products.slice(startIndex, endIndex);

  productList.innerHTML = productsToShow.map(product => `
    <div class="product-card">
      <div class="product-header">
        <h3>${product.description}</h3>
        <div class="product-actions">
          <button onclick="editProduct('${product.id}')" class="icon-btn">
            <i class="fas fa-edit"></i>
          </button>
          <button onclick="deleteProduct('${product.id}')" class="icon-btn danger">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="product-details">
        <div class="detail-item">
          <span class="label">Price:</span>
          <span class="value">${formatCurrency(product.price)}</span>
        </div>
        <div class="detail-item">
          <span class="label">VAT Rate:</span>
          <span class="value">${formatVatRate(product.tax_rate)}</span>
        </div>
        <div class="detail-item">
          <span class="label">Tax Code:</span>
          <span class="value">${product.tax_code}</span>
        </div>
        <div class="detail-item">
          <span class="label">Industry:</span>
          <span class="value">${product.industry}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Update pagination
  const totalPages = Math.ceil(products.length / pageSize);
  updatePaginationControls(currentPage, totalPages);
}

/**
 * Refresh product list
 */
async function refreshProductList() {
  try {
    // Fetch all products if not already loaded
    if (allProducts.length === 0) {
      allProducts = await fetchProductsFromSupabase();
    }

    // Apply filters
    filteredProducts = allProducts.filter(product => {
      const matchesSearch = product.description.toLowerCase().includes(searchQuery) ||
                          product.industry.toLowerCase().includes(searchQuery) ||
                          product.tax_code.toLowerCase().includes(searchQuery);
      
      const matchesIndustry = industryFilter === 'all' || product.industry.toLowerCase() === industryFilter.toLowerCase();
      const matchesVat = vatFilter === 'all' || product.tax_rate.toString() === vatFilter;

      return matchesSearch && matchesIndustry && matchesVat;
    });

    // Render the filtered list
    renderProductList(filteredProducts);
  } catch (error) {
    console.error('Error refreshing product list:', error);
    showErrorMessage('Error loading products. Please try again.');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.initProductList();
}); 