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
    const dashboardContainer = document.querySelector('.dashboard-container');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (dashboardContainer) {
                dashboardContainer.classList.toggle('sidebar-active');
            } else if (sidebar) {
                sidebar.classList.toggle('active');
            }
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
                // Only expand the immediate parent of the active link
                const parentSection = link.closest('.nav-section');
                if (parentSection) {
                    parentSection.classList.add('active');
                }
            }
        });
        
        // Toggle submenu on click
        header.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent event from bubbling up
            
            // Toggle the current submenu
            navSection.classList.toggle('active');
            
            // If this is a parent menu, don't close other parent menus
            if (!navSection.closest('.submenu')) {
                return;
            }
            
            // If this is a child menu, close other child menus at the same level
            const parentSubmenu = navSection.closest('.submenu');
            if (parentSubmenu) {
                const siblingSections = parentSubmenu.querySelectorAll('.nav-section');
                siblingSections.forEach(section => {
                    if (section !== navSection) {
                        section.classList.remove('active');
                    }
                });
            }
        });
    });
}); 