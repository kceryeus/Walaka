// Sidebar dynamic expand/collapse for components/sidebar.html
(function() {
    function getBasePath() {
        const repoName = 'Walaka';
        const isGitHubPages = window.location.hostname.includes('github.io');
        return isGitHubPages ? `/${repoName}/` : '/';
    }

    function updateSidebarLinks() {
        const basePath = getBasePath();
        // The sidebar is inside #sidebar-container, but the main element has .sidebar class
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        const links = sidebar.querySelectorAll('a');
        links.forEach(link => {
            const href = link.getAttribute('href');
            // Ensure href exists, is not an absolute URL, not just a '#' anchor, and not already correct.
            if (href && !href.startsWith('http') && href !== '#' && !href.startsWith(basePath)) {
                // Avoid modifying mailto links or javascript calls
                if (href.startsWith('mailto:') || href.startsWith('javascript:')) {
                    return;
                }
                // Prepend basePath. Remove any leading slashes to prevent `//`
                const cleanHref = href.replace(/^\//, '');
                link.href = basePath + cleanHref;
            }
        });
    }

    function updateSidebarLogo() {
        const basePath = getBasePath();
        const logoImg = document.getElementById('sidebar-logo');
        if (logoImg) {
            logoImg.src = basePath + 'assets/images/walaka-logo.PNG';
        }
    }

    function initSidebarActions() {
        // Only target the sidebar in this component
        const sidebar = document.querySelector('.sidebar');
        if (!sidebar) return;

        updateSidebarLinks(); // Update links as soon as sidebar is present
        updateSidebarLogo(); // Set the logo src dynamically

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