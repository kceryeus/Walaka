// Modal Management Module

class ModalManager {
    constructor() {
        this.modalStack = [];
        this.overlay = document.querySelector('.modal-overlay');
        this._boundOverlayClick = this._onOverlayClick.bind(this);
        this._boundKeyDown = this._onKeyDown.bind(this);
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Show overlay if this is the first modal
        if (this.overlay && this.modalStack.length === 0) {
            this.overlay.style.display = 'block';
            this.overlay.addEventListener('click', this._boundOverlayClick);
            document.addEventListener('keydown', this._boundKeyDown);
            console.log('[ModalManager] Overlay shown');
        }

        // Show the modal and push to stack if not already present
        modal.style.display = 'block';
        if (!this.modalStack.includes(modal)) {
            this.modalStack.push(modal);
        }
        // Log modal class for debugging
        console.log('[ModalManager] openModal:', modalId, 'Class:', modal.className, 'Stack:', this.modalStack.map(m => m.id));

        // Add close button listeners (remove previous to avoid stacking)
        const closeButtons = modal.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.onclick = () => this.closeModal(modalId);
        });
    }

    closeModal(modalId) {
        // Only close the topmost modal if it matches
        if (this.modalStack.length === 0) return;
        const topModal = this.modalStack[this.modalStack.length - 1];
        if (topModal.id !== modalId) {
            console.warn('[ModalManager] Attempted to close', modalId, 'but top of stack is', topModal.id);
            return;
        }
        topModal.style.display = 'none';
        this.modalStack.pop();
        console.log('[ModalManager] closeModal:', modalId, 'Class:', topModal.className, 'Stack:', this.modalStack.map(m => m.id));
        if (this.modalStack.length === 0 && this.overlay) {
            this.overlay.style.display = 'none';
            this.overlay.removeEventListener('click', this._boundOverlayClick);
            document.removeEventListener('keydown', this._boundKeyDown);
            console.log('[ModalManager] Overlay hidden');
        }
        // --- Refresh invoice table if the invoice modal was closed ---
        if (modalId === 'invoiceModal' && window.invoiceTable && typeof window.invoiceTable.refreshTable === 'function') {
            window.invoiceTable.refreshTable();
        }
    }

    _onOverlayClick(e) {
        // Only close the topmost modal
        if (this.modalStack.length > 0) {
            const topModal = this.modalStack[this.modalStack.length - 1];
            if (topModal) this.closeModal(topModal.id);
        }
    }

    _onKeyDown(e) {
        if (e.key === 'Escape' && this.modalStack.length > 0) {
            const topModal = this.modalStack[this.modalStack.length - 1];
            if (topModal) this.closeModal(topModal.id);
        }
    }
}

// Create global instance
window.modalManager = new ModalManager();

// Export helper functions
window.openModal = (modalId) => window.modalManager.openModal(modalId);
window.closeModal = (modalId) => window.modalManager.closeModal(modalId);