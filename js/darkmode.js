(function() {
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  }
  window.setTheme = setTheme;
  window.toggleTheme = toggleTheme;

  // Set initial theme on page load
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    setTheme(savedTheme);
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }
})(); 