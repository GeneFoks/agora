// ─── AGORA · Анкета агорца ──────────────────────────────────────────────────
// Вопросы живут здесь, а не в вёрстке. Каждый ответ в базе помечен version.
// Меняешь вопросы → подними version (v0.2, v0.3…). Коды (v / id) — это то,
// что хранится в базе: их не переименовывать, только добавлять новые.
//
// Типы полей: text, textarea, number, single, multi, select, role, roles,
//             list, links, pick, slider, matrix.
// Блок 4 (Big Five) — отдельный тест, в анкете его нет.
(function () {
  function o(v, ru, en) { return { v: v, ru: ru, en: en }; }

  var ROLES = [
    { v: 'generator', ru: 'Генератор', en: 'Generator', hint_ru: 'рождает идеи, видит возможности', hint_en: 'sparks ideas, sees possibilities' },
    { v: 'architect', ru: 'Архитектор', en: 'Architect', hint_ru: 'превращает идею в систему, правила, план', hint_en: 'turns an idea into a system, rules, a plan' },
    { v: 'connector', ru: 'Связной', en: 'Connector', hint_ru: 'находит людей и ресурсы, продаёт, вдохновляет', hint_en: 'finds people and resources, sells, inspires' },
    { v: 'finisher', ru: 'Доводчик', en: 'Finisher', hint_ru: 'доводит до конца, держит сроки и качество', hint_en: 'gets it done, holds deadlines and quality' },
    { v: 'master', ru: 'Мастер', en: 'Maker', hint_ru: 'делает руками или профессиональным навыком', hint_en: 'builds with hands or professional craft' },
    { v: 'keeper', ru: 'Хранитель', en: 'Keeper', hint_ru: 'создаёт быт, уют и заботу, удерживает людей', hint_en: 'creates home, comfort and care, keeps people together' },
    { v: 'mentor', ru: 'Наставник', en: 'Mentor', hint_ru: 'развивает людей, разбирает конфликты, учит', hint_en: 'grows people, resolves conflicts, teaches' }
  ];

  // Ценности по модели Шварца.
  var VALUES = [
    o('self_direction', 'Свобода и своя голова', 'Freedom and thinking for myself'),
    o('stimulation', 'Новизна и риск', 'Novelty and risk'),
    o('hedonism', 'Удовольствие', 'Enjoyment'),
    o('achievement', 'Достижения и успех', 'Achievement and success'),
    o('power', 'Влияние и ресурсы', 'Influence and resources'),
    o('security', 'Безопасность и стабильность', 'Safety and stability'),
    o('conformity', 'Правила и порядок', 'Rules and order'),
    o('tradition', 'Традиции', 'Tradition'),
    o('benevolence', 'Забота о своих', 'Caring for my people'),
    o('universalism', 'Благо для всех', 'Good for everyone')
  ];

  var SOCIONICS = [
    o('ILE', 'ИЛЭ — Дон Кихот', 'ILE — Don Quixote'), o('SEI', 'СЭИ — Дюма', 'SEI — Dumas'),
    o('ESE', 'ЭСЭ — Гюго', 'ESE — Hugo'), o('LII', 'ЛИИ — Робеспьер', 'LII — Robespierre'),
    o('EIE', 'ЭИЭ — Гамлет', 'EIE — Hamlet'), o('LSI', 'ЛСИ — Максим', 'LSI — Maxim'),
    o('SLE', 'СЛЭ — Жуков', 'SLE — Zhukov'), o('IEI', 'ИЭИ — Есенин', 'IEI — Yesenin'),
    o('SEE', 'СЭЭ — Наполеон', 'SEE — Napoleon'), o('ILI', 'ИЛИ — Бальзак', 'ILI — Balzac'),
    o('LIE', 'ЛИЭ — Джек Лондон', 'LIE — Jack London'), o('ESI', 'ЭСИ — Драйзер', 'ESI — Dreiser'),
    o('LSE', 'ЛСЭ — Штирлиц', 'LSE — Stierlitz'), o('EII', 'ЭИИ — Достоевский', 'EII — Dostoevsky'),
    o('IEE', 'ИЭЭ — Гексли', 'IEE — Huxley'), o('SLI', 'СЛИ — Габен', 'SLI — Gabin'),
    o('unknown', 'Не знаю', 'Don’t know')
  ];

  var MBTI = ['INTJ', 'INTP', 'ENTJ', 'ENTP', 'INFJ', 'INFP', 'ENFJ', 'ENFP',
              'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', 'ISTP', 'ISFP', 'ESTP', 'ESFP']
    .map(function (x) { return o(x, x, x); })
    .concat([o('unknown', 'Не знаю', 'Don’t know')]);

  var ENNEA = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(function (x) { return o(x, x, x); });

  var SKILLS = [
    o('construction', 'Стройка', 'Construction'), o('wood', 'Дерево', 'Woodwork'),
    o('electrical', 'Электрика', 'Electrical'), o('plumbing', 'Сантехника', 'Plumbing'),
    o('land_garden', 'Земля и сад', 'Land and garden'), o('food', 'Еда', 'Food and cooking'),
    o('facilitation', 'Фасилитация', 'Facilitation'), o('teaching', 'Обучение', 'Teaching'),
    o('psychology', 'Психология', 'Psychology'), o('finance', 'Финансы', 'Finance'),
    o('fundraising', 'Фандрайзинг', 'Fundraising'), o('sales', 'Продажи', 'Sales'),
    o('web_code', 'Сайт и код', 'Web and code'), o('social_video', 'Соцсети и видео', 'Social media and video'),
    o('design', 'Дизайн', 'Design'), o('law_docs', 'Право и документы', 'Law and paperwork'),
    o('body_health', 'Здоровье и тело', 'Health and body'), o('kids', 'Дети', 'Kids'),
    o('stage_art', 'Сцена и искусство', 'Stage and art')
  ];

  window.AGORA_ANKETA = {
    version: 'v0.1',
    roles: ROLES,
    values: VALUES,
    blocks: [
      {
        id: 'b0', num: 0, required: true,
        title: { ru: 'О себе', en: 'About you' },
        intro: { ru: 'Пара слов о тебе — с этого начинается твой портрет.', en: 'A few words about you — this is where your portrait starts.' },
        fields: [
          { id: 'name', type: 'text', required: true, max: 120, profile: 'name',
            label: { ru: 'Имя', en: 'Name' } },
          { id: 'city', type: 'text', max: 120, profile: 'city',
            label: { ru: 'Город', en: 'City' } },
          { id: 'languages', type: 'multi', other: true, profile: 'languages',
            label: { ru: 'Языки', en: 'Languages' },
            options: [o('ru', 'Русский', 'Russian'), o('en', 'Английский', 'English'), o('uk', 'Украинский', 'Ukrainian'),
                      o('es', 'Испанский', 'Spanish'), o('de', 'Немецкий', 'German'), o('fr', 'Французский', 'French'),
                      o('he', 'Иврит', 'Hebrew')] },
          { id: 'occupation', type: 'textarea', max: 1000,
            label: { ru: 'Чем занимаешься', en: 'What you do' } },
          { id: 'how_came', type: 'textarea', max: 1000,
            label: { ru: 'Как пришёл(ла) в Агору', en: 'How you came to AGORA' } },
          { id: 'links', type: 'links', max: 8, profile: 'links',
            label: { ru: 'Ссылки', en: 'Links' },
            options: [o('instagram', 'Instagram', 'Instagram'), o('telegram', 'Telegram', 'Telegram'),
                      o('youtube', 'YouTube', 'YouTube'), o('linkedin', 'LinkedIn', 'LinkedIn'),
                      o('website', 'Сайт', 'Website'), o('other', 'Другое', 'Other')] }
        ]
      },
      {
        id: 'b1', num: 1, required: true,
        title: { ru: 'Роль в проекте', en: 'Your role in a project' },
        intro: { ru: 'Вспомни последний общий проект — где от тебя было больше всего пользы?', en: 'Think of your last shared project — where were you most useful?' },
        fields: [
          { id: 'most_useful', type: 'single',
            label: { ru: 'Где был(а) самым полезным в последнем проекте', en: 'Where you were most useful in your last project' },
            options: [o('idea', 'Придумать идею', 'Coming up with the idea'), o('plan', 'Разложить в план', 'Turning it into a plan'),
                      o('people', 'Найти людей и ресурсы', 'Finding people and resources'), o('finish', 'Довести до конца', 'Getting it finished'),
                      o('hands', 'Сделать руками', 'Building it with my hands'), o('care', 'Создать атмосферу и заботу', 'Creating atmosphere and care'),
                      o('growth', 'Помочь людям расти', 'Helping people grow')] },
          { id: 'role_primary', type: 'role', required: true,
            label: { ru: 'Основная роль', en: 'Main role' } },
          { id: 'role_secondary', type: 'role', exclude: 'role_primary',
            label: { ru: 'Вспомогательная роль', en: 'Supporting role' } },
          { id: 'role_avoid', type: 'roles',
            label: { ru: 'Роль, которую точно не хочешь (можно несколько)', en: 'Roles you definitely don’t want (any number)' } }
        ]
      },
      {
        id: 'b2', num: 2,
        title: { ru: 'Энергия', en: 'Energy' },
        intro: { ru: 'Что тебя наполняет и что выжигает.', en: 'What fills you up and what burns you out.' },
        fields: [
          { id: 'after_people', type: 'single',
            label: { ru: 'После дня с людьми ты обычно', en: 'After a day with people you usually feel' },
            options: [o('charged', 'Заряжен(а)', 'Charged'), o('neutral', 'Нейтрально', 'Neutral'), o('drained', 'Выжат(а)', 'Drained')] },
          { id: 'charges', type: 'list', max: 3, maxlen: 120,
            label: { ru: 'Что заряжает (до 3 коротких ответов)', en: 'What charges you (up to 3 short answers)' } },
          { id: 'drains', type: 'list', max: 3, maxlen: 120,
            label: { ru: 'Что выжигает (до 3)', en: 'What drains you (up to 3)' } },
          { id: 'overheat', type: 'textarea', max: 1000,
            label: { ru: 'Твой сигнал перегрева и что тебе тогда нужно', en: 'Your overheating signal and what you need then' } }
        ]
      },
      {
        id: 'b3', num: 3,
        title: { ru: 'Ценности', en: 'Values' },
        intro: { ru: 'Здесь нет правильных ответов. Выбирай то, что правда про тебя.', en: 'There are no right answers. Pick what is really true for you.' },
        fields: [
          { id: 'top3', type: 'pick', exact: 3, source: 'values', exclude: 'bottom3',
            label: { ru: 'Ровно 3 самые важные', en: 'Exactly 3 most important' } },
          { id: 'bottom3', type: 'pick', exact: 3, source: 'values', exclude: 'top3',
            label: { ru: 'Ровно 3 наименее важные', en: 'Exactly 3 least important' } },
          { id: 'fork_honesty_kindness', type: 'slider',
            label: { ru: 'Что тебе ближе', en: 'What is closer to you' },
            left: { ru: 'Уважение за честность', en: 'Respect for honesty' },
            right: { ru: 'Любовь за доброту', en: 'Love for kindness' } },
          { id: 'fork_risk_stability', type: 'slider',
            label: { ru: 'Что тебе ближе', en: 'What is closer to you' },
            left: { ru: 'Насыщенная жизнь с риском', en: 'A rich life with risk' },
            right: { ru: 'Стабильность', en: 'Stability' } },
          { id: 'fork_many_one', type: 'slider',
            label: { ru: 'Что тебе ближе', en: 'What is closer to you' },
            left: { ru: 'Большое для многих', en: 'Something big for many' },
            right: { ru: 'Глубокое для одного', en: 'Something deep for one' } }
        ]
      },
      {
        id: 'b5', num: 5,
        title: { ru: 'Решения и конфликты', en: 'Decisions and conflict' },
        intro: { ru: 'Как ты решаешь и как ведёшь себя в споре.', en: 'How you decide and how you act in a disagreement.' },
        fields: [
          { id: 'decision_style', type: 'single',
            label: { ru: 'Как принимаешь важное решение', en: 'How you make an important decision' },
            options: [o('fast_feeling', 'Быстро, по ощущению', 'Fast, by feel'),
                      o('slow_data', 'Медленно, собирая данные', 'Slowly, gathering data'),
                      o('discuss', 'После обсуждения с людьми', 'After talking it through with people')] },
          { id: 'conflict_mode', type: 'single',
            label: { ru: 'В споре ты обычно', en: 'In a disagreement you usually' },
            options: [o('competing', 'Настаиваю на своём', 'Stand my ground'),
                      o('collaborating', 'Ищу решение для всех', 'Look for a solution that works for everyone'),
                      o('compromising', 'Делю пополам', 'Meet halfway'),
                      o('avoiding', 'Ухожу от спора', 'Step away from the argument'),
                      o('accommodating', 'Уступаю', 'Give in')] },
          { id: 'persuaded_by', type: 'multi',
            label: { ru: 'Что тебя переубеждает', en: 'What changes your mind' },
            options: [o('logic', 'Логика', 'Logic'), o('facts', 'Факты', 'Facts'),
                      o('feelings', 'Чувства собеседника', 'The other person’s feelings'),
                      o('experience', 'Личный опыт', 'Personal experience'),
                      o('respected_person', 'Мнение уважаемого человека', 'The view of someone I respect')] },
          { id: 'after_vote', type: 'textarea', max: 1000,
            label: { ru: 'Что делаешь, когда на голосовании решили не так, как ты хотел(а)', en: 'What you do when a vote goes against what you wanted' } }
        ]
      },
      {
        id: 'b6', num: 6,
        title: { ru: 'Общение и мотивация', en: 'Communication and motivation' },
        intro: { ru: 'Как с тобой лучше говорить и что тебя двигает.', en: 'How best to talk with you and what moves you.' },
        fields: [
          { id: 'feedback_tone', type: 'slider',
            label: { ru: 'Обратную связь мне лучше давать', en: 'Give me feedback' },
            left: { ru: 'Прямо и жёстко', en: 'Direct and blunt' }, right: { ru: 'Мягко', en: 'Gently' } },
          { id: 'feedback_place', type: 'slider',
            label: { ru: 'И лучше', en: 'And preferably' },
            left: { ru: 'При всех', en: 'In front of everyone' }, right: { ru: 'Один на один', en: 'One to one' } },
          { id: 'motivators', type: 'multi', max: 2,
            label: { ru: 'Что тебя двигает (до 2)', en: 'What moves you (up to 2)' },
            options: [o('support', 'Поддержка', 'Support'), o('challenge', 'Вызов', 'Challenge'),
                      o('recognition', 'Признание', 'Recognition'), o('freedom', 'Свобода', 'Freedom'),
                      o('money', 'Деньги', 'Money'), o('meaning', 'Смысл', 'Meaning')] },
          { id: 'task_setting', type: 'textarea', max: 1000,
            label: { ru: 'Как тебе лучше ставить задачи', en: 'How tasks are best given to you' } },
          { id: 'personal_space', type: 'slider',
            label: { ru: 'В общем быту мне нужно', en: 'In shared living I need' },
            left: { ru: 'Много пространства', en: 'Lots of space' }, right: { ru: 'Много близости', en: 'Lots of closeness' } }
        ]
      },
      {
        id: 'b7', num: 7,
        title: { ru: 'Навыки и ресурсы', en: 'Skills and resources' },
        intro: { ru: 'Отметь, что умеешь, чему учишься и чему хочешь научиться. Остальное можно не трогать.', en: 'Mark what you can do, what you’re learning and what you want to learn. Leave the rest.' },
        fields: [
          { id: 'skills', type: 'matrix', rows: SKILLS,
            cols: [o('can', 'Умею', 'Can'), o('learning', 'Учусь', 'Learning'), o('want', 'Хочу', 'Want to')],
            label: { ru: 'Навыки', en: 'Skills' } },
          { id: 'skills_other', type: 'text', max: 300,
            label: { ru: 'Другие навыки', en: 'Other skills' } },
          { id: 'resources', type: 'multi',
            label: { ru: 'Ресурсы, которыми можешь поделиться', en: 'Resources you can share' },
            options: [o('transport', 'Транспорт', 'Transport'), o('tools', 'Инструменты', 'Tools'),
                      o('connections', 'Связи', 'Connections'), o('space', 'Помещение', 'Space')] },
          { id: 'resources_note', type: 'text', max: 300,
            label: { ru: 'Подробнее о ресурсах', en: 'More about resources' } }
        ]
      },
      {
        id: 'b8', num: 8,
        title: { ru: 'Вовлечённость', en: 'Involvement' },
        intro: { ru: 'Сколько ты готов(а) вкладывать и чего ждёшь.', en: 'How much you’re ready to put in and what you expect.' },
        fields: [
          { id: 'hours_week', type: 'number', min: 0, max: 80,
            label: { ru: 'Часов в неделю', en: 'Hours per week' } },
          { id: 'days', type: 'multi',
            label: { ru: 'В какие дни', en: 'Which days' },
            options: [o('mon', 'Пн', 'Mon'), o('tue', 'Вт', 'Tue'), o('wed', 'Ср', 'Wed'), o('thu', 'Чт', 'Thu'),
                      o('fri', 'Пт', 'Fri'), o('sat', 'Сб', 'Sat'), o('sun', 'Вс', 'Sun')] },
          { id: 'can_visit_land', type: 'single',
            label: { ru: 'Можешь приезжать на землю', en: 'Can you come to the land' },
            options: [o('yes', 'Да', 'Yes'), o('sometimes', 'Иногда', 'Sometimes'), o('no', 'Нет', 'No')] },
          { id: 'horizon', type: 'single',
            label: { ru: 'Твой горизонт', en: 'Your horizon' },
            options: [o('trying', 'Пробую', 'Trying it out'), o('year', 'На год', 'For a year'), o('home', 'Это мой дом', 'This is my home')] },
          { id: 'want_get', type: 'textarea', max: 1000,
            label: { ru: 'Что хочешь получить', en: 'What you want to get' } },
          { id: 'ready_give', type: 'textarea', max: 1000,
            label: { ru: 'Что готов(а) дать', en: 'What you’re ready to give' } }
        ]
      },
      {
        id: 'b9', num: 9,
        title: { ru: 'Культурный слой', en: 'Cultural layer' },
        intro: { ru: 'Необязательно. Если знаешь свои типы — отметь, если нет — просто пропусти.', en: 'Optional. If you know your types, mark them; if not, just skip.' },
        fields: [
          { id: 'socionics', type: 'select', options: SOCIONICS,
            label: { ru: 'Соционика', en: 'Socionics' } },
          { id: 'mbti', type: 'select', options: MBTI,
            label: { ru: 'MBTI', en: 'MBTI' } },
          { id: 'hd_type', type: 'select',
            label: { ru: 'Human Design — тип', en: 'Human Design — type' },
            options: [o('manifestor', 'Манифестор', 'Manifestor'), o('generator', 'Генератор', 'Generator'),
                      o('manifesting_generator', 'Манифестирующий генератор', 'Manifesting Generator'),
                      o('projector', 'Проектор', 'Projector'), o('reflector', 'Рефлектор', 'Reflector'),
                      o('unknown', 'Не знаю', 'Don’t know')] },
          { id: 'hd_profile', type: 'text', max: 20,
            label: { ru: 'Human Design — профиль (например, 4/6)', en: 'Human Design — profile (e.g. 4/6)' } },
          { id: 'enneagram', type: 'select', options: ENNEA.concat([o('unknown', 'Не знаю', 'Don’t know')]),
            label: { ru: 'Эннеаграмма — тип', en: 'Enneagram — type' } },
          { id: 'enneagram_wing', type: 'select', options: ENNEA,
            label: { ru: 'Эннеаграмма — крыло', en: 'Enneagram — wing' } },
          { id: 'other', type: 'textarea', max: 1000,
            label: { ru: 'Другое', en: 'Other' } },
          { id: 'true_about_me', type: 'textarea', max: 1000,
            label: { ru: 'Что из этого про тебя точно', en: 'Which of these is definitely you' } }
        ]
      }
    ]
  };
})();
