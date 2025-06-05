// Modal Management Module

const ModalManager = {
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.querySelector('.modal-overlay').style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    },

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.querySelector('.modal-overlay').style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
};

// Make functions globally available
window.openModal = ModalManager.openModal;
window.closeModal = ModalManager.closeModal;