// Shared helpers for the account pages (ES module).
import { supabase, SUPABASE_URL, SUPABASE_KEY } from './supabaseClient.js';

export { supabase };

// Bump when the consent text changes in a meaningful way.
export const CONSENT_VERSION = '2026-11-v1';

export const t = (k) => (window.AgoraI18n ? window.AgoraI18n.t(k) : k);
export const lang = () => (window.AgoraI18n ? window.AgoraI18n.getLang() : 'ru');

export function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Set <title> from a key and keep it in sync with the language switch.
export function pageTitle(key) {
  const set = () => { document.title = t(key) + ' · AGORA'; };
  set();
  document.addEventListener('agora:lang', set);
}

// Only allow same-site relative paths in ?next= (no open redirects).
export function nextPath(fallback = '/cabinet') {
  const n = new URLSearchParams(location.search).get('next');
  return n && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') ? n : fallback;
}

export function authErrorText(err) {
  if (!err) return '';
  const m = String(err.message || err).toLowerCase();
  if (m.includes('invalid login credentials')) return t('acc.err.invalid');
  if (m.includes('email not confirmed')) return t('acc.err.not_confirmed');
  if (m.includes('signups not allowed') || m.includes('signup is disabled') || m.includes('signups are disabled')) return t('acc.err.disabled');
  if (m.includes('already registered') || m.includes('already been registered')) return t('acc.err.exists');
  if (m.includes('password should be') || m.includes('weak password')) return t('acc.err.weak');
  if (m.includes('unable to validate email') || m.includes('invalid format') || m.includes('email address') && m.includes('invalid')) return t('acc.err.email');
  if (m.includes('rate limit') || m.includes('too many') || err.status === 429) return t('acc.err.rate');
  if (m.includes('failed to fetch') || m.includes('network')) return t('acc.err.network');
  return t('acc.err.generic');
}

// Show a message box: kind = 'error' | 'ok'.
export function showMsg(el, text, kind = 'error') {
  if (!el) return;
  el.textContent = text || '';
  el.className = 'auth-msg' + (text ? ' show ' + kind : '');
}

// Is the Google provider switched on in Supabase? (Hides the button until it is.)
export async function googleEnabled() {
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/settings', { headers: { apikey: SUPABASE_KEY } });
    if (!r.ok) return false;
    const j = await r.json();
    return !!(j.external && j.external.google);
  } catch (_) {
    return false;
  }
}

export async function signInWithGoogle(next = '/cabinet') {
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: location.origin + next },
  });
}

export async function currentUser() {
  const { data } = await supabase.auth.getSession();
  return data.session ? data.session.user : null;
}

// Own profile incl. email, role and consent (server function agora_me()).
export async function loadMe() {
  const { data, error } = await supabase.rpc('agora_me');
  if (error) throw error;
  return data;
}

// Gate for member-only pages: signed in → consent given → returns profile.
export async function requireMember() {
  const user = await currentUser();
  const here = location.pathname + location.search;
  if (!user) {
    location.replace('/login?next=' + encodeURIComponent(here));
    return null;
  }
  const me = await loadMe();
  if (!me || !me.consent_at) {
    location.replace('/consent?next=' + encodeURIComponent(here));
    return null;
  }
  return me;
}

// Wire up a "Continue with Google" button + its "or" divider.
export async function setupGoogle(btn, divider, msgEl, next) {
  if (!btn) return;
  if (!(await googleEnabled())) return; // stays hidden
  btn.hidden = false;
  if (divider) divider.hidden = false;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const { error } = await signInWithGoogle(next);
    if (error) { showMsg(msgEl, authErrorText(error)); btn.disabled = false; }
  });
}
