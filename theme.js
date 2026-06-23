(function () {
  var KEY = 'agora_theme';

  function getTheme() { return localStorage.getItem(KEY) || 'dark'; }

  function setTheme(theme) {
    localStorage.setItem(KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-toggle').forEach(function (b) {
      b.setAttribute('aria-pressed', theme === 'light');
    });
  }

  window.AgoraTheme = { get: getTheme, set: setTheme };

  // Apply immediately (before paint) to avoid flash of wrong theme.
  document.documentElement.setAttribute('data-theme', getTheme());
})();
