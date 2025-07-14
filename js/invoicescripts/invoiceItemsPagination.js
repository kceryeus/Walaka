/**
 * Invoice Items Pagination Module
 * Handles pagination for invoice items to prevent oversized PDFs
 */
class InvoiceItemsPagination {
    constructor() {
        this.itemsPerPage = 10;
        this.maxPages = 5; // Maximum 50 items total
        this.maxItems = this.itemsPerPage * this.maxPages; // 50 items
        this.currentPage = 1;
        this.totalItems = 0;
        this.allItems = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updatePaginationDisplay();
    }

    setupEventListeners() {
        // Previous page button
        const prevBtn = document.getElementById('prev-items-page');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        }

        // Next page button
        const nextBtn = document.getElementById('next-items-page');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        }

        // Add item button - check limits before adding
        const addItemBtn = document.getElementById('addItemBtn');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => this.handleAddItem());
        }

        // Monitor for item removal
        document.addEventListener('click', (e) => {
            if (e.target.closest('.remove-item-btn')) {
                setTimeout(() => this.updatePaginationDisplay(), 100);
            }
        });
    }

    handleAddItem() {
        const currentItemCount = this.getAllItems().length;
        if (currentItemCount >= this.maxItems) {
            showNotification(`Maximum ${this.maxItems} items allowed. Please remove some items before adding more.`, 'warning');
            // Always disable the add button at the limit
            const addItemBtn = document.getElementById('addItemBtn');
            if (addItemBtn) addItemBtn.disabled = true;
            return false;
        }
        // Defensive: If addItemBtn is disabled, do not add
        const addItemBtn = document.getElementById('addItemBtn');
        if (addItemBtn && addItemBtn.disabled) return false;
        // Show info notification for first few items
        if (currentItemCount === 0) {
            showNotification(`Pagination enabled: Maximum ${this.maxItems} items (${this.maxPages} pages) to ensure PDF quality.`, 'info');
        } else if (currentItemCount === this.itemsPerPage) {
            showNotification(`Page 1 full. Items will be paginated across multiple pages.`, 'info');
        }
        // Call the original add item function
        if (window.invoiceItems && typeof window.invoiceItems.addInvoiceItem === 'function') {
            // Defensive: Only add if not at limit
            if (this.getAllItems().length < this.maxItems) {
                window.invoiceItems.addInvoiceItem();
                setTimeout(() => this.updatePaginationDisplay(), 100);
            }
        }
        return true;
    }

    getAllItems() {
        const itemRows = document.querySelectorAll('#itemsTable tbody .item-row');
        return Array.from(itemRows);
    }

    getVisibleItems() {
        const allItems = this.getAllItems();
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return allItems.slice(startIndex, endIndex);
    }

    goToPage(page) {
        const totalPages = this.getTotalPages();
        
        if (page < 1 || page > totalPages) {
            return;
        }

        this.currentPage = page;
        this.updatePaginationDisplay();
    }

    getTotalPages() {
        const totalItems = this.getAllItems().length;
        return Math.ceil(totalItems / this.itemsPerPage);
    }

    updatePaginationDisplay() {
        const allItems = this.getAllItems();
        this.totalItems = allItems.length;
        const totalPages = this.getTotalPages();

        // Hide all items first
        allItems.forEach(item => {
            item.classList.add('hidden');
            item.classList.remove('visible');
        });

        // Show only items on current page
        const visibleItems = this.getVisibleItems();
        visibleItems.forEach(item => {
            item.classList.remove('hidden');
            item.classList.add('visible');
        });

        // Update pagination info
        const pageInfo = document.getElementById('items-page-info');
        if (pageInfo) {
            const start = (this.currentPage - 1) * this.itemsPerPage + 1;
            const end = Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
            pageInfo.textContent = `Showing ${start}-${end} of ${this.totalItems} items`;
        }

        // Update pagination controls
        this.updatePaginationControls(totalPages);

        // Update limit info
        this.updateLimitInfo();
    }

    updatePaginationControls(totalPages) {
        const prevBtn = document.getElementById('prev-items-page');
        const nextBtn = document.getElementById('next-items-page');
        const pageNumbers = document.getElementById('items-page-numbers');

        if (prevBtn) {
            prevBtn.disabled = this.currentPage === 1;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentPage === totalPages || totalPages === 0;
        }

        if (pageNumbers) {
            pageNumbers.innerHTML = '';
            
            if (totalPages <= 0) {
                return;
            }

            // Show page numbers (max 5 visible)
            const maxVisiblePages = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

            // Adjust start if we're near the end
            if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }

            for (let i = startPage; i <= endPage; i++) {
                const pageBtn = document.createElement('button');
                pageBtn.className = `page-number ${i === this.currentPage ? 'active' : ''}`;
                pageBtn.textContent = i;
                pageBtn.addEventListener('click', () => this.goToPage(i));
                pageNumbers.appendChild(pageBtn);
            }
        }
    }

    updateLimitInfo() {
        const limitInfo = document.querySelector('.items-limit-info small');
        if (limitInfo) {
            const remaining = this.maxItems - this.totalItems;
            if (remaining <= 0) {
                limitInfo.textContent = `Maximum ${this.maxItems} items reached. Please remove items before adding more.`;
                limitInfo.style.color = '#dc3545';
            } else if (remaining <= 10) {
                limitInfo.textContent = `Only ${remaining} items remaining. Maximum ${this.maxItems} items (${this.maxPages} pages) to ensure PDF quality.`;
                limitInfo.style.color = '#fd7e14';
            } else {
                limitInfo.textContent = `Maximum ${this.maxItems} items (${this.maxPages} pages) to ensure PDF quality.`;
                limitInfo.style.color = '#6c757d';
            }
        }

        // Update add item button state
        const addItemBtn = document.getElementById('addItemBtn');
        if (addItemBtn) {
            if (this.totalItems >= this.maxItems) {
                addItemBtn.disabled = true;
                addItemBtn.title = `Maximum ${this.maxItems} items reached`;
            } else {
                addItemBtn.disabled = false;
                addItemBtn.title = `Add new item (${this.maxItems - this.totalItems} remaining)`;
            }
        }
    }

    // Get all items for PDF generation (all pages)
    getAllItemsForPDF() {
        return this.getAllItems();
    }

    // Get items for current page only (for display)
    getCurrentPageItems() {
        return this.getVisibleItems();
    }

    // Check if we can add more items
    canAddMoreItems() {
        return this.totalItems < this.maxItems;
    }

    // Get pagination info for external use
    getPaginationInfo() {
        return {
            currentPage: this.currentPage,
            totalPages: this.getTotalPages(),
            totalItems: this.totalItems,
            itemsPerPage: this.itemsPerPage,
            maxItems: this.maxItems,
            maxPages: this.maxPages
        };
    }

    // Reset pagination when form is reset
    resetPagination() {
        this.currentPage = 1;
        this.updatePaginationDisplay();
    }

    // Check if pagination is needed
    isPaginationNeeded() {
        return this.totalItems > this.itemsPerPage;
    }

    // Get items for a specific page (for external use)
    getItemsForPage(page) {
        const allItems = this.getAllItems();
        const startIndex = (page - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return allItems.slice(startIndex, endIndex);
    }

    // Validate item limits before adding
    validateItemLimits() {
        const currentCount = this.getAllItems().length;
        if (currentCount >= this.maxItems) {
            showNotification(`Maximum ${this.maxItems} items allowed. Please remove some items before adding more.`, 'warning');
            return false;
        }
        return true;
    }

    // Force update pagination display (for external triggers)
    forceUpdate() {
        this.updatePaginationDisplay();
    }
}

// Initialize the pagination module
window.invoiceItemsPagination = new InvoiceItemsPagination();

// Add global helper functions for external use
window.validateInvoiceItemLimits = function() {
    if (window.invoiceItemsPagination) {
        return window.invoiceItemsPagination.validateItemLimits();
    }
    return true;
};

window.getInvoiceItemsPaginationInfo = function() {
    if (window.invoiceItemsPagination) {
        return window.invoiceItemsPagination.getPaginationInfo();
    }
    return null;
}; 