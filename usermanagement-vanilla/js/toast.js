class Toast {
    constructor() {
        this.container = document.getElementById('toastContainer');
    }

    show({ title, description, type = 'info', duration = 3000 }) {
        const toast = document.createElement('div');
        toast.className = `rounded-lg p-4 shadow-lg ${
            type === 'success'
                ? 'bg-green-500'
                : type === 'error'
                ? 'bg-red-500'
                : type === 'warning'
                ? 'bg-yellow-500'
                : 'bg-blue-500'
        } text-white`;

        if (title) {
            const titleElement = document.createElement('h3');
            titleElement.className = 'font-semibold';
            titleElement.textContent = title;
            toast.appendChild(titleElement);
        }

        if (description) {
            const descriptionElement = document.createElement('p');
            descriptionElement.className = 'text-sm';
            descriptionElement.textContent = description;
            toast.appendChild(descriptionElement);
        }

        this.container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, duration);
    }
}

const toast = new Toast();
export { toast }; 