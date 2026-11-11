-- ============================================================
-- AGORA — migration 007: Telegram notification for new applications
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run (idempotent). Requires 006_applications.sql.
--
-- How it works
--   • Every new row in public.applications sends a short message to a
--     Telegram chat (a private chat or a group with the coordinators).
--   • The bot token and chat id live in Supabase Vault (encrypted),
--     never in the repository or on the website.
--   • Sending is asynchronous (pg_net): if Telegram is slow or down, the
--     application is still saved — only the notification is skipped.
--
-- One-time setup after running this file (in the SQL editor):
--   select public.agora_tg_setup('<token from @BotFather>');
-- It checks the token, finds the chat where the bot was added, stores
-- both in Vault and sends a test message. Re-run it to change the chat.
-- ============================================================

create extension if not exists pg_net;                      -- async HTTP (trigger)
create extension if not exists http with schema extensions; -- sync HTTP (setup only)

-- ------------------------------------------------------------
-- Trigger: send the application to Telegram
-- ------------------------------------------------------------
-- Small private log so a failed notification is visible instead of silent.
create table if not exists public.agora_notify_log (
  id   bigserial primary key,
  at   timestamptz not null default now(),
  info text
);
alter table public.agora_notify_log enable row level security; -- no policies: owner only
revoke all on public.agora_notify_log from anon, authenticated;

create or replace function public.agora_notify_application()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  tok  text;
  chat text;
  fmt  text;
  msg  text;
  req  bigint;
begin
  select decrypted_secret into tok  from vault.decrypted_secrets where name = 'agora_tg_bot_token';
  select decrypted_secret into chat from vault.decrypted_secrets where name = 'agora_tg_chat_id';
  if tok is null or chat is null then
    insert into public.agora_notify_log (info) values ('skipped: bot not configured');
    return null;
  end if;

  fmt := case new.format
           when 'visit'   then 'Приехать и строить'
           when 'remote'  then 'Помогать дистанционно'
           when 'local'   then 'Собрать агору рядом с собой'
           when 'project' then 'Предложить проект или идею'
           else 'Другое'
         end;

  msg := '🆕 Новая заявка в AGORA' || E'\n\n' ||
         'Имя: ' || new.name || E'\n' ||
         'Telegram: ' || new.telegram ||
         coalesce(E'\nEmail: ' || new.email, '') || E'\n' ||
         'Как хочет участвовать: ' || fmt || E'\n\n' ||
         'О себе: ' || left(new.about, 1200) ||
         coalesce(E'\n\nЧто может привнести: ' || left(new.contribution, 800), '') || E'\n\n' ||
         'Все заявки: https://agorafundation.com/members?tab=apps';

  select net.http_post(
    url     := 'https://api.telegram.org/bot' || tok || '/sendMessage',
    body    := jsonb_build_object('chat_id', chat, 'text', msg, 'disable_web_page_preview', true),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 20000 -- the default 5 s was not always enough for Telegram
  ) into req;
  insert into public.agora_notify_log (info) values ('queued request ' || req || ' for application ' || new.id);
  return null;
exception when others then
  -- never block saving an application because of Telegram; just record why
  insert into public.agora_notify_log (info) values ('error: ' || sqlstate || ' ' || sqlerrm);
  return null;
end;
$$;
revoke all on function public.agora_notify_application() from public, anon, authenticated;

drop trigger if exists applications_notify on public.applications;
create trigger applications_notify
  after insert on public.applications
  for each row execute function public.agora_notify_application();

-- ------------------------------------------------------------
-- One-time setup (run by the owner in the SQL editor only)
-- ------------------------------------------------------------
create or replace function public.agora_tg_setup(p_token text)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare
  resp    extensions.http_response;
  chat    jsonb;
  chat_id text;
  title   text;
  sid     uuid;
begin
  if p_token is null or p_token !~ '^[0-9]+:[A-Za-z0-9_-]{20,}$' then
    return 'Это не похоже на токен бота. Его выдаёт @BotFather, он выглядит как 1234567890:AAE…';
  end if;

  resp := extensions.http_get('https://api.telegram.org/bot' || p_token || '/getUpdates');
  if resp.status <> 200 then
    return 'Telegram не принял токен (код ' || resp.status || '). Проверь токен от @BotFather.';
  end if;

  -- The most recent chat the bot has seen; groups win over private chats.
  select x.c into chat
  from (
    select coalesce(u->'message'->'chat', u->'my_chat_member'->'chat', u->'channel_post'->'chat') as c,
           (u->>'update_id')::bigint as uid
    from jsonb_array_elements(resp.content::jsonb->'result') u
  ) x
  where x.c is not null
  order by (x.c->>'type' in ('group', 'supergroup')) desc, x.uid desc
  limit 1;

  if chat is null then
    return 'Бот пока не видит ни одного чата. Добавь бота в группу (или открой с ним личный чат), напиши там /start и запусти эту строку ещё раз.';
  end if;

  chat_id := chat->>'id';
  title   := coalesce(chat->>'title', chat->>'first_name', chat_id);

  select id into sid from vault.secrets where name = 'agora_tg_bot_token';
  if sid is null then perform vault.create_secret(p_token, 'agora_tg_bot_token', 'AGORA applications bot');
  else perform vault.update_secret(sid, p_token); end if;

  sid := null;
  select id into sid from vault.secrets where name = 'agora_tg_chat_id';
  if sid is null then perform vault.create_secret(chat_id, 'agora_tg_chat_id', 'Where AGORA applications are sent');
  else perform vault.update_secret(sid, chat_id); end if;

  resp := extensions.http_post(
    'https://api.telegram.org/bot' || p_token || '/sendMessage',
    jsonb_build_object('chat_id', chat_id,
      'text', '✅ Уведомления о новых заявках AGORA подключены. Сюда будут приходить заявки с agorafundation.com/join.')::text,
    'application/json');

  if resp.status <> 200 then
    return 'Токен и чат сохранены, но тестовое сообщение не отправилось (код ' || resp.status ||
           '). Проверь, что бот не удалён из «' || title || '».';
  end if;
  return 'Готово: заявки будут приходить в «' || title || '». В Telegram уже должно быть тестовое сообщение.';
end;
$$;
revoke all on function public.agora_tg_setup(text) from public, anon, authenticated;

notify pgrst, 'reload schema';
