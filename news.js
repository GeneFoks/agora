// ── AGORA NEWS / UPDATES ─────────────────────────────────────────────────────
// Каждое обновление — объект. Новые добавляются В НАЧАЛО массива.
// num — порядковый номер («патч»), dateText — дата словами, tag — одна из:
// «Стройка» | «Земля» | «Документы» | «Сайт» | «Сообщество»
window.AGORA_NEWS = [
  {
    num: '002',
    dateText: '10 ноября 2026',
    tag: 'Сайт',
    title: 'Сайт перестроен по Blueprint 1.0',
    html: '<p>Весь сайт собран заново на основе проектного корпуса: новая главная с Хартией строителя и четырьмя горизонтами, полный манифест, страница первой земли Agora-01 с фазами и честным статусом, журнал, люди и четыре круга участия.</p>' +
          '<p>Из обновлений дизайна: свой знак-фавикон, карточки для соцсетей, чертёжная сетка в статус-панелях, мобильное меню. Убраны старые обещания и цифры, не подтверждённые делом.</p>'
  },
  {
    num: '001',
    dateText: '18 октября 2026',
    tag: 'Документы',
    title: 'Blueprint 1.0 завершён',
    html: '<p>Закончен полный проектный корпус AGORA: 40 документов — от манифеста и конституции до инженерии воды, финансовой модели, плана первых 100 дней и протокола масштабирования — и книга-манифест «АГОРА. Незаконченная цивилизация».</p>' +
          '<p>Что это меняет: у проекта теперь есть единый источник правды. Каждое утверждение в нём помечено — что решено, что является целью, что гипотезой, а что нужно проверить.</p>' +
          '<p>Что дальше: идёт поиск и проверка участка ~18 акров в районе Остина. Ни один участок пока не куплен. Следующая запись появится, когда будет реальное продвижение — по земле или по подготовке.</p>'
  }
];

// ── Рендер ───────────────────────────────────────────────────────────────────
(function () {
  function renderFeed() {
    var feed = document.getElementById('news-feed');
    if (feed) {
      feed.innerHTML = window.AGORA_NEWS.map(function (n, i) {
        return '<article class="news-entry' + (i === 0 ? ' news-latest' : '') + '">' +
          '<div class="news-head">' +
            '<span class="news-num">Обновление ' + n.num + '</span>' +
            '<span class="news-chip">' + n.tag + '</span>' +
            (i === 0 ? '<span class="news-chip news-chip-new">Новое</span>' : '') +
            '<span class="news-date">' + n.dateText + '</span>' +
          '</div>' +
          '<h2 class="news-title">' + n.title + '</h2>' +
          '<div class="news-body">' + n.html + '</div>' +
        '</article>';
      }).join('');
    }

    var strip = document.getElementById('news-latest-strip');
    if (strip && window.AGORA_NEWS.length) {
      var n = window.AGORA_NEWS[0];
      strip.innerHTML =
        '<a href="/journal" class="news-strip-inner">' +
          '<span class="news-strip-dot"></span>' +
          '<span class="news-strip-label">Обновление ' + n.num + ' · ' + n.dateText + '</span>' +
          '<span class="news-strip-title">' + n.title + '</span>' +
          '<span class="news-strip-arrow">→</span>' +
        '</a>';
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderFeed);
  } else {
    renderFeed();
  }
})();
