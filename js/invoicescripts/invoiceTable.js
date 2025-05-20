// Invoice Table Module
const InvoiceTableModule = {
    async fetchAndDisplayInvoices(page = 1, limit = 10, filters = {}) {
        try {
            // Show loading state
            const tbody = document.querySelector('#invoicesTable tbody');
            const pageInfo = document.querySelector('.page-info');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading invoices...</td></tr>';
            }
            if (pageInfo) {
                pageInfo.textContent = 'Loading...';
            }

            // Initialize query builder with proper headers
            let queryBuilder = window.supabase
                .from('invoices')
                .select('*', { count: 'exact', head: false });

            // Apply filters
            if (filters.status && filters.status !== 'all') {
                queryBuilder = queryBuilder.eq('status', filters.status);
            }

            if (filters.clientId && filters.clientId !== 'all') {
                queryBuilder = queryBuilder.eq('client_id', filters.clientId);
            }

            if (filters.dateRange) {
                const now = new Date();
                const startDate = new Date();

                switch (filters.dateRange) {
                    case 'today':
                        startDate.setHours(0, 0, 0, 0);
                        queryBuilder = queryBuilder.gte('created_at', startDate.toISOString())
                            .lte('created_at', now.toISOString());
                        break;
                    case 'week':
                        startDate.setDate(startDate.getDate() - 7);
                        queryBuilder = queryBuilder.gte('created_at', startDate.toISOString());
                        break;
                    case 'month':
                        startDate.setMonth(startDate.getMonth() - 1);
                        queryBuilder = queryBuilder.gte('created_at', startDate.toISOString());
                        break;
                    case 'quarter':
                        startDate.setMonth(startDate.getMonth() - 3);
                        queryBuilder = queryBuilder.gte('created_at', startDate.toISOString());
                        break;
                }
            }

            if (filters.search) {
                queryBuilder = queryBuilder.or(
                    `invoiceNumber.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%`
                );
            }

            // Add pagination
            const from = (page - 1) * limit;
            const to = from + limit - 1;

            queryBuilder = queryBuilder
                .range(from, to)
                .order('created_at', { ascending: false });

            // Execute query with proper error handling
            const { data: invoices, error, count } = await queryBuilder;

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
                const row = `
                    <tr>
                        <td>${invoice.invoiceNumber || ''}</td>
                        <td>${invoice.customer_name || ''}</td>
                        <td>${this.formatDate(invoice.issue_date)}</td>
                        <td>${this.formatDate(invoice.due_date)}</td>
                        <td>${this.formatCurrency(invoice.total_amount)}</td>
                        <td><span class="status ${invoice.status?.toLowerCase()}">${invoice.status || 'Pending'}</span></td>
                        <td class="actions">
                            <button class="action-btn view-btn" data-invoice="${invoice.invoiceNumber}" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn send-btn" title="Send">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                            <button class="action-btn more-btn" title="More">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                        </td>
                    </tr>
                `;
                tbody.insertAdjacentHTML('beforeend', row);
            });

            // Update pagination if count is available
            if (count !== null) {
                const totalPages = Math.ceil(count / limit);
                const start = ((page - 1) * limit) + 1;
                const end = Math.min(page * limit, count);
                
                // Update page info
                if (pageInfo) {
                    pageInfo.textContent = `Showing ${start}-${end} of ${count} invoices`;
                }
                
                // Update pagination controls
                this.updatePaginationDisplay(page, totalPages, count);
            }

            // Setup action buttons for new rows
            this.setupActionButtons();

        } catch (error) {
            console.error('Error fetching invoices:', error);
            const tbody = document.querySelector('#invoicesTable tbody');
            const pageInfo = document.querySelector('.page-info');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-error">Error loading invoices</td></tr>';
            }
            if (pageInfo) {
                pageInfo.textContent = 'Error loading invoices';
            }
            throw error;
        }
    },

    setupActionButtons() {
        // View button
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const invoiceNumber = btn.getAttribute('data-invoice');
                if (window.openViewInvoiceModal) {
                    window.openViewInvoiceModal(invoiceNumber);
                }
            });
        });

        // Send button
        document.querySelectorAll('.send-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const invoiceNumber = btn.closest('tr').querySelector('.view-btn').getAttribute('data-invoice');
                if (window.invoiceActions) {
                    window.invoiceActions.sendInvoice(invoiceNumber);
                }
            });
        });

        // More button
        document.querySelectorAll('.more-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const row = btn.closest('tr');
                const invoiceNumber = row.querySelector('.view-btn').getAttribute('data-invoice');
                this.showMoreOptions(e, invoiceNumber);
            });
        });
    },

    showMoreOptions(event, invoiceNumber) {
        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-menu';
        dropdown.innerHTML = `
            <button class="dropdown-item" data-action="edit">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="dropdown-item" data-action="duplicate">
                <i class="fas fa-copy"></i> Duplicate
            </button>
            <button class="dropdown-item" data-action="delete">
                <i class="fas fa-trash"></i> Delete
            </button>
        `;

        // Position dropdown
        const rect = event.target.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + window.scrollY}px`;
        dropdown.style.left = `${rect.left + window.scrollX}px`;

        // Add click handlers
        dropdown.querySelector('[data-action="edit"]').addEventListener('click', () => {
            // TODO: Implement edit functionality
            dropdown.remove();
        });

        dropdown.querySelector('[data-action="duplicate"]').addEventListener('click', async () => {
            if (window.invoiceActions) {
                await window.invoiceActions.duplicateInvoice(invoiceNumber);
            }
            dropdown.remove();
        });

        dropdown.querySelector('[data-action="delete"]').addEventListener('click', async () => {
            if (window.invoiceActions) {
                await window.invoiceActions.deleteInvoice(invoiceNumber);
            }
            dropdown.remove();
        });

        // Add click outside handler
        const clickOutsideHandler = (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', clickOutsideHandler);
            }
        };
        document.addEventListener('click', clickOutsideHandler);

        // Add to DOM
        document.body.appendChild(dropdown);
    },

    updatePaginationDisplay(currentPage, totalPages, totalItems) {
        const controls = document.querySelector('.page-controls');
        const pageInfo = document.querySelector('.page-info');
        if (!controls || !pageInfo) return;

        // Update page info text
        const start = ((currentPage - 1) * 10) + 1;
        const end = Math.min(currentPage * 10, totalItems);
        pageInfo.textContent = `Showing ${start}-${end} of ${totalItems} invoices`;

        // Clear existing pagination buttons
        controls.innerHTML = '';

        // Add previous button
        controls.innerHTML += `
            <button class="pagination-btn ${currentPage === 1 ? 'disabled' : ''}" 
                    ${currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        // Add page numbers
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        // Adjust start page if we're near the end
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // Add first page if not visible
        if (startPage > 1) {
            controls.innerHTML += `
                <button class="pagination-btn">1</button>
                ${startPage > 2 ? '<span class="pagination-ellipsis">...</span>' : ''}
            `;
        }

        // Add page numbers
        for (let i = startPage; i <= endPage; i++) {
            controls.innerHTML += `
                <button class="pagination-btn ${i === currentPage ? 'active' : ''}">${i}</button>
            `;
        }

        // Add last page if not visible
        if (endPage < totalPages) {
            controls.innerHTML += `
                ${endPage < totalPages - 1 ? '<span class="pagination-ellipsis">...</span>' : ''}
                <button class="pagination-btn">${totalPages}</button>
            `;
        }

        // Add next button
        controls.innerHTML += `
            <button class="pagination-btn ${currentPage === totalPages ? 'disabled' : ''}"
                    ${currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        // Add click handlers for new buttons
        this.setupPaginationHandlers(currentPage, totalPages);
    },

    setupPaginationHandlers(currentPage, totalPages) {
        const controls = document.querySelector('.page-controls');
        if (!controls) return;

        controls.addEventListener('click', async (e) => {
            const button = e.target.closest('.pagination-btn');
            if (!button || button.disabled) return;

            let newPage = currentPage;

            if (button.querySelector('.fa-chevron-left')) {
                newPage = currentPage - 1;
            } else if (button.querySelector('.fa-chevron-right')) {
                newPage = currentPage + 1;
            } else {
                newPage = parseInt(button.textContent);
            }

            if (newPage >= 1 && newPage <= totalPages) {
                // Get current filters
                const filters = {
                    status: document.getElementById('statusFilter')?.value || 'all',
                    dateRange: document.getElementById('dateFilter')?.value || 'all',
                    clientId: document.getElementById('clientFilter')?.value || 'all',
                    search: document.getElementById('searchInvoices')?.value.trim() || ''
                };

                await this.fetchAndDisplayInvoices(newPage, 10, filters);
            }
        });
    },

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    formatCurrency(amount) {
        if (!amount) return '0.00';
        return parseFloat(amount).toLocaleString('en-GB', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
};

// Export functions to global scope
window.fetchAndDisplayInvoices = InvoiceTableModule.fetchAndDisplayInvoices.bind(InvoiceTableModule); 