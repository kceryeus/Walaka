/**
 * WALAKA Invoice Management System
 * This script handles invoice-related functionality
 */

// Function to initialize local storage for invoices
function initializeLocalStorage() {
  if (typeof localStorage !== 'undefined') {
    if (!localStorage.getItem('invoices')) {
      localStorage.setItem('invoices', JSON.stringify([]));
      console.log('Local storage initialized for invoices.');
    } else {
      console.log('Local storage for invoices already exists.');
    }
  } else {
    console.error('Local storage is not supported in this browser.');
  }
}

// Call this function when your script is loaded to ensure local storage is initialized
document.addEventListener('DOMContentLoaded', function() {
  initializeLocalStorage();
  
  // Check if we're on the invoices page
  if (window.location.pathname.includes('invoices.html')) {
    fetchInvoices();
  }
  
  // Check if we're on the dashboard page
  if (window.location.pathname.includes('index.html')) {
    fetchInvoices();
    updateInvoiceMetrics();
  }
});

/**
 * Add invoice to local storage
 * @param {Object} invoice - The invoice object to add
 */
function addInvoiceToLocalStorage(invoice) {
    let invoices = JSON.parse(localStorage.getItem('invoices')) || [];
    invoices.push(invoice);
    localStorage.setItem('invoices', JSON.stringify(invoices));
    
    // If trial system is available, increment invoice count
    if (window.trialSystem && typeof window.trialSystem.incrementInvoiceCount === 'function') {
        window.trialSystem.incrementInvoiceCount();
    }
}

/**
 * Get invoices from local storage
 * @returns {Array} Array of invoice objects
 */
function getInvoicesFromLocalStorage() {
    return JSON.parse(localStorage.getItem('invoices')) || [];
}

/**
 * Clear invoices from local storage (for testing purposes)
 */
function clearInvoicesFromLocalStorage() {
    localStorage.removeItem('invoices');
    initializeLocalStorage();
}

/**
 * Update invoice metrics on dashboard
 */
function updateInvoiceMetrics() {
  const invoices = getInvoicesFromLocalStorage();

  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter(invoice => invoice.status === 'paid').length;
  const pendingInvoices = invoices.filter(invoice => invoice.status === 'pending').length;
  const overdueInvoices = invoices.filter(invoice => invoice.status === 'overdue').length;

  const paidPercentage = totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0;
  const pendingPercentage = totalInvoices > 0 ? (pendingInvoices / totalInvoices) * 100 : 0;
  const overduePercentage = totalInvoices > 0 ? (overdueInvoices / totalInvoices) * 100 : 0;

  // Update DOM elements if they exist
  const totalInvoicesCard = document.getElementById('totalInvoicesCard');
  const paidInvoicesCard = document.getElementById('paidInvoicesCard');
  const pendingInvoicesCard = document.getElementById('pendingInvoicesCard');
  const overdueInvoicesCard = document.getElementById('overdueInvoicesCard');
  
  if (totalInvoicesCard) {
    totalInvoicesCard.querySelector('.metric-value').textContent = totalInvoices;
  }
  
  if (paidInvoicesCard) {
    paidInvoicesCard.querySelector('.metric-value').textContent = paidInvoices;
    paidInvoicesCard.querySelector('.metric-footer .metric-label').textContent = `${paidPercentage.toFixed(1)}% of Total`;
  }
  
  if (pendingInvoicesCard) {
    pendingInvoicesCard.querySelector('.metric-value').textContent = pendingInvoices;
    pendingInvoicesCard.querySelector('.metric-footer .metric-label').textContent = `${pendingPercentage.toFixed(1)}% of Total`;
  }
  
  if (overdueInvoicesCard) {
    overdueInvoicesCard.querySelector('.metric-value').textContent = overdueInvoices;
    overdueInvoicesCard.querySelector('.metric-footer .metric-label').textContent = `${overduePercentage.toFixed(1)}% of Total`;
  }
  
  // Calculate total revenue
  const totalRevenue = invoices.reduce((sum, invoice) => sum + (invoice.total || 0), 0);
  
  // Calculate revenue this month
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const revenueThisMonth = invoices.filter(invoice => {
    const issueDate = new Date(invoice.issueDate);
    return issueDate.getMonth() === thisMonth && issueDate.getFullYear() === thisYear;
  }).reduce((sum, invoice) => sum + (invoice.total || 0), 0);
}

