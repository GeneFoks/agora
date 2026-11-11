// Texts for the account pages (register / login / reset / consent / cabinet).
// Same mechanism as i18n.js: keys are merged into window.AgoraI18n.
(function () {
  if (!window.AgoraI18n) return;

  var CONSENT_RU =
    '<h3>Что мы собираем</h3>' +
    '<p>Имя, email, город, языки и ссылки на твои соцсети. Ответы анкеты агорца: роль в проекте, энергия, ценности, решения и конфликты, общение, навыки, вовлечённость и, если захочешь, культурный слой (соционика, MBTI и т.п.). Результаты теста Big Five и их историю. Если входишь через Google — от Google мы получаем только имя и email.</p>' +
    '<h3>Зачем</h3>' +
    '<p>Чтобы подбирать людей в команды под задачи и видеть, как участники растут внутри сообщества. Больше ни для чего.</p>' +
    '<h3>Кто это видит</h3>' +
    '<p>Ты сам решаешь для каждого блока: <b>всем агорцам</b>, <b>только координаторам</b> или <b>только мне</b>. По умолчанию — только координаторам. Это правило проверяет сама база данных, а не только страница сайта.</p>' +
    '<h3>Чего мы не собираем</h3>' +
    '<p>Здоровье и диагнозы, документы, финансовые данные, точный адрес.</p>' +
    '<h3>Где хранится</h3>' +
    '<p>В базе данных AGORA (Supabase). Мы не продаём и не передаём твои данные третьим лицам и не используем сторонние сайты с тестами.</p>' +
    '<h3>Как удалить</h3>' +
    '<p>В личном кабинете можно в любой момент скачать всё, что о тебе хранится, или удалить аккаунт — вместе с ним удаляются все твои данные. Вопросы — <a href="https://t.me/agorausa" target="_blank">t.me/agorausa</a>.</p>';

  var CONSENT_EN =
    '<h3>What we collect</h3>' +
    '<p>Your name, email, city, languages and links to your social profiles. Your Agorian questionnaire answers: role in a project, energy, values, decisions and conflict, communication, skills, involvement and, if you choose, the cultural layer (socionics, MBTI, etc.). Your Big Five test results and their history. If you sign in with Google, we receive only your name and email from Google.</p>' +
    '<h3>Why</h3>' +
    '<p>To match people into teams for real tasks and to see how members grow inside the community. Nothing else.</p>' +
    '<h3>Who sees it</h3>' +
    '<p>You choose for each block: <b>all Agorians</b>, <b>coordinators only</b> or <b>only me</b>. The default is coordinators only. The database itself enforces this rule, not just the web page.</p>' +
    '<h3>What we never collect</h3>' +
    '<p>Health or diagnoses, ID documents, financial data, your exact address.</p>' +
    '<h3>Where it is stored</h3>' +
    '<p>In the AGORA database (Supabase). We do not sell or share your data with third parties and do not use outside testing websites.</p>' +
    '<h3>How to delete it</h3>' +
    '<p>In your profile you can download everything we store about you, or delete your account at any time — all your data is deleted with it. Questions: <a href="https://t.me/agorausa" target="_blank">t.me/agorausa</a>.</p>';

  window.AgoraI18n.extend({
    ru: {
      'acc.or': 'или',
      'acc.google': 'Продолжить с Google',
      'acc.email': 'Email',
      'acc.password': 'Пароль',
      'acc.name': 'Как тебя зовут',
      'acc.name.ph': 'Александр',
      'acc.loading': 'Загрузка…',
      'acc.back_home': '← На главную',

      'acc.register.title': 'Регистрация',
      'acc.register.label': 'Стать агорцем',
      'acc.register.lead': 'Аккаунт → анкета агорца (~15 минут) → тест Big Five (~10 минут) → твой «Портрет агорца». Прогресс сохраняется, можно вернуться позже.',
      'acc.register.pw_hint': 'Минимум 8 символов',
      'acc.register.consent': 'Я прочитал(а) и согласен(на) с тем, как AGORA хранит и использует мои данные.',
      'acc.register.consent_more': 'Что мы собираем и зачем',
      'acc.register.submit': 'Создать аккаунт →',
      'acc.register.have': 'Уже есть аккаунт?',
      'acc.register.login': 'Войти',
      'acc.register.check_email': 'Почти готово. Мы отправили письмо на твой email — открой ссылку в нём, чтобы подтвердить адрес.',
      'acc.register.need_consent': 'Отметь согласие на обработку данных — без него мы не можем создать аккаунт.',

      'acc.login.title': 'Вход',
      'acc.login.label': 'С возвращением',
      'acc.login.submit': 'Войти →',
      'acc.login.forgot': 'Забыл пароль?',
      'acc.login.no_account': 'Ещё нет аккаунта?',
      'acc.login.register': 'Зарегистрироваться',
      'acc.login.reset_sent': 'Если такой email есть, мы отправили на него ссылку для нового пароля.',
      'acc.login.need_email': 'Впиши email — пришлём ссылку для нового пароля.',

      'acc.reset.title': 'Новый пароль',
      'acc.reset.label': 'Восстановление',
      'acc.reset.new': 'Новый пароль',
      'acc.reset.submit': 'Сохранить пароль →',
      'acc.reset.bad_link': 'Ссылка устарела или уже использована. Запроси новую на странице входа.',

      'acc.consent.title': 'Согласие',
      'acc.consent.label': 'Твои данные',
      'acc.consent.lead': 'Перед тем как продолжить, прочитай, что мы храним и кто это видит.',
      'acc.consent.accept': 'Согласен(на), продолжить →',
      'acc.consent.decline': 'Не согласен(на) — выйти',
      'acc.consent.text': CONSENT_RU,

      'acc.cab.title': 'Кабинет',
      'acc.cab.label': 'Портрет агорца',
      'acc.cab.hello': 'Привет',
      'acc.cab.role': 'Роль',
      'acc.cab.since': 'С нами с',
      'acc.cab.next_title': 'Что дальше',
      'acc.cab.next_text': 'Скоро здесь появятся анкета агорца, тест Big Five и твой «Портрет агорца». Аккаунт уже создан — мы сохраним всё, что ты заполнишь.',
      'acc.cab.logout': 'Выйти',
      'role.member': 'Участник',
      'role.coordinator': 'Координатор',
      'role.admin': 'Админ',

      'acc.err.generic': 'Что-то пошло не так. Попробуй ещё раз.',
      'acc.err.invalid': 'Неверный email или пароль',
      'acc.err.not_confirmed': 'Email не подтверждён — открой ссылку из письма',
      'acc.err.disabled': 'Регистрация временно закрыта',
      'acc.err.exists': 'Этот email уже зарегистрирован — попробуй войти',
      'acc.err.weak': 'Пароль слишком короткий — минимум 8 символов',
      'acc.err.email': 'Проверь формат email',
      'acc.err.rate': 'Слишком много попыток. Подожди немного и попробуй снова.',
      'acc.err.network': 'Нет связи с сервером. Проверь интернет.',

      'an.title': 'Анкета агорца',
      'an.step': 'Шаг {n} из {total}',
      'an.block': 'Блок {n}',
      'an.back': '← Назад',
      'an.next': 'Дальше →',
      'an.skip': 'Пропустить',
      'an.finish': 'Готово →',
      'an.saving': 'Сохраняю…',
      'an.saved': 'Сохранено',
      'an.required': 'Обязательный блок',
      'an.req_field': 'Заполни это поле',
      'an.req_role': 'Выбери основную роль',
      'an.pick_exact': 'Выбери ровно {n} — сейчас {k}',
      'an.max': 'не больше {n}',
      'an.other': 'Другое',
      'an.other_ph': 'Впиши своё',
      'an.add_link': '+ Добавить ссылку',
      'an.link_ph': 'https://…',
      'an.bad_url': 'Проверь ссылку — она должна начинаться с https://',
      'an.none': '— не выбрано —',
      'an.clear': 'Сбросить',
      'an.vis.label': 'Кто видит этот блок',
      'an.vis.all': 'Всем агорцам',
      'an.vis.coordinators': 'Координаторам',
      'an.vis.self': 'Только мне',
      'an.done.title': 'Анкета заполнена',
      'an.done.text': 'Спасибо! Всё сохранено. Любой блок можно поправить позже из кабинета. Следующий шаг — тест Big Five, около 10 минут.',
      'an.done.test': 'Пройти тест Big Five →',
      'an.done.cabinet': 'В кабинет →',
      'an.save_err': 'Не удалось сохранить. Проверь интернет и нажми ещё раз.',
      'an.matrix_hint': 'Нажми ещё раз, чтобы снять отметку.',
      'acc.cab.anketa_start': 'Заполнить анкету →',
      'acc.cab.anketa_continue': 'Продолжить анкету →',
      'acc.cab.anketa_edit': 'Посмотреть и поправить анкету →',
      'acc.cab.anketa_progress': 'Заполнено блоков: {k} из {total}'
    },
    en: {
      'acc.or': 'or',
      'acc.google': 'Continue with Google',
      'acc.email': 'Email',
      'acc.password': 'Password',
      'acc.name': 'Your name',
      'acc.name.ph': 'Alex',
      'acc.loading': 'Loading…',
      'acc.back_home': '← Home',

      'acc.register.title': 'Sign up',
      'acc.register.label': 'Become an Agorian',
      'acc.register.lead': 'Account → Agorian questionnaire (~15 min) → Big Five test (~10 min) → your “Agorian Portrait”. Progress is saved, you can come back later.',
      'acc.register.pw_hint': 'At least 8 characters',
      'acc.register.consent': 'I have read and agree to how AGORA stores and uses my data.',
      'acc.register.consent_more': 'What we collect and why',
      'acc.register.submit': 'Create account →',
      'acc.register.have': 'Already have an account?',
      'acc.register.login': 'Sign in',
      'acc.register.check_email': 'Almost done. We sent you an email — open the link in it to confirm your address.',
      'acc.register.need_consent': 'Please tick the data consent box — we can’t create an account without it.',

      'acc.login.title': 'Sign in',
      'acc.login.label': 'Welcome back',
      'acc.login.submit': 'Sign in →',
      'acc.login.forgot': 'Forgot password?',
      'acc.login.no_account': 'No account yet?',
      'acc.login.register': 'Sign up',
      'acc.login.reset_sent': 'If that email exists, we sent it a link to set a new password.',
      'acc.login.need_email': 'Enter your email and we’ll send a link to set a new password.',

      'acc.reset.title': 'New password',
      'acc.reset.label': 'Recovery',
      'acc.reset.new': 'New password',
      'acc.reset.submit': 'Save password →',
      'acc.reset.bad_link': 'This link has expired or was already used. Request a new one on the sign-in page.',

      'acc.consent.title': 'Consent',
      'acc.consent.label': 'Your data',
      'acc.consent.lead': 'Before you continue, please read what we store and who sees it.',
      'acc.consent.accept': 'I agree, continue →',
      'acc.consent.decline': 'I don’t agree — sign out',
      'acc.consent.text': CONSENT_EN,

      'acc.cab.title': 'My profile',
      'acc.cab.label': 'Agorian Portrait',
      'acc.cab.hello': 'Hi',
      'acc.cab.role': 'Role',
      'acc.cab.since': 'Member since',
      'acc.cab.next_title': 'What’s next',
      'acc.cab.next_text': 'Soon you’ll find the Agorian questionnaire, the Big Five test and your “Agorian Portrait” here. Your account is ready — everything you fill in will be saved.',
      'acc.cab.logout': 'Sign out',
      'role.member': 'Member',
      'role.coordinator': 'Coordinator',
      'role.admin': 'Admin',

      'acc.err.generic': 'Something went wrong. Please try again.',
      'acc.err.invalid': 'Wrong email or password',
      'acc.err.not_confirmed': 'Email not confirmed — open the link from the email',
      'acc.err.disabled': 'Sign-ups are temporarily closed',
      'acc.err.exists': 'This email is already registered — try signing in',
      'acc.err.weak': 'Password is too short — at least 8 characters',
      'acc.err.email': 'Check the email format',
      'acc.err.rate': 'Too many attempts. Wait a little and try again.',
      'acc.err.network': 'Can’t reach the server. Check your connection.',

      'an.title': 'Agorian questionnaire',
      'an.step': 'Step {n} of {total}',
      'an.block': 'Block {n}',
      'an.back': '← Back',
      'an.next': 'Next →',
      'an.skip': 'Skip',
      'an.finish': 'Done →',
      'an.saving': 'Saving…',
      'an.saved': 'Saved',
      'an.required': 'Required block',
      'an.req_field': 'Please fill this in',
      'an.req_role': 'Choose your main role',
      'an.pick_exact': 'Pick exactly {n} — now {k}',
      'an.max': 'up to {n}',
      'an.other': 'Other',
      'an.other_ph': 'Type your own',
      'an.add_link': '+ Add link',
      'an.link_ph': 'https://…',
      'an.bad_url': 'Check the link — it should start with https://',
      'an.none': '— not selected —',
      'an.clear': 'Clear',
      'an.vis.label': 'Who sees this block',
      'an.vis.all': 'All Agorians',
      'an.vis.coordinators': 'Coordinators',
      'an.vis.self': 'Only me',
      'an.done.title': 'Questionnaire complete',
      'an.done.text': 'Thank you! Everything is saved. You can edit any block later from your profile. Next step is the Big Five test, about 10 minutes.',
      'an.done.test': 'Take the Big Five test →',
      'an.done.cabinet': 'To my profile →',
      'an.save_err': 'Couldn’t save. Check your connection and try again.',
      'an.matrix_hint': 'Tap again to clear.',
      'acc.cab.anketa_start': 'Fill in the questionnaire →',
      'acc.cab.anketa_continue': 'Continue the questionnaire →',
      'acc.cab.anketa_edit': 'View and edit the questionnaire →',
      'acc.cab.anketa_progress': 'Blocks filled: {k} of {total}'
    }
  });
})();
