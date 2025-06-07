// Invoice Table Module
const InvoiceTableModule = {
    currentSortColumn: null,
    currentSortDirection: 'asc', // 'asc' or 'desc'
    currentFilters: {},
    isInitialized: false,

    init() {
        if (this.isInitialized) return;
        
        // Set default filters
        this.currentFilters = {
            status: 'all',
            dateRange: 'all',
            client: 'all',
            search: ''
        };

        // Initialize sorting functionality
        this.setupSorting();
        
        this.isInitialized = true;
        console.log('Invoice table module initialized');
    },

    applyFilters() {
        console.log('Applying filters:', this.currentFilters);
        this.fetchAndDisplayInvoices(1, 10, this.currentFilters);
    },

    async fetchAndDisplayInvoices(page = 1, limit = 10, filters = {}) {
        try {
            const tbody = document.querySelector('#invoicesTable tbody');
            const pageInfo = document.querySelector('.page-info');
            
            if (!tbody) {
                console.error('Invoice table body not found');
                return;
            }

            // Build query
            let query = window.supabase
                .from('invoices')
                .select('*, clients(customer_name)', { count: 'exact' });

            // Apply filters
            if (filters.status && filters.status !== 'all') {
                query = query.eq('status', filters.status);
            }
            if (filters.client && filters.client !== 'all') {
                query = query.eq('client_id', filters.client);
            }
            if (filters.search) {
                const searchTerm = filters.search;
                query = query.or(`invoiceNumber.ilike.%${searchTerm}%`);
            }
            // Apply date range filter
            if (filters.dateRange) {
                if (filters.dateRange === 'custom' && filters.customDateRange) {
                    const { startDate, endDate } = filters.customDateRange;
                    query = query.gte('issue_date', startDate).lte('issue_date', endDate);
                } else if (filters.dateRange !== 'all') {
                    const { startDate, endDate } = this.parseDateRange(filters.dateRange);
                    if (startDate && endDate) {
                        query = query.gte('issue_date', startDate).lte('issue_date', endDate);
                    }
                }
            }

            // Add sorting
            if (this.currentSortColumn) {
                // Determine the database column name based on the sort data attribute
                let dbColumn = this.currentSortColumn;
                if (dbColumn === 'client') dbColumn = 'customer_name'; // Assuming 'customer_name' in clients table
                if (dbColumn === 'date') dbColumn = 'issue_date';
                if (dbColumn === 'dueDate') dbColumn = 'due_date';
                if (dbColumn === 'amount') dbColumn = 'total_amount';
                if (dbColumn === 'status') dbColumn = 'status';

                query = query.order(dbColumn, { ascending: this.currentSortDirection === 'asc' });
            }

            // Add pagination
            const start = (page - 1) * limit;
            query = query.range(start, start + limit - 1);

            // Execute query
            const { data: invoices, error, count } = await query;

            if (error) {
                console.error('Supabase query error:', error);
                throw new Error(`Failed to fetch invoices: ${error.message}`);
            }

            // Clear existing rows
            if (tbody) {
                tbody.innerHTML = '';
            }

            if (!invoices || invoices.length === 0) {
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No invoices found</td></tr>';
                }
                if (pageInfo) {
                    pageInfo.textContent = 'No invoices found';
                }
                return;
            }

            // Add invoice rows
            invoices.forEach(invoice => {
                const statusConfig = window.STATUS_CONFIG[invoice.status] || window.STATUS_CONFIG[window.INVOICE_STATUS.DRAFT];
                const row = `
                    <tr>
                        <td>${invoice.invoiceNumber || ''}</td>
                        <td>${invoice.client_name || 'N/A'}</td>
                        <td>${this.formatDate(invoice.issue_date)}</td>
                        <td>${this.formatDate(invoice.due_date)}</td>
                        <td>${this.formatCurrency(invoice.total_amount, invoice.currency)}</td>
                        <td>
                            <span class="status-badge ${invoice.status}">${invoice.status}</span>
                        </td>
                        <td>
                            <div class="action-buttons">
                                ${invoice.pdf_url ? `
                                    <button class="btn btn-sm btn-info view-pdf" data-pdf-url="${invoice.pdf_url}">
                                        <i class="fas fa-file-pdf"></i>
                                    </button>
                                ` : ''}
                                <button class="btn btn-sm btn-info view-invoice" data-invoice="${invoice.invoiceNumber}">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-primary edit-invoice" data-invoice="${invoice.invoiceNumber}">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-danger delete-invoice" data-invoice="${invoice.invoiceNumber}">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });

            // Setup action buttons
            this.setupActionButtons();

            // Update pagination info and render buttons
            if (pageInfo) {
                const totalPages = Math.ceil(count / limit);
                pageInfo.textContent = `Showing ${start + 1}-${Math.min(start + limit, count)} of ${count} invoices`;
                this.renderPaginationButtons(page, limit, count, filters);
            }

        } catch (error) {
            console.error('Error in fetchAndDisplayInvoices:', error);
            showNotification(error.message || 'Failed to fetch invoices', 'error');
        }
    },

    // New method to render pagination buttons
    renderPaginationButtons(currentPage, limit, totalCount, filters) {
        const pageControls = document.querySelector('.pagination .page-controls');
        if (!pageControls) return;

        pageControls.innerHTML = ''; // Clear existing buttons

        const totalPages = Math.ceil(totalCount / limit);

        // Add Previous button
        const prevBtn = document.createElement('button');
        prevBtn.className = 'pagination-btn';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.disabled = currentPage === 1;
        prevBtn.addEventListener('click', () => this.fetchAndDisplayInvoices(currentPage - 1, limit, filters));
        pageControls.appendChild(prevBtn);

        // Add page buttons (simplified: show first few, last, and current vicinity)
        const maxButtons = 5; // Max number of page buttons to show
        const startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
        const endPage = Math.min(totalPages, startPage + maxButtons - 1);

        if (startPage > 1) {
            this.addPaginationButton(1, currentPage, limit, filters, pageControls);
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                pageControls.appendChild(ellipsis);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            this.addPaginationButton(i, currentPage, limit, filters, pageControls);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'pagination-ellipsis';
                ellipsis.textContent = '...';
                pageControls.appendChild(ellipsis);
            }
            this.addPaginationButton(totalPages, currentPage, limit, filters, pageControls);
        }

        // Add Next button
        const nextBtn = document.createElement('button');
        nextBtn.className = 'pagination-btn';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.disabled = currentPage === totalPages;
        nextBtn.addEventListener('click', () => this.fetchAndDisplayInvoices(currentPage + 1, limit, filters));
        pageControls.appendChild(nextBtn);
    },

    // Helper to add individual page buttons
    addPaginationButton(pageNumber, currentPage, limit, filters, container) {
        const button = document.createElement('button');
        button.className = 'pagination-btn';
        if (pageNumber === currentPage) {
            button.classList.add('active');
        }
        button.textContent = pageNumber;
        button.addEventListener('click', () => this.fetchAndDisplayInvoices(pageNumber, limit, filters));
        container.appendChild(button);
    },

    setupActionButtons() {
        // View button
        document.querySelectorAll('.view-invoice').forEach(btn => {
            btn.addEventListener('click', async () => {
                const invoiceNumber = btn.getAttribute('data-invoice');
                try {
                    // Fetch invoice data including PDF URL
                    const { data: invoice, error } = await window.supabase
                        .from('invoices')
                        .select('*, clients(*)')
                        .eq('invoiceNumber', invoiceNumber)
                        .single();

                    if (error) throw error;
                    if (!invoice) throw new Error('Invoice not found');

                    // Open view modal
                    if (window.openViewInvoiceModal) {
                        window.openViewInvoiceModal(invoice);
                    }

                    // If PDF URL exists, show it in an iframe
                    if (invoice.pdf_url) {
                        const previewContainer = document.getElementById('invoicePreviewContent');
                        if (previewContainer) {
                            previewContainer.innerHTML = `
                                <iframe src="${invoice.pdf_url}" width="100%" height="600px" frameborder="0"></iframe>
                            `;
                        }
                    }
                } catch (error) {
                    console.error('Error viewing invoice:', error);
                    showNotification('Error opening invoice: ' + error.message, 'error');
                }
            });
        });

        // More button
        console.log('Setting up More button listeners');
        document.querySelectorAll('.more-btn').forEach(btn => {
            console.log('Found a More button, adding listener');
            btn.addEventListener('click', (e) => {
                console.log('More button clicked', e.target);
                const invoiceNumber = btn.closest('tr').querySelector('.view-btn').getAttribute('data-invoice');
                this.showMoreOptions(e, invoiceNumber);
            });
        });
    },

    showMoreOptions(event, invoiceNumber) {
        console.log('showMoreOptions called for invoice', invoiceNumber);
        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-menu';
        dropdown.innerHTML = `
            <button class="dropdown-item" data-action="mark-paid">
                <i class="fas fa-check-circle"></i> Mark as Paid
            </button>
            <button class="dropdown-item" data-action="download">
                <i class="fas fa-download"></i> Download PDF
            </button>
            <button class="dropdown-item" data-action="email">
                <i class="fas fa-envelope"></i> Send Email
            </button>
            <button class="dropdown-item" data-action="create-credit-note">
                <i class="fas fa-file-invoice"></i> Create Credit Note
            </button>
        `;

        // Position dropdown
        const rect = event.target.getBoundingClientRect();
        console.log('Button rect:', rect);
        console.log('Window scroll:', { x: window.scrollX, y: window.scrollY });
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom}px`;
        dropdown.style.left = `${rect.left + window.scrollX}px`;
        console.log('Dropdown position set to:', { top: dropdown.style.top, left: dropdown.style.left });

        // Add click handlers
        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', async () => {
                const action = item.getAttribute('data-action');
                dropdown.remove(); // Close dropdown immediately on click

                if (window.invoiceActions) {
                    switch (action) {
                        case 'email':
                            await window.invoiceActions.sendInvoice(invoiceNumber);
                            break;
                        case 'download':
                            await window.invoiceActions.downloadPdf(invoiceNumber);
                            break;
                        case 'mark-paid':
                            await window.invoiceActions.updateInvoiceStatus(invoiceNumber, 'paid');
                            break;
                        case 'create-credit-note':
                            // TODO: Implement create credit note functionality
                            console.log('Create Credit Note action clicked for', invoiceNumber);
                            showNotification('Create Credit Note functionality not yet implemented', 'info');
                            break;
                        default:
                            console.warn('Unknown action:', action);
                    }
                }
            });
        });

        // Add click outside handler
        const clickOutsideHandler = (e) => {
            if (!dropdown.contains(e.target) && e.target !== event.target) {
                dropdown.remove();
                document.removeEventListener('click', clickOutsideHandler);
            }
        };
        document.addEventListener('click', clickOutsideHandler);

        // Append dropdown to body and show it
        document.body.appendChild(dropdown);
        dropdown.style.display = 'block';
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    formatCurrency(amount) {
        if (amount === null || amount === undefined) return '';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    },

    parseDateRange(range) {
        const today = new Date();
        const startDate = new Date();
        const endDate = new Date();

        switch (range) {
            case 'today':
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate.setDate(today.getDate() - today.getDay());
                endDate.setDate(startDate.getDate() + 6);
                break;
            case 'month':
                startDate.setDate(1);
                endDate.setMonth(startDate.getMonth() + 1);
                endDate.setDate(0);
                break;
            case 'quarter':
                const quarter = Math.floor(today.getMonth() / 3);
                startDate.setMonth(quarter * 3);
                startDate.setDate(1);
                endDate.setMonth((quarter + 1) * 3);
                endDate.setDate(0);
                break;
            case 'year':
                startDate.setMonth(0, 1);
                endDate.setMonth(11, 31);
                break;
            default:
                return { startDate: null, endDate: null };
        }

        return {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        };
    },

    // New method to set up sort listeners
    setupSorting() {
        document.querySelectorAll('#invoicesTable th .sort-icon').forEach(icon => {
            icon.addEventListener('click', () => {
                const sortColumn = icon.getAttribute('data-sort');
                this.toggleSort(sortColumn);
            });
        });
    },

    // New method to toggle sorting direction and re-fetch data
    async toggleSort(sortColumn) {
        if (this.currentSortColumn === sortColumn) {
            // Toggle direction if clicking the same column
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            // Set new column and default to ascending
            this.currentSortColumn = sortColumn;
            this.currentSortDirection = 'asc';
        }

        // Update UI to show current sorting
        this.updateSortIcons();

        // Fetch and display invoices with new sorting
        await this.fetchAndDisplayInvoices(1, 10, window.invoiceTable.currentFilters || {});
    },

    // New method to update sort icons in the table header
    updateSortIcons() {
        document.querySelectorAll('#invoicesTable th .sort-icon').forEach(icon => {
            icon.innerHTML = '<i class="fas fa-sort"></i>'; // Reset all icons
        });

        if (this.currentSortColumn) {
            const currentIcon = document.querySelector(`#invoicesTable th .sort-icon[data-sort="${this.currentSortColumn}"]`);
            if (currentIcon) {
                currentIcon.innerHTML = this.currentSortDirection === 'asc' ? '<i class="fas fa-sort-up"></i>' : '<i class="fas fa-sort-down"></i>';
            }
        }
    }
};

// Export the module
window.InvoiceTableModule = InvoiceTableModule;