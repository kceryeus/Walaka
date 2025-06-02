async function loadSidebar() {
    try {
        const response = await fetch('/components/sidebar.html');
        const sidebarHtml = await response.text();
        document.querySelector('.sidebar-container').innerHTML = sidebarHtml;
        
        // Set active menu item based on current page
        const currentPath = window.location.pathname;
        const currentPage = currentPath.substring(currentPath.lastIndexOf('/') + 1);
        const menuItem = document.querySelector(`.nav-item[href="${currentPage}"]`);
        if (menuItem) {
            menuItem.classList.add('active');
        }
    } catch (error) {
        console.error('Error loading sidebar:', error);
    }
}

// Load sidebar when DOM is ready
document.addEventListener('DOMContentLoaded', loadSidebar);
