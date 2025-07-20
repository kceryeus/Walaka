// Dark mode pill toggle logic for dynamic sidebar loading
window.initSidebarDarkModeIcon = function() {
    const pill = document.getElementById('darkmode-pill-toggle');
    const highlight = document.getElementById('darkmode-pill-highlight');
    const lightBtn = document.getElementById('light-mode-btn');
    const darkBtn = document.getElementById('dark-mode-btn');
    function updatePillUI() {
        const theme = document.documentElement.getAttribute('data-theme');
        if (pill) {
            if (theme === 'dark') {
                pill.classList.add('dark');
            } else {
                pill.classList.remove('dark');
            }
        }
        console.log('[DarkMode] updatePillUI called, theme:', theme);
    }
    if (lightBtn) {
        lightBtn.onclick = function() {
            console.log('[DarkMode] Light mode button clicked', window.setTheme);
            if (window.setTheme) window.setTheme('light');
        };
    }
    if (darkBtn) {
        darkBtn.onclick = function() {
            console.log('[DarkMode] Dark mode button clicked', window.setTheme);
            if (window.setTheme) window.setTheme('dark');
        };
    }
    // Also update on theme change
    const observer = new MutationObserver(updatePillUI);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    updatePillUI();
    console.log('[DarkMode] Pill toggle initialized');
}; 