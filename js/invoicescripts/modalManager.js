// Modal Management Module

class ModalManager {
    constructor() {
        this.activeModal = null;
        this.overlay = document.querySelector('.modal-overlay');
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        if (this.overlay) {
            this.overlay.style.display = 'block';
        }

        modal.style.display = 'block';
        this.activeModal = modal;

        // Add event listeners for closing
        const closeButtons = modal.querySelectorAll('.close-modal');
        closeButtons.forEach(button => {
            button.addEventListener('click', () => this.closeModal(modalId));
        });

        // Close on overlay click
        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeModal(modalId));
        }

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal(modalId);
        });
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        if (this.overlay) {
            this.overlay.style.display = 'none';
        }

        modal.style.display = 'none';
        this.activeModal = null;
    }
}

// Create global instance
window.modalManager = new ModalManager();

// Export helper functions
window.openModal = (modalId) => window.modalManager.openModal(modalId);
window.closeModal = (modalId) => window.modalManager.closeModal(modalId);