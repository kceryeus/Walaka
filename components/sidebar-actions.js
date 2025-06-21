// Sidebar dynamic expand/collapse for components/sidebar.html
(function() {
    function initSidebarActions() {
        // Only target the sidebar in this component
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;
        // Find all nav headers with submenus (these are <h3> elements)
        const navHeaders = sidebar.querySelectorAll('.nav-header.has-submenu');
        navHeaders.forEach(header => {
            header.addEventListener('click', function(e) {
                e.preventDefault();
                const parentSection = header.closest('.nav-section');
                if (!parentSection) return;
                // Toggle this section
                parentSection.classList.toggle('active');
                // Close sibling sections at the same level
                const siblingSections = Array.from(parentSection.parentElement.children)
                    .filter(el => el !== parentSection && el.classList.contains('nav-section'));
                siblingSections.forEach(sibling => sibling.classList.remove('active'));
            });
        });
        // Apply translations to sidebar after actions are initialized
        if (window.languageManager && typeof window.languageManager.applyTranslations === 'function') {
            window.languageManager.applyTranslations();
        }
    }
    // Run on DOMContentLoaded or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSidebarActions);
    } else {
        initSidebarActions();
    }
    // Listen for languageChanged event to re-apply translations
    window.addEventListener('languageChanged', function() {
        if (window.languageManager && typeof window.languageManager.applyTranslations === 'function') {
            window.languageManager.applyTranslations();
        }
    });
})(); 