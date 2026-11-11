// ─── AGORA · Тест Big Five (IPIP-50) ────────────────────────────────────────
// Источник: International Personality Item Pool (ipip.ori.org),
// «50-item IPIP Big-Five Factor Markers» (Goldberg). Public domain.
// Английские формулировки и ключи сверены с ipip.ori.org 2026-11-11.
//
// key: 'E' Экстраверсия, 'A' Доброжелательность, 'C' Добросовестность,
//      'S' Эмоциональная стабильность, 'O' Открытость/Интеллект.
// sign: +1 прямой пункт, −1 обратный (считается как 6 − ответ).
// Подсчёт дублируется в базе (db/003_ipip.sql) — база главная.
(function () {
  // translation_status: "draft" — собственный перевод. Заменить на
  // валидированную версию: Князев, Митрофанова, Бочарова (2010),
  // Психологический журнал, т. 31, № 5.
  var RU_TRANSLATION = { status: 'draft', id: 'ru-draft-1' };

  var ITEMS = [
    [1, 'E', +1, 'Am the life of the party.', 'Я душа компании.'],
    [2, 'A', -1, 'Feel little concern for others.', 'Меня мало заботят другие люди.'],
    [3, 'C', +1, 'Am always prepared.', 'Я всегда подготовлен(а).'],
    [4, 'S', -1, 'Get stressed out easily.', 'Я легко впадаю в стресс.'],
    [5, 'O', +1, 'Have a rich vocabulary.', 'У меня богатый словарный запас.'],
    [6, 'E', -1, 'Don\'t talk a lot.', 'Я немногословен(на).'],
    [7, 'A', +1, 'Am interested in people.', 'Мне интересны люди.'],
    [8, 'C', -1, 'Leave my belongings around.', 'Я оставляю свои вещи где попало.'],
    [9, 'S', +1, 'Am relaxed most of the time.', 'Большую часть времени я спокоен(на).'],
    [10, 'O', -1, 'Have difficulty understanding abstract ideas.', 'Мне трудно понимать абстрактные идеи.'],
    [11, 'E', +1, 'Feel comfortable around people.', 'Мне комфортно среди людей.'],
    [12, 'A', -1, 'Insult people.', 'Я оскорбляю людей.'],
    [13, 'C', +1, 'Pay attention to details.', 'Я внимателен(на) к деталям.'],
    [14, 'S', -1, 'Worry about things.', 'Я переживаю по разным поводам.'],
    [15, 'O', +1, 'Have a vivid imagination.', 'У меня живое воображение.'],
    [16, 'E', -1, 'Keep in the background.', 'Я держусь в тени.'],
    [17, 'A', +1, 'Sympathize with others\' feelings.', 'Я сопереживаю чувствам других людей.'],
    [18, 'C', -1, 'Make a mess of things.', 'Я устраиваю беспорядок в делах.'],
    [19, 'S', +1, 'Seldom feel blue.', 'Мне редко бывает грустно.'],
    [20, 'O', -1, 'Am not interested in abstract ideas.', 'Мне неинтересны абстрактные идеи.'],
    [21, 'E', +1, 'Start conversations.', 'Я первым(ой) начинаю разговор.'],
    [22, 'A', -1, 'Am not interested in other people\'s problems.', 'Меня не интересуют чужие проблемы.'],
    [23, 'C', +1, 'Get chores done right away.', 'Я делаю домашние дела сразу.'],
    [24, 'S', -1, 'Am easily disturbed.', 'Меня легко выбить из колеи.'],
    [25, 'O', +1, 'Have excellent ideas.', 'У меня отличные идеи.'],
    [26, 'E', -1, 'Have little to say.', 'Мне мало что есть сказать.'],
    [27, 'A', +1, 'Have a soft heart.', 'У меня мягкое сердце.'],
    [28, 'C', -1, 'Often forget to put things back in their proper place.', 'Я часто забываю положить вещи на место.'],
    [29, 'S', -1, 'Get upset easily.', 'Я легко расстраиваюсь.'],
    [30, 'O', -1, 'Do not have a good imagination.', 'У меня не очень хорошее воображение.'],
    [31, 'E', +1, 'Talk to a lot of different people at parties.', 'На вечеринках я общаюсь со множеством разных людей.'],
    [32, 'A', -1, 'Am not really interested in others.', 'Другие люди мне не особо интересны.'],
    [33, 'C', +1, 'Like order.', 'Я люблю порядок.'],
    [34, 'S', -1, 'Change my mood a lot.', 'Моё настроение часто меняется.'],
    [35, 'O', +1, 'Am quick to understand things.', 'Я быстро всё схватываю.'],
    [36, 'E', -1, 'Don\'t like to draw attention to myself.', 'Я не люблю привлекать к себе внимание.'],
    [37, 'A', +1, 'Take time out for others.', 'Я нахожу время для других.'],
    [38, 'C', -1, 'Shirk my duties.', 'Я уклоняюсь от своих обязанностей.'],
    [39, 'S', -1, 'Have frequent mood swings.', 'У меня частые перепады настроения.'],
    [40, 'O', +1, 'Use difficult words.', 'Я использую сложные слова.'],
    [41, 'E', +1, 'Don\'t mind being the center of attention.', 'Я не против быть в центре внимания.'],
    [42, 'A', +1, 'Feel others\' emotions.', 'Я чувствую эмоции других людей.'],
    [43, 'C', +1, 'Follow a schedule.', 'Я живу по расписанию.'],
    [44, 'S', -1, 'Get irritated easily.', 'Я легко раздражаюсь.'],
    [45, 'O', +1, 'Spend time reflecting on things.', 'Я провожу время, размышляя о разном.'],
    [46, 'E', -1, 'Am quiet around strangers.', 'Я молчалив(а) с незнакомыми людьми.'],
    [47, 'A', +1, 'Make people feel at ease.', 'Рядом со мной людям легко и спокойно.'],
    [48, 'C', +1, 'Am exacting in my work.', 'Я требователен(на) к своей работе.'],
    [49, 'S', -1, 'Often feel blue.', 'Мне часто бывает грустно.'],
    [50, 'O', +1, 'Am full of ideas.', 'Я полон(на) идей.']
  ].map(function (r) { return { n: r[0], key: r[1], sign: r[2], en: r[3], ru: r[4] }; });

  // Пороги уровня по сумме 10–50 (вынесены в конфиг по ТЗ).
  // Правило IPIP: «средний» = в пределах ±½ SD от среднего по выборке
  // (ipip.ori.org, Interpreting Individual IPIP Scale Scores).
  // Средние/SD — опубликованная выборка IPIP-50 (n = 3 472, самоотбор,
  // jobcannon.io/research/big-five-technical-manual), переведённые из
  // шкалы 0–100 в сумму 10–50. Пересчитать на своих данных после ~100 тестов.
  //   E  M 28.6 SD 8.5 · A  M 36.9 SD 7.2 · C  M 34.2 SD 7.0
  //   N  M 31.8 SD 8.3 (= 60 − стабильность) · O  M 38.1 SD 6.8
  var THRESHOLDS = {
    extraversion:      { low_max: 24, high_min: 33 },
    agreeableness:     { low_max: 33, high_min: 41 },
    conscientiousness: { low_max: 30, high_min: 38 },
    neuroticism:       { low_max: 27, high_min: 36 },
    openness:          { low_max: 34, high_min: 42 }
  };

  // Порядок полос в результате. Нейротизм = 60 − эмоциональная стабильность.
  var FACTORS = [
    { id: 'extraversion', col: 'extraversion',
      ru: 'Экстраверсия', en: 'Extraversion',
      low_ru: 'Интроверсия', high_ru: 'Экстраверсия', low_en: 'Introversion', high_en: 'Extraversion' },
    { id: 'agreeableness', col: 'agreeableness',
      ru: 'Доброжелательность', en: 'Agreeableness',
      low_ru: 'Прямота', high_ru: 'Тёплость', low_en: 'Directness', high_en: 'Warmth' },
    { id: 'conscientiousness', col: 'conscientiousness',
      ru: 'Добросовестность', en: 'Conscientiousness',
      low_ru: 'Гибкость', high_ru: 'Организованность', low_en: 'Flexibility', high_en: 'Organisation' },
    { id: 'neuroticism', col: 'emotional_stability', invert: true,
      ru: 'Нейротизм', en: 'Neuroticism',
      low_ru: 'Спокойствие', high_ru: 'Чувствительность', low_en: 'Calm', high_en: 'Sensitivity' },
    { id: 'openness', col: 'openness',
      ru: 'Открытость', en: 'Openness',
      low_ru: 'Практичность', high_ru: 'Любознательность', low_en: 'Practicality', high_en: 'Curiosity' }
  ];

  // Пояснения к уровням (1–2 предложения), RU/EN.
  var TEXTS = {
    extraversion: {
      low: { ru: 'Тебя чаще заряжают тишина и узкий круг, чем большие компании. В команде ты скорее работаешь сосредоточенно и говоришь, когда есть что сказать.',
             en: 'You recharge more in quiet and small circles than in big groups. In a team you tend to work with focus and speak when you have something to say.' },
      mid: { ru: 'Тебе комфортно и с людьми, и одному — смотря по ситуации. Можешь включиться в общение, а можешь уйти в свою задачу.',
             en: 'You’re comfortable both with people and on your own, depending on the moment. You can join in or go deep into your own task.' },
      high: { ru: 'Тебя заряжают люди, разговоры и движение. Ты легко начинаешь контакт и оживляешь группу.',
              en: 'People, conversation and movement charge you up. You start contact easily and bring a group to life.' }
    },
    agreeableness: {
      low: { ru: 'Ты прямолинеен(на) и готов(а) спорить за то, что считаешь правильным. Тебе важнее суть, чем то, чтобы всем было приятно.',
             en: 'You’re straightforward and ready to argue for what you think is right. Substance matters more to you than keeping everyone comfortable.' },
      mid: { ru: 'Ты умеешь и поддержать, и отстоять своё. Мягкость и твёрдость включаются по ситуации.',
             en: 'You can both support others and stand your ground. Softness and firmness switch on as the situation needs.' },
      high: { ru: 'Тебе важны люди и их чувства: ты замечаешь, кому плохо, и легко идёшь навстречу. Рядом с тобой обычно тепло.',
              en: 'People and their feelings matter to you: you notice who is struggling and meet others halfway. It’s usually warm around you.' }
    },
    conscientiousness: {
      low: { ru: 'Ты гибок(ка) и легко меняешь планы, жёсткие расписания тебя скорее сковывают. Порядку и срокам может помогать внешняя опора.',
             en: 'You’re flexible and change plans easily; rigid schedules tend to feel constraining. Order and deadlines may benefit from outside structure.' },
      mid: { ru: 'Ты держишь порядок и сроки, когда это важно, и позволяешь себе свободу, когда нет.',
             en: 'You keep order and deadlines when it matters and allow yourself freedom when it doesn’t.' },
      high: { ru: 'Ты организован(а), держишь слово и доводишь дела до конца. На тебя можно опереться в сроках и деталях.',
              en: 'You’re organised, keep your word and finish what you start. Others can rely on you for deadlines and details.' }
    },
    neuroticism: {
      low: { ru: 'Ты обычно спокоен(на) и ровно переносишь стресс. Тебя непросто выбить из колеи.',
             en: 'You’re usually calm and handle stress steadily. It takes a lot to throw you off balance.' },
      mid: { ru: 'Обычно ты в равновесии, но в напряжённые периоды переживания заметно ощущаются.',
             en: 'You’re usually balanced, but in tense periods worries are clearly felt.' },
      high: { ru: 'Ты остро чувствуешь напряжение и переживания. Тебе особенно важны поддержка, понятные договорённости и время на восстановление.',
              en: 'You feel tension and worry strongly. Support, clear agreements and time to recover matter especially to you.' }
    },
    openness: {
      low: { ru: 'Ты ценишь практичное, проверенное и конкретное. Тебя больше привлекает то, что работает, чем отвлечённые идеи.',
             en: 'You value the practical, proven and concrete. What works appeals to you more than abstract ideas.' },
      mid: { ru: 'Тебе интересны новые идеи, если они связаны с делом. Ты сочетаешь любопытство с практичностью.',
             en: 'New ideas interest you when they connect to real work. You combine curiosity with practicality.' },
      high: { ru: 'Тебя притягивают идеи, образы и сложные вопросы. Ты легко придумываешь и любишь разбираться в новом.',
              en: 'Ideas, images and hard questions draw you in. You invent easily and love figuring out new things.' }
    }
  };

  window.AGORA_IPIP = {
    version: 'ipip50-v1',
    translation: RU_TRANSLATION,
    items: ITEMS,
    perPage: 10,
    retakeMonths: 6,
    thresholds: THRESHOLDS,
    factors: FACTORS,
    texts: TEXTS,
    // Значение для полосы: сумма 10–50 (нейротизм = 60 − стабильность).
    displayScore: function (row, f) { var v = row[f.col]; return f.invert ? 60 - v : v; },
    level: function (factorId, score) {
      var t = THRESHOLDS[factorId];
      return score <= t.low_max ? 'low' : (score >= t.high_min ? 'high' : 'mid');
    }
  };

  if (window.AgoraI18n) window.AgoraI18n.extend({
    ru: {
      'ip.title': 'Тест Big Five',
      'ip.label': 'Портрет агорца · тест',
      'ip.intro': '50 коротких утверждений, около 10 минут. Отвечай, как есть сейчас, а не как хотелось бы. Здесь нет правильных и неправильных ответов.',
      'ip.start': 'Начать тест →',
      'ip.resume': 'Продолжить с места остановки →',
      'ip.page': 'Страница {n} из {total}',
      'ip.scale_hint': 'Насколько это про тебя?',
      'ip.s1': 'Совсем не про меня', 'ip.s2': 'Скорее не про меня', 'ip.s3': 'Ни то ни другое',
      'ip.s4': 'Скорее про меня', 'ip.s5': 'Точно про меня',
      'ip.unanswered': 'Ответь на все утверждения на этой странице — осталось {k}.',
      'ip.next': 'Дальше →',
      'ip.back': '← Назад',
      'ip.submit': 'Посмотреть результат →',
      'ip.saving': 'Считаю…',
      'ip.result': 'Твой результат',
      'ip.taken': 'Пройден {date}',
      'ip.retake': 'Пройти заново →',
      'ip.retake_at': 'Пройти заново можно с {date} — так будет видно, как ты меняешься.',
      'ip.history': 'История прохождений',
      'ip.disclaimer': 'Это не диагноз, а описание склонностей. Результаты видишь ты и те, кому ты открыл(а) доступ.',
      'ip.vis.label': 'Кто видит результаты теста',
      'ip.level.low': 'низкий', 'ip.level.mid': 'средний', 'ip.level.high': 'высокий',
      'ip.to_cabinet': 'В кабинет →',
      'ip.err.too_soon': 'Тест можно проходить раз в 6 месяцев.',
      'ip.cab.title': 'Тест Big Five',
      'ip.cab.none': 'Ещё не пройден · ~10 минут',
      'ip.cab.take': 'Пройти тест →',
      'ip.cab.view': 'Мои результаты →'
    },
    en: {
      'ip.title': 'Big Five test',
      'ip.label': 'Agorian Portrait · test',
      'ip.intro': '50 short statements, about 10 minutes. Answer as you are now, not as you’d like to be. There are no right or wrong answers.',
      'ip.start': 'Start the test →',
      'ip.resume': 'Continue where you left off →',
      'ip.page': 'Page {n} of {total}',
      'ip.scale_hint': 'How much is this you?',
      'ip.s1': 'Not me at all', 'ip.s2': 'Mostly not me', 'ip.s3': 'Neither',
      'ip.s4': 'Mostly me', 'ip.s5': 'Definitely me',
      'ip.unanswered': 'Answer every statement on this page — {k} left.',
      'ip.next': 'Next →',
      'ip.back': '← Back',
      'ip.submit': 'See my result →',
      'ip.saving': 'Scoring…',
      'ip.result': 'Your result',
      'ip.taken': 'Taken {date}',
      'ip.retake': 'Take it again →',
      'ip.retake_at': 'You can retake it from {date} — that’s how you’ll see yourself change.',
      'ip.history': 'History',
      'ip.disclaimer': 'This is not a diagnosis but a description of tendencies. Only you and those you give access can see the results.',
      'ip.vis.label': 'Who sees the test results',
      'ip.level.low': 'low', 'ip.level.mid': 'medium', 'ip.level.high': 'high',
      'ip.to_cabinet': 'To my profile →',
      'ip.err.too_soon': 'The test can be taken once every 6 months.',
      'ip.cab.title': 'Big Five test',
      'ip.cab.none': 'Not taken yet · ~10 minutes',
      'ip.cab.take': 'Take the test →',
      'ip.cab.view': 'My results →'
    }
  });
})();
