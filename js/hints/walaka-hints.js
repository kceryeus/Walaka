class WalakaHints {
    constructor() {
        this.hints = new Map();
        this.init();
    }

    init() {
        // Create hint button
        this.createHintButton();
        
        // Create hint sidebar
        this.createHintSidebar();
        
        // Create hint popup
        this.createHintPopup();
    }

    createHintButton() {
        const button = document.createElement('button');
        button.id = 'hint-button';
        button.innerHTML = '?';
        button.className = 'hint-button';
        document.body.appendChild(button);

        button.addEventListener('click', () => this.toggleSidebar());
    }

    createHintSidebar() {
        const sidebar = document.createElement('div');
        sidebar.id = 'hint-sidebar';
        sidebar.className = 'hint-sidebar';
        document.body.appendChild(sidebar);
    }

    createHintPopup() {
        const popup = document.createElement('div');
        popup.id = 'hint-popup';
        popup.className = 'hint-popup';
        document.body.appendChild(popup);
    }

    addHint(elementId, title, description) {
        const element = document.getElementById(elementId);
        if (!element) return;

        this.hints.set(elementId, { title, description });

        // Add hover event
        element.addEventListener('mouseenter', (e) => this.showPopup(e, title, description));
        element.addEventListener('mouseleave', () => this.hidePopup());

        // Add to sidebar
        this.addToSidebar(elementId, title, description);
    }

    showPopup(event, title, description) {
        const popup = document.getElementById('hint-popup');
        popup.innerHTML = `
            <h3>${title}</h3>
            <p>${description}</p>
        `;
        popup.style.display = 'block';
        popup.style.left = `${event.pageX + 10}px`;
        popup.style.top = `${event.pageY + 10}px`;
    }

    hidePopup() {
        const popup = document.getElementById('hint-popup');
        popup.style.display = 'none';
    }

    addToSidebar(elementId, title, description) {
        const sidebar = document.getElementById('hint-sidebar');
        const hintElement = document.createElement('div');
        hintElement.className = 'hint-item';
        hintElement.innerHTML = `
            <h3>${title}</h3>
            <p>${description}</p>
        `;
        hintElement.addEventListener('click', () => {
            const element = document.getElementById(elementId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.classList.add('highlight-hint');
                setTimeout(() => element.classList.remove('highlight-hint'), 2000);
            }
        });
        sidebar.appendChild(hintElement);
    }

    toggleSidebar() {
        const sidebar = document.getElementById('hint-sidebar');
        sidebar.classList.toggle('active');
    }
}

// Initialize WalakaHints when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.walakaHints = new WalakaHints();
});
