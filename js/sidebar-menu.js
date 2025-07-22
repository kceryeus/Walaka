// Sidebar Menu Functionality
function initSidebarMenu() {
    // Get all nav sections with submenus
    const navSections = document.querySelectorAll('.sidebar .nav-section');
    
    // Add click event listeners to nav headers
    navSections.forEach(section => {
        const header = section.querySelector('.nav-header.has-submenu');
        if (header) {
            header.addEventListener('click', function(e) {
                e.preventDefault();
                // Toggle active class on the section
                section.classList.toggle('active');
                // Optionally, close other sections at the same level
                navSections.forEach(otherSection => {
                    if (otherSection !== section) {
                        otherSection.classList.remove('active');
                    }
                });
            });
        }
    });
}

// If sidebar is loaded dynamically, wait for it to be injected
function waitForSidebarAndInit() {
    const sidebar = document.querySelector('#sidebar-container .sidebar');
    if (sidebar) {
        initSidebarMenu();
    } else {
        setTimeout(waitForSidebarAndInit, 50);
    }
}

// If sidebar is static, initialize immediately
if (document.querySelector('.sidebar')) {
    initSidebarMenu();
} else {
    // If sidebar is loaded dynamically, wait for it
    waitForSidebarAndInit();
}

// Handle menu toggle button
// [DISABLED FOR DASHBOARD.HTML] - Sidebar toggle logic is now handled in dashboard.html to avoid conflicts with overlay and responsive logic.
// function initSidebarToggle() {
//     const menuToggle = document.querySelector('.menu-toggle');
//     const sidebar = document.querySelector('.sidebar');
//     if (menuToggle && sidebar) {
//         menuToggle.addEventListener('click', function() {
//             sidebar.classList.toggle('active');
//         });
//     }
//     // Close sidebar when clicking outside on mobile
//     document.addEventListener('click', function(e) {
//         if (window.innerWidth <= 768 && sidebar) {
//             const isClickInsideSidebar = sidebar.contains(e.target);
//             const isClickOnMenuToggle = menuToggle && menuToggle.contains(e.target);
//             if (!isClickInsideSidebar && !isClickOnMenuToggle && sidebar.classList.contains('active')) {
//                 sidebar.classList.remove('active');
//             }
//         }
//     });
//     // Handle window resize
//     window.addEventListener('resize', function() {
//         if (window.innerWidth > 768 && sidebar) {
//             sidebar.classList.remove('active');
//         }
//     });
// }

// [DISABLED FOR DASHBOARD.HTML]
// initSidebarToggle(); 