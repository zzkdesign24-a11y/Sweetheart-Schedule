import { addDays, toISODate } from "./date";

const SETTINGS_KEY = "vibe-richeng-reminder-settings-v1";
const LAST_SENT_KEY = "vibe-richeng-reminder-last-sent-v1";

export function loadReminderSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { enabled: false, time: "20:00" };
    const parsed = JSON.parse(raw);
    const enabled = Boolean(parsed.enabled);
    const time = typeof parsed.time === "string" ? parsed.time : "20:00";
    return { enabled, time: normalizeHHMM(time) };
  } catch {
    return { enabled: false, time: "20:00" };
  }
}

export function saveReminderSettings(settings) {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({ enabled: Boolean(settings.enabled), time: normalizeHHMM(settings.time || "20:00") })
  );
}

export async function ensureNotificationPermission() {
  if (!("Notification" in window)) return { ok: false, reason: "unsupported" };
  if (Notification.permission === "granted") return { ok: true };
  if (Notification.permission === "denied") return { ok: false, reason: "denied" };
  const res = await Notification.requestPermission();
  if (res === "granted") return { ok: true };
  return { ok: false, reason: res };
}

export function scheduleTomorrowReminder({ events, timeHHMM, title }) {
  const time = normalizeHHMM(timeHHMM);
  const timeoutMs = msUntilNextLocalTime(time);
  if (timeoutMs == null) return () => {};

  const timer = setTimeout(async () => {
    try {
      const now = new Date();
      const todayIso = toISODate(now);
      const lastSent = localStorage.getItem(LAST_SENT_KEY);
      if (lastSent === todayIso) return;

      const tomorrowIso = toISODate(addDays(now, 1));
      const hasTomorrow = events.some((e) => e.date === tomorrowIso);
      if (!hasTomorrow) return;

      const permissionOk = await ensureNotificationPermission();
      if (!permissionOk.ok) return;

      await showNotificationViaSWOrPage({
        title: title || "明日档期提醒",
        options: {
          body: `你明天（${tomorrowIso}）有安排，点击查看。`,
          tag: "vibe-richeng-reminder",
          renotify: false
        }
      });

      localStorage.setItem(LAST_SENT_KEY, todayIso);
    } catch {
      // ignore
    }
  }, timeoutMs);

  return () => clearTimeout(timer);
}

export async function maybeSendTodayIfMissed({ events, timeHHMM, title }) {
  const time = normalizeHHMM(timeHHMM);
  const now = new Date();
  const todayIso = toISODate(now);
  const lastSent = localStorage.getItem(LAST_SENT_KEY);
  if (lastSent === todayIso) return;

  const due = msUntilTodayLocalTime(time);
  if (due == null) return;
  if (due > 0) return; // not time yet

  const tomorrowIso = toISODate(addDays(now, 1));
  const hasTomorrow = events.some((e) => e.date === tomorrowIso);
  if (!hasTomorrow) return;

  const permissionOk = await ensureNotificationPermission();
  if (!permissionOk.ok) return;

  await showNotificationViaSWOrPage({
    title: title || "明日档期提醒",
    options: {
      body: `你明天（${tomorrowIso}）有安排，点击查看。`,
      tag: "vibe-richeng-reminder",
      renotify: false
    }
  });

  localStorage.setItem(LAST_SENT_KEY, todayIso);
}

function normalizeHHMM(v) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v || "");
  return m ? `${m[1]}:${m[2]}` : "20:00";
}

function msUntilTodayLocalTime(hhmm) {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);

  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, 0, 0);
  return target.getTime() - now.getTime();
}

function msUntilNextLocalTime(hhmm) {
  const diff = msUntilTodayLocalTime(hhmm);
  if (diff == null) return null;
  if (diff > 0) return diff;
  return diff + 24 * 60 * 60 * 1000;
}

async function showNotificationViaSWOrPage(payload) {
  if ("serviceWorker" in navigator) {
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    if (reg && reg.active) {
      reg.active.postMessage({ type: "SHOW_NOTIFICATION", ...payload });
      return;
    }
  }

  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(payload.title, payload.options);
  }
}
