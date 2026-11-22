// АГОРА ТЕХАС — зоны по «Генплану участка v1» (концепт, не проектная документация).
// from / to — расстояние в метрах от передней границы у County Road 132,
// по длине участка. 0 м = x северо-восточного угла у дороги (P1): при этом
// площади зон совпадают с таблицей генплана в среднем с точностью 0,16 %.
// stage: очередь строительства (I — дек 2026–весна 2027, II — 2027, III — 2028+).
window.AGORA_LAND_PLAN = {
  version: 'Генплан v1',
  front_x: 694.687,   // x северо-восточного угла (P1) в метрах межевания; d = front_x − x
  zones: [
    { n: 1,  from: -10, to: 12,  color: '#b9b4a8', stage: 'I',
      ru: 'Парковка P1', en: 'Parking P1',
      d_ru: '~9 машин под 90° за ЛЭП, въезд 6 м с culvert', d_en: '~9 cars at 90° behind the power line, 6 m entrance with culvert' },
    { n: 2,  from: 12,  to: 38,  color: '#bfe0a8', stage: 'I',
      ru: 'Зона приветствия', en: 'Welcome area',
      d_ru: 'Забор и ворота, арка, цветник, пожарный резервуар, вода, электрощит', d_en: 'Fence and gate, arch, flower bed, fire tank, water, power' },
    { n: 3,  from: 38,  to: 85,  color: '#f2c879', stage: 'I',
      ru: 'Павильон · площадь', en: 'Pavilion · square',
      d_ru: 'Пятно 20×40 м по центру ширины, первым строим павильон для сборов', d_en: '20×40 m spot in the middle; the pavilion for gatherings comes first' },
    { n: 4,  from: 85,  to: 155, color: '#eba07c', stage: 'I',
      ru: 'Баня №1 · пруд · купель', en: 'Bathhouse #1 · pond · plunge pool',
      d_ru: 'Баня ~6×8 м с террасой, купель 5×12 м, пруд ~28×18 м, костровая и лаунж', d_en: 'Bathhouse ~6×8 m with deck, 5×12 m plunge pool, ~28×18 m pond, fire pit and lounge' },
    { n: 5,  from: 155, to: 230, color: '#b7dc8f', stage: 'II–III',
      ru: 'Парк · места под бани №2–4', en: 'Park · sites for bathhouses #2–4',
      d_ru: 'Газон-парк, места под 3 бани, септик-1 для павильона и бань', d_en: 'Lawn park, sites for 3 bathhouses, septic-1 for the pavilion and bathhouses' },
    { n: 6,  from: 230, to: 250, color: '#ddd9c9', stage: 'II',
      ru: 'Пробел · гостевая парковка P2', en: 'Gap · guest parking P2',
      d_ru: 'Газон, временная парковка на ~25–30 машин для событий', d_en: 'Lawn, temporary parking for ~25–30 cars at events' },
    { n: 7,  from: 250, to: 350, color: '#a9c9ec', stage: 'II → III',
      ru: 'Жилая зона · 10 домиков', en: 'Living area · 10 cabins',
      d_ru: '10 домиков 5×7 м, 2 ряда по 5 (старт — 5), центральная поляна и санблок', d_en: '10 cabins 5×7 m in 2 rows of 5 (start with 5), central green and wash house' },
    { n: 8,  from: 350, to: 380, color: '#ddd9c9', stage: 'II',
      ru: 'Пробел · септик-2', en: 'Gap · septic-2',
      d_ru: 'Буфер от запахов и шума фермы, септик-2 для жилой зоны', d_en: 'Buffer from farm smells and noise, septic-2 for the living area' },
    { n: 9,  from: 380, to: 500, color: '#e3c787', stage: 'II–III',
      ru: 'Ферма · техзона', en: 'Farm · utility area',
      d_ru: 'Сарай-мастерская 20×12, теплица 30×10, курятник 20×16, гуси, козы/овцы, корова, компост', d_en: 'Barn/workshop 20×12, greenhouse 30×10, coop 20×16, geese, goats/sheep, cow, compost' },
    { n: 10, from: 500, to: 560, color: '#e6e2d3', stage: 'резерв',
      ru: 'Пробел · резерв расширения', en: 'Gap · reserve for growth',
      d_ru: 'Газон, резерв под домики, бани или ферму', d_en: 'Lawn, reserve for cabins, bathhouses or the farm' },
    { n: 11, from: 560, to: 720, color: '#93cc8c', stage: 'III',
      ru: 'Сад + спорт (низина)', en: 'Orchard + sport (lowland)',
      d_ru: 'Низина у ручья: сад ~20 деревьев, поле 40×30, турники, босоногая тропа. Без строений', d_en: 'Lowland by the creek: ~20-tree orchard, 40×30 field, pull-up bars, barefoot trail. No buildings' }
  ],
  road: { width: 6, to: 555, turnaround_d: 555, turnaround_diameter: 29,
          ru: 'Внутренняя дорога 6 м вдоль южной границы, разворот', en: '6 m internal road along the south line, turnaround' },
  stages: {
    'I': { ru: 'I · старт (дек 2026 – весна 2027)', en: 'I · start (Dec 2026 – spring 2027)' },
    'II': { ru: 'II · гости и жизнь (2027)', en: 'II · guests and life (2027)' },
    'III': { ru: 'III · рост (2028+)', en: 'III · growth (2028+)' }
  }
};
