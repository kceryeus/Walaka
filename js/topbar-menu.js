document.addEventListener('DOMContentLoaded', function() {
    // Get current page path
    const currentPath = window.location.pathname;
    
    // Get all menu items
    const menuItems = document.querySelectorAll('.top-bar-menu-item');
    
    // Set active menu item based on current page
    menuItems.forEach(item => {
        const href = item.getAttribute('href');
        if (currentPath.includes(href)) {
            item.classList.add('active');
        }
    });

    // Mobile menu toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // Submenu toggle functionality
    const submenuHeaders = document.querySelectorAll('.nav-header.has-submenu');
    
    submenuHeaders.forEach(header => {
        const navSection = header.closest('.nav-section');
        const submenu = navSection.querySelector('.submenu');
        
        // Check if current page is in this submenu
        const submenuLinks = submenu.querySelectorAll('.nav-item');
        let isActive = false;
        
        submenuLinks.forEach(link => {
            if (currentPath.includes(link.getAttribute('href'))) {
                isActive = true;
                link.classList.add('active');
            }
        });
        
        // If current page is in submenu, expand it
        if (isActive) {
            navSection.classList.add('active');
        }
        
        // Toggle submenu on click
        header.addEventListener('click', (e) => {
            e.preventDefault();
            navSection.classList.toggle('active');
        });
    });
}); 