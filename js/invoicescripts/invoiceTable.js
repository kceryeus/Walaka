// Invoice Table Module
const InvoiceTableModule = {
    currentSortColumn: null,
    currentSortDirection: 'asc', // 'asc' or 'desc'
    currentFilters: {},
    isInitialized: false,
    subscription: null, // Add subscription property

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
        
        // Setup real-time subscription
        this.setupRealtimeSubscription();
        
        this.isInitialized = true;
        console.log('Invoice table module initialized');
    },

    // Add real-time subscription setup
    setupRealtimeSubscription() {
        if (!window.supabase) {
            console.error('Supabase client not available for real-time subscription');
            return;
        }

        // Clean up existing subscription if any
        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        // Create new subscription
        this.subscription = window.supabase
            .channel('invoice-table-updates')
            .on('postgres_changes', 
                {
                    event: '*',
                    schema: 'public',
                    table: 'invoices'
                }, 
                (payload) => {
                    console.log('Invoice table real-time update received:', payload);
                    console.log('Event type:', payload.eventType);
                    console.log('Table:', payload.table);
                    console.log('New record:', payload.new);
                    console.log('Old record:', payload.old);
                    
                    // Add a small delay to ensure the database change is fully committed
                    setTimeout(() => {
                        // Refresh the table with current filters
                        this.fetchAndDisplayInvoices(1, 10, this.currentFilters);
                    }, 100);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Invoice table real-time subscription established successfully');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('Invoice table real-time subscription failed');
                }
            });

        console.log('Invoice table real-time subscription setup completed');
    },

    // Add cleanup method
    cleanup() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
            console.log('Invoice table real-time subscription cleaned up');
        }
    },

    // Add method to manually refresh table
    async refreshTable() {
        console.log('Manually refreshing invoice table...');
        await this.fetchAndDisplayInvoices(1, 10, this.currentFilters);
    },

    // Add method to re-establish subscription if needed
    reestablishSubscription() {
        console.log('Re-establishing invoice table real-time subscription...');
        this.setupRealtimeSubscription();
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

            // Fetch all invoices, let RLS filter them
            let query = window.supabase
                .from('invoices')
                .select('*, clients(customer_name)', { count: 'exact' });

            // Apply filters
            if (filters.status && filters.status !== 'all') {
                // Special handling for overdue: fetch all, filter in-memory after overdue logic
                if (filters.status !== 'overdue') {
                    query = query.eq('status', filters.status);
                }
            }
            if (filters.client && filters.client !== 'all') {
                query = query.eq('client_id', filters.client);
            }
            if (filters.search) {
                // Temporarily limit search to invoiceNumber to avoid complexity with joined tables.
                query = query.ilike('invoiceNumber', `%${filters.search}%`);
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
                let dbColumn = this.currentSortColumn;
                // Sorting by client name on a join is complex; sort by ID for now.
                if (dbColumn === 'client') dbColumn = 'client_id';
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

            // --- Update overdue status in-memory before rendering ---
            if (Array.isArray(invoices)) {
                const now = new Date();
                invoices.forEach(inv => {
                    const due = inv.dueDate || inv.due_date;
                    if (
                        inv.status === 'pending' &&
                        due &&
                        !isNaN(new Date(due).getTime()) &&
                        new Date(due) < now
                    ) {
                        inv.status = 'overdue';
                    }
                });
                // If filtering for overdue, filter the array in-memory
                if (filters.status === 'overdue') {
                    for (let i = invoices.length - 1; i >= 0; i--) {
                        if (invoices[i].status !== 'overdue') {
                            invoices.splice(i, 1);
                        }
                    }
                }
            }

            // Clear existing rows
            tbody.innerHTML = '';

            if (!invoices || invoices.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">No invoices found</td></tr>';
                if (pageInfo) {
                    pageInfo.textContent = 'No invoices found';
                }
                return;
            }

            // Add invoice rows
            invoices.forEach(invoice => {
                const clientName = invoice.clients?.customer_name || invoice.customer_name || 'N/A';
                // Always show MZN value with code
                let mznValue = invoice.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' MZN';
                let amountDisplay = mznValue;
                if (invoice.currency && invoice.currency !== 'MZN' && invoice.currency_rate && !isNaN(invoice.currency_rate)) {
                    const converted = invoice.total_amount * invoice.currency_rate;
                    amountDisplay = `
                        <div>${mznValue}</div>
                        <div style="font-size:0.95em;color:#1976d2;">${converted.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} ${invoice.currency}</div>
                    `;
                }
                const statusConfig = window.InvoiceStatusManager ? window.InvoiceStatusManager.getStatusConfig(invoice.status) : null;
                const statusClass = statusConfig ? statusConfig.color : invoice.status.toLowerCase();
                const statusIcon = statusConfig ? statusConfig.icon : '';
                const statusLabel = statusConfig ? statusConfig.label : invoice.status;
                const row = `
                    <tr>
                        <td>${invoice.invoiceNumber || ''}</td>
                        <td>${clientName}</td>
                        <td>${this.formatDate(invoice.issue_date)}</td>
                        <td>${this.formatDate(invoice.due_date)}</td>
                        <td>${amountDisplay}</td>
                        <td>
                            <span class="status ${statusClass}">
                                <i class="fas ${statusIcon}"></i> ${statusLabel}
                            </span>
                        </td>
                        <td>
                            <div class="action-menu">
                                <button class="action-menu-btn" data-invoice="${invoice.invoiceNumber}" data-client-email="${invoice.clients?.email || ''}" title="Actions">
                                    <i class="fas fa-ellipsis-v"></i>
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
            const tbody = document.querySelector('#invoicesTable tbody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error loading invoices: ${error.message}</td></tr>`;
            }
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
        // Action menu button
        document.querySelectorAll('.action-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const invoiceNumber = btn.getAttribute('data-invoice');
                this.showActionMenu(e, invoiceNumber);
            });
        });
    },

    showActionMenu(event, invoiceNumber) {
        // Remove any existing dropdowns
        const existingDropdown = document.querySelector('.action-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'action-dropdown';
        dropdown.innerHTML = `
            <div class="dropdown-header">
                <span>Invoice Actions</span>
            </div>
            <div class="dropdown-content">
                <button class="dropdown-item" data-action="view">
                    <i class="fas fa-eye"></i>
                    <span>View Invoice</span>
                </button>
                <button class="dropdown-item" data-action="download">
                    <i class="fas fa-download"></i>
                    <span>Download PDF</span>
                </button>
                <button class="dropdown-item" data-action="email">
                    <i class="fas fa-envelope"></i>
                    <span>Send Email</span>
                </button>
                <button class="dropdown-item" data-action="duplicate">
                    <i class="fas fa-copy"></i>
                    <span>Duplicate</span>
                </button>
                <button class="dropdown-item" data-action="mark-paid">
                    <i class="fas fa-check-circle"></i>
                    <span>Mark as Paid & Create Receipt</span>
                </button>
                <button class="dropdown-item" data-action="create-credit-note">
                    <i class="fas fa-file-invoice"></i>
                    <span>Create Credit Note</span>
                </button>
            </div>
        `;

        // Append to body to measure
        document.body.appendChild(dropdown);
        const dropdownWidth = dropdown.offsetWidth;

        // Position dropdown
        const rect = event.target.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 5}px`;
        dropdown.style.left = `${rect.right - dropdownWidth}px`;
        dropdown.style.zIndex = '1000';

        // Add click handlers
        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', async () => {
                const action = item.getAttribute('data-action');
                dropdown.remove(); // Close dropdown immediately on click

                if (window.invoiceActions) {
                    switch (action) {
                        case 'view':
                            // Open invoice modal in a style similar to receipt modal
                            await this.viewInvoice(invoiceNumber);
                            break;
                        case 'download':
                            await window.invoiceActions.downloadPdf(invoiceNumber);
                            break;
                        case 'email': {
                            // Fetch invoice data for modal
                            const btn = document.querySelector(`.action-menu-btn[data-invoice="${invoiceNumber}"]`);
                            let clientEmail = btn ? btn.getAttribute('data-client-email') : '';
                            // Fetch invoice data from Supabase for full info
                            const { data: invoice, error } = await window.supabase
                                .from('invoices')
                                .select('*, clients(*)')
                                .eq('invoiceNumber', invoiceNumber)
                                .single();
                            if (error || !invoice) {
                                showNotification('Could not load invoice details for email', 'error');
                                break;
                            }
                            if (window.emailHandler && typeof window.emailHandler.openEmailModal === 'function') {
                                window.emailHandler.openEmailModal({
                                    ...invoice,
                                    client: invoice.clients || { email: clientEmail }
                                });
                            }
                            break;
                        }
                        case 'duplicate':
                            await this.duplicateInvoice(invoiceNumber);
                            break;
                        case 'mark-paid': {
                            // Mark as paid, then create receipt and redirect to receipts.html
                            await window.invoiceActions.updateInvoiceStatus(invoiceNumber, 'paid');
                            // Fetch invoice data for receipt creation
                            const { data: invoice, error } = await window.supabase
                                .from('invoices')
                                .select('*, clients(*)')
                                .eq('invoiceNumber', invoiceNumber)
                                .single();
                            if (!error && invoice) {
                                // Fetch current user ID
                                let user_id = invoice.user_id;
                                if (!user_id && window.supabase && window.supabase.auth) {
                                    const { data: { user } } = await window.supabase.auth.getUser();
                                    user_id = user?.id;
                                }
                                // Generate next sequential receipt number
                                let receipt_number = '';
                                if (user_id) {
                                    const year = new Date().getFullYear();
                                    const { data: lastReceipts, error: lastError } = await window.supabase
                                        .from('receipts')
                                        .select('receipt_number')
                                        .eq('user_id', user_id)
                                        .ilike('receipt_number', `REC-${year}-%`)
                                        .order('created_at', { ascending: false })
                                        .limit(1);
                                    let nextNumber = 1;
                                    if (!lastError && lastReceipts && lastReceipts.length > 0) {
                                        const last = lastReceipts[0].receipt_number;
                                        const match = last.match(/REC-\d{4}-(\d+)/);
                                        if (match) {
                                            nextNumber = parseInt(match[1], 10) + 1;
                                        }
                                    }
                                    const padded = String(nextNumber).padStart(4, '0');
                                    receipt_number = `REC-${year}-${padded}`;
                                } else {
                                    // fallback
                                    receipt_number = `REC-${new Date().getFullYear()}-0001`;
                                }
                                // Prepare receipt data
                                const receiptData = {
                                    receipt_number,
                                    client_id: invoice.client_id,
                                    client_name: invoice.clients?.customer_name || invoice.customer_name || '',
                                    payment_date: new Date().toISOString().slice(0,10),
                                    amount: invoice.total_amount,
                                    payment_method: invoice.payment_method || 'manual',
                                    related_invoice_id: invoice.id,
                                    notes: 'Receipt auto-generated when marking invoice as paid',
                                    status: 'paid',
                                    user_id: user_id
                                };
                                // Insert receipt
                                const { error: receiptError, data: receiptInsert } = await window.supabase
                                    .from('receipts')
                                    .insert([receiptData])
                                    .select();
                                if (!receiptError && receiptInsert && receiptInsert[0]) {
                                    // Redirect to receipts.html and highlight the new receipt
                                    localStorage.setItem('highlightReceiptId', receiptInsert[0].receipt_id);
                                    window.location.href = 'receipts.html';
                                } else {
                                    showNotification('Receipt creation failed', 'error');
                                }
                            } else {
                                showNotification('Could not fetch invoice for receipt', 'error');
                            }
                            break;
                        }
                        case 'create-credit-note': {
                            // Store invoice number in localStorage and redirect to credit_notes.html
                            localStorage.setItem('relatedInvoiceForCreditNote', invoiceNumber);
                            window.location.href = 'credit_notes.html';
                            break;
                        }
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
    },

    async viewInvoice(invoiceNumber) {
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
    },

    async editInvoice(invoiceNumber) {
        try {
            // Fetch invoice data
            const { data: invoice, error } = await window.supabase
                .from('invoices')
                .select('*, clients(*)')
                .eq('invoiceNumber', invoiceNumber)
                .single();

            if (error) throw error;
            if (!invoice) throw new Error('Invoice not found');

            // Open edit modal
            if (window.openEditInvoiceModal) {
                window.openEditInvoiceModal(invoice);
            } else {
                showNotification('Edit functionality not yet implemented', 'info');
            }
        } catch (error) {
            console.error('Error editing invoice:', error);
            showNotification('Error editing invoice: ' + error.message, 'error');
        }
    },

    async duplicateInvoice(invoiceNumber) {
        try {
            // Fetch invoice data
            const { data: invoice, error } = await window.supabase
                .from('invoices')
                .select('*, clients(*)')
                .eq('invoiceNumber', invoiceNumber)
                .single();

            if (error) throw error;
            if (!invoice) throw new Error('Invoice not found');

            // Open create modal with duplicated data
            if (window.openCreateInvoiceModal) {
                window.openCreateInvoiceModal(invoice, true); // true for duplicate mode
            } else {
                showNotification('Duplicate functionality not yet implemented', 'info');
            }
        } catch (error) {
            console.error('Error duplicating invoice:', error);
            showNotification('Error duplicating invoice: ' + error.message, 'error');
        }
    },

    async createCreditNote(invoiceNumber) {
        try {
            // Fetch invoice data
            const { data: invoice, error } = await window.supabase
                .from('invoices')
                .select('*, clients(*)')
                .eq('invoiceNumber', invoiceNumber)
                .single();

            if (error) throw error;
            if (!invoice) throw new Error('Invoice not found');

            // Open credit note modal
            if (window.openCreditNoteModal) {
                window.openCreditNoteModal(invoice);
            } else {
                showNotification('Credit Note functionality not yet implemented', 'info');
            }
        } catch (error) {
            console.error('Error creating credit note:', error);
            showNotification('Error creating credit note: ' + error.message, 'error');
        }
    },

    async deleteInvoice(invoiceNumber) {
        if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            try {
                const { error } = await window.supabase
                    .from('invoices')
                    .delete()
                    .eq('invoiceNumber', invoiceNumber);

                if (error) throw error;

                showNotification('Invoice deleted successfully', 'success');
                
                // Refresh the invoice list
                if (window.invoiceTable && typeof window.invoiceTable.fetchAndDisplayInvoices === 'function') {
                    await window.invoiceTable.fetchAndDisplayInvoices(1, 10, {});
                }
            } catch (error) {
                console.error('Error deleting invoice:', error);
                showNotification('Error deleting invoice: ' + error.message, 'error');
            }
        }
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

    formatCurrency(amount, currency = 'MZN') {
        if (amount === null || amount === undefined) return '';
        
        // Default to MZN if no currency specified
        const currencyCode = currency || 'MZN';
        
        return new Intl.NumberFormat('pt-MZ', {
            style: 'currency',
            currency: currencyCode
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
window.invoiceTable = InvoiceTableModule;