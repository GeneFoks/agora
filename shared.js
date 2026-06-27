(function() {
  var p = window.location.pathname.replace(/\/+$/, '').split('/').pop().replace(/\.html$/, '');
  if (p === '' || p === 'index') p = 'home';

  var links = [
    { href: '/',      slug: 'home',  key: 'nav.home' },
    { href: '/about', slug: 'about', key: 'nav.about' },
    { href: '/manifesto', slug: 'manifesto', key: 'nav.manifesto' },
    { href: '/land',  slug: 'land',  key: 'nav.land' },
    { href: '/map',   slug: 'map',   key: 'nav.map' },
    { href: '/join',  slug: 'join',  key: 'nav.join' },
  ];

  function renderNav() {
    var lang = window.AgoraI18n ? window.AgoraI18n.getLang() : 'ru';
    var t = function(k) { return window.AgoraI18n ? window.AgoraI18n.t(k) : k; };

    document.getElementById('nav-placeholder').innerHTML =
      '<nav>' +
        '<a href="/" class="nav-logo">AGORA <span>·</span> FOUNDATION</a>' +
        '<div class="nav-links">' +
          links.map(function(l) {
            return '<a href="' + l.href + '" class="' + (p === l.slug ? 'active' : '') + '" data-i18n="' + l.key + '">' + t(l.key) + '</a>';
          }).join('') +
          '<a href="/app" class="nav-login"><span class="nav-login-icon">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>' +
          '</span><span>' + (lang === 'ru' ? 'Кабинет' : 'Account') + '</span></a>' +
          '<a href="/join" class="nav-cta" data-i18n="nav.cta">' + t('nav.cta') + '</a>' +
          '<div class="lang-switcher">' +
            '<button class="lang-btn' + (lang === 'ru' ? ' active' : '') + '" data-lang="ru" onclick="window.AgoraI18n.setLang(\'ru\')">RU</button>' +
            '<button class="lang-btn' + (lang === 'en' ? ' active' : '') + '" data-lang="en" onclick="window.AgoraI18n.setLang(\'en\')">EN</button>' +
          '</div>' +
          '<button class="theme-toggle" onclick="window.AgoraTheme.set(window.AgoraTheme.get()===\'dark\'?\'light\':\'dark\')" title="Light / dark">' +
            '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.5A8.5 8.5 0 1 1 11.5 3 7 7 0 0 0 21 12.5z"/></svg>' +
            '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>' +
          '</button>' +
        '</div>' +
      '</nav>';
  }

  function renderFooter() {
    var t = function(k) { return window.AgoraI18n ? window.AgoraI18n.t(k) : k; };

    document.getElementById('footer-placeholder').innerHTML =
      '<footer>' +
        '<div class="footer-inner">' +
          '<div>' +
            '<div class="footer-logo">AGORA <span>·</span> FOUNDATION</div>' +
            '<p class="footer-desc" data-i18n="footer.desc">' + t('footer.desc') + '</p>' +
          '</div>' +
          '<div class="footer-col">' +
            '<h4 data-i18n="footer.nav">' + t('footer.nav') + '</h4>' +
            links.map(function(l) {
              return '<a href="' + l.href + '" data-i18n="' + l.key + '">' + t(l.key) + '</a>';
            }).join('') +
          '</div>' +
          '<div class="footer-col">' +
            '<h4 data-i18n="footer.contact">' + t('footer.contact') + '</h4>' +
            '<a href="https://t.me/agorausa" target="_blank">Telegram: t.me/agorausa</a>' +
            '<a href="https://gofund.me/41a2c4cc1" target="_blank">GoFundMe</a>' +
            '<a href="https://bestiehere.com/signup?ref=D46EB3DC" target="_blank" data-i18n="nav.app">' + t('nav.app') + '</a>' +
            '<a href="/join" data-i18n="nav.cta">' + t('nav.cta') + '</a>' +
            '<a href="/land" data-i18n="nav.land">' + t('nav.land') + '</a>' +
          '</div>' +
        '</div>' +
        '<div class="footer-bottom">' +
          '<span data-i18n="footer.bottom">' + t('footer.bottom') + '</span>' +
          '<span style="font-style:italic;font-family:\'Cormorant Garamond\',serif;font-size:13px;" data-i18n="footer.quote">' + t('footer.quote') + '</span>' +
        '</div>' +
      '</footer>';
  }

  // ── Scroll reveal ──────────────────────────────────────────────────────────
  function initScrollReveal() {
    var els = document.querySelectorAll('.card, .problem-item, .value-row, .zone-card, .highlight, .stat-item');
    if (!els.length) return;

    els.forEach(function (el, i) {
      el.classList.add('reveal');
      el.style.transitionDelay = (Math.min(i % 6, 5) * 60) + 'ms';
    });

    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(function (el) { obs.observe(el); });
  }

  // ── Plot counter (reads AGORA plot data if present on the page) ────────────
  function initPlotCounter() {
    var el = document.getElementById('plotCounter');
    if (!el) return;
    var total = parseInt(el.getAttribute('data-total'), 10) || 12;
    var sold = parseInt(el.getAttribute('data-sold'), 10) || 0;
    var pct = Math.round((sold / total) * 100);
    var fill = el.querySelector('.plot-counter-fill');
    var text = el.querySelector('.plot-counter-text');
    if (text) {
      var label = window.AgoraI18n ? window.AgoraI18n.t('map.counter.label') : 'plots taken';
      text.innerHTML = '<strong>' + sold + ' / ' + total + '</strong> ' + label;
    }
    if (fill) {
      requestAnimationFrame(function () {
        setTimeout(function () { fill.style.width = pct + '%'; }, 100);
      });
    }
  }

  // ── Hero video parallax (depth effect while scrolling) ─────────────────────
  function initHeroParallax() {
    var el = document.getElementById('heroParallax');
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < window.innerHeight) {
          el.style.transform = 'translateY(' + (y * 0.35) + 'px)';
        }
        ticking = false;
      });
    }, { passive: true });
  }

  // Render nav & footer; re-render nav on lang change so text updates
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { renderNav(); renderFooter(); initScrollReveal(); initPlotCounter(); initHeroParallax(); });
  } else {
    renderNav();
    renderFooter();
    initScrollReveal();
    initPlotCounter();
    initHeroParallax();
  }

  // Re-render nav/footer whenever language changes
  var _origSetLang = null;
  var _interval = setInterval(function() {
    if (window.AgoraI18n && !_origSetLang) {
      _origSetLang = window.AgoraI18n.setLang;
      window.AgoraI18n.setLang = function(lang) {
        _origSetLang(lang);
        renderNav();
        renderFooter();
      };
      clearInterval(_interval);
    }
  }, 50);
})();
