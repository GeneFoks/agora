// Полосы Big Five — общие для страницы теста и кабинета.
import { t, lang, esc } from './account.js';

export function ipipBars(row, opts = {}) {
  const IP = window.AGORA_IPIP;
  const en = lang() === 'en';
  return IP.factors.map((f) => {
    const score = IP.displayScore(row, f);
    const lvl = IP.level(f.id, score);
    const pct = Math.round(((score - 10) / 40) * 100);
    const th = IP.thresholds[f.id];
    const lo = ((th.low_max + 0.5 - 10) / 40) * 100;
    const hi = ((th.high_min - 0.5 - 10) / 40) * 100;
    return '<div class="ip-factor">' +
      '<div class="ip-fhead"><b>' + esc(en ? f.en : f.ru) + '</b><span class="ip-lvl ' + lvl + '">' +
        esc(t('ip.level.' + lvl)) + ' · ' + score + '</span></div>' +
      '<div class="ip-track"><i class="ip-band" style="left:' + lo + '%;width:' + (hi - lo) + '%"></i>' +
        '<i class="ip-fill" style="width:' + pct + '%"></i></div>' +
      '<div class="ip-poles"><span>' + esc(en ? f.low_en : f.low_ru) + '</span><span>' + esc(en ? f.high_en : f.high_ru) + '</span></div>' +
      (opts.compact ? '' : '<p class="ip-explain">' + esc(IP.texts[f.id][lvl][en ? 'en' : 'ru']) + '</p>') +
    '</div>';
  }).join('');
}

// "Экстраверсия: высокий · Доброжелательность: средний · …"
export function ipipLine(row) {
  const IP = window.AGORA_IPIP;
  const en = lang() === 'en';
  return IP.factors.map((f) => (en ? f.en : f.ru) + ': ' + t('ip.level.' + IP.level(f.id, IP.displayScore(row, f)))).join(' · ');
}