/**
 * Fetch invoices and display them in the UI
 */
async function fetchInvoices() {
  const invoices = getInvoicesFromLocalStorage();
  displayInvoices(invoices);
}

/**
 * Display invoices in the UI
 * @param {Array} invoices - Array of invoice objects
 */
function displayInvoices(invoices) {
  const table = document.getElementById('invoicesTable');
  const noResultsMessage = document.getElementById('noResultsMessage');
  
  if (!table || !noResultsMessage) return;
  
  const tbody = table.querySelector('tbody');
  
  // Clear existing rows
  tbody.innerHTML = '';
  
  if (invoices.length === 0) {
    // Show no results message
    table.style.display = 'none';
    noResultsMessage.style.display = 'flex';
    
    // Update pagination info
    updatePaginationInfo(0, 0, 0);
    return;
  }
  
  // Hide no results message and show table
  table.style.display = 'table';
  noResultsMessage.style.display = 'none';
  
  // Sort invoices by date (newest first)
  invoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Add invoices to table
  invoices.forEach(invoice => {
    const row = document.createElement('tr');
    
    const issueDate = new Date(invoice.issueDate).toLocaleDateString();
    const dueDate = new Date(invoice.dueDate).toLocaleDateString();
    
    row.innerHTML = `
      <td><a href="#" class="invoice-link">${invoice.invoiceNumber}</a></td>
      <td>${invoice.client.name}</td>
      <td>${issueDate}</td>
      <td>${dueDate}</td>
      <td>${formatCurrency(invoice.total || 0, invoice.currency || 'USD')}</td>
      <td><span class="status ${invoice.status || 'draft'}">${capitalizeFirstLetter(invoice.status || 'Draft')}</span></td>
      <td>
        <div class="actions">
          <button class="action-btn view-btn" title="View Invoice"><i class="fas fa-eye"></i></button>
          <button class="action-btn edit-btn" title="Edit Invoice"><i class="fas fa-edit"></i></button>
          <button class="action-btn send-btn" title="Send Invoice"><i class="fas fa-paper-plane"></i></button>
          <button class="action-btn more-btn" title="More Options"><i class="fas fa-ellipsis-v"></i></button>
        </div>
      </td>
    `;
    
    tbody.appendChild(row);
  });
  
  // Update pagination info
  updatePaginationInfo(1, invoices.length, invoices.length);
}

/**
 * Update pagination information
 * @param {Number} start - Starting index
 * @param {Number} end - Ending index
 * @param {Number} total - Total number of items
 */
function updatePaginationInfo(start, end, total) {
  const pageStart = document.getElementById('page-start');
  const pageEnd = document.getElementById('page-end');
  const totalItems = document.getElementById('total-items');
  
  if (pageStart && pageEnd && totalItems) {
    pageStart.textContent = start;
    pageEnd.textContent = end;
    totalItems.textContent = total;
  }
}

/**
 * Format currency based on currency code
 * @param {Number} amount - The amount to format
 * @param {String} currencyCode - The currency code (USD, EUR, MZN)
 * @returns {String} Formatted currency string
 */
function formatCurrency(amount, currencyCode) {
  let symbol = '$';
  
  switch (currencyCode) {
    case 'EUR':
      symbol = '€';
      break;
    case 'MZN':
      symbol = 'MT';
      break;
    default:
      symbol = '$';
  }
  
  return `${symbol}${amount.toFixed(2)}`;
}

/**
 * Capitalize first letter of a string
 * @param {String} string - The string to capitalize
 * @returns {String} The capitalized string
 */
function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

// Export functions for use in other scripts
window.invoiceSystem = {
  addInvoiceToLocalStorage,
  getInvoicesFromLocalStorage,
  clearInvoicesFromLocalStorage,
  updateInvoiceMetrics,
  fetchInvoices
};