// Sidebar Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    // Get all nav sections with submenus
    const navSections = document.querySelectorAll('.nav-section');
    
    // Add click event listeners to nav headers
    navSections.forEach(section => {
        const header = section.querySelector('.nav-header.has-submenu');
        if (header) {
            header.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Toggle active class on the section
                section.classList.toggle('active');
                
                // Close other sections
                navSections.forEach(otherSection => {
                    if (otherSection !== section) {
                        otherSection.classList.remove('active');
                    }
                });
            });
        }
    });

    // Handle menu toggle button
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', function() {
            sidebar.classList.toggle('active');
        });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            const isClickInsideSidebar = sidebar.contains(e.target);
            const isClickOnMenuToggle = menuToggle.contains(e.target);
            
            if (!isClickInsideSidebar && !isClickOnMenuToggle && sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
            }
        }
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
        }
    });
}); 