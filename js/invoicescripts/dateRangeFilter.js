// Date Range Filter Module
(function(global) {
    if (global.DateRangeFilterModule) {
        // Already defined, do not redeclare
        return;
    }
    const DateRangeFilterModule = {
        init() {
            this.dateRangeFilter = document.getElementById('dateRangeFilter');
            this.customDateRange = document.getElementById('customDateRange');
            this.startDate = document.getElementById('startDate');
            this.endDate = document.getElementById('endDate');
            this.applyDateRangeBtn = document.getElementById('applyDateRange');
            
            // Setup click outside listener
            document.addEventListener('click', (e) => this.handleClickOutside(e));

            if (!this.dateRangeFilter) return;

            // Set default dates
            const today = new Date();
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            
            if (this.startDate) this.startDate.value = lastMonth.toISOString().split('T')[0];
            if (this.endDate) this.endDate.value = today.toISOString().split('T')[0];

            this.setupEventListeners();
        },

        setupEventListeners() {
            // Handle date range filter changes
            this.dateRangeFilter.addEventListener('change', () => {
                this.handleDateRangeChange();
            });

            // Handle apply button click
            if (this.applyDateRangeBtn) {
                this.applyDateRangeBtn.addEventListener('click', () => {
                    this.applyCustomDateRange();
                });
            }
        },

        handleClickOutside(event) {
            // If the custom date range is not visible, do nothing
            if (this.customDateRange.style.display === 'none') return;

            // Check if the click was outside both the select and the custom date range
            const isClickInsideSelect = this.dateRangeFilter.contains(event.target);
            const isClickInsideCustomRange = this.customDateRange.contains(event.target);

            if (!isClickInsideSelect && !isClickInsideCustomRange) {
                this.customDateRange.style.display = 'none';
                // Reset the select to previous value if no date was selected
                if (!this.startDate.value || !this.endDate.value) {
                    this.dateRangeFilter.value = this.dateRangeFilter.getAttribute('data-previous-value') || 'all';
                }
            }
        },

        handleDateRangeChange() {
            const selectedValue = this.dateRangeFilter.value;
            
            // Store the previous value before changing
            if (selectedValue === 'custom') {
                this.dateRangeFilter.setAttribute('data-previous-value', this.dateRangeFilter.getAttribute('data-previous-value') || 'all');
            }
            
            // Show/hide custom date range inputs
            if (selectedValue === 'custom') {
                this.customDateRange.style.display = 'block';
            } else {
                this.customDateRange.style.display = 'none';
                this.applyDateFilter(selectedValue);
            }
        },

        applyCustomDateRange() {
            if (!this.startDate || !this.endDate) return;

            const startDate = this.startDate.value;
            const endDate = this.endDate.value;

            if (!startDate || !endDate) {
                window.showNotification('Please select both start and end dates', 'error');
                return;
            }

            if (new Date(startDate) > new Date(endDate)) {
                window.showNotification('Start date cannot be after end date', 'error');
                return;
            }

            this.applyDateFilter('custom', { startDate, endDate });
        },

        applyDateFilter(filterValue, customDates = null) {
            if (!window.invoiceTable || typeof window.invoiceTable.applyFilters !== 'function') {
                console.error('invoiceTable or applyFilters not found');
                return;
            }

            // Update the filters
            window.invoiceTable.currentFilters = window.invoiceTable.currentFilters || {};
            window.invoiceTable.currentFilters.dateRange = filterValue;
            
            if (filterValue === 'custom' && customDates) {
                window.invoiceTable.currentFilters.customDateRange = {
                    startDate: customDates.startDate,
                    endDate: customDates.endDate
                };
            } else {
                window.invoiceTable.currentFilters.customDateRange = null;
            }

            // Apply the filters
            window.invoiceTable.applyFilters();
        },

        reset() {
            if (this.dateRangeFilter) {
                this.dateRangeFilter.value = 'all';
                this.customDateRange.style.display = 'none';
            }
        }
    };
    global.DateRangeFilterModule = DateRangeFilterModule;
})(window);
