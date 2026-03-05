export function pad2(n) {
  return String(n).padStart(2, "0");
}

export function toISODate(date) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso) {
  if (!iso || typeof iso !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

export function addDays(date, days) {
  const dt = new Date(date);
  dt.setDate(dt.getDate() + days);
  return dt;
}

export function formatCN(isoDate) {
  const dt = parseISODate(isoDate);
  if (!dt) return isoDate;
  const y = dt.getFullYear();
  const m = dt.getMonth() + 1;
  const d = dt.getDate();
  return `${y}年${m}月${d}日`;
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function getMonthMatrix(anchorDate, weekStartsOnMonday = true) {
  const first = startOfMonth(anchorDate);
  const last = endOfMonth(anchorDate);

  const firstDow = first.getDay(); // 0 Sun..6 Sat
  const offset = weekStartsOnMonday ? (firstDow === 0 ? 6 : firstDow - 1) : firstDow;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);

  const weeks = [];
  let cursor = new Date(start);
  while (cursor <= last || weeks.length < 6) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    if (weeks.length >= 6 && cursor > last) break;
  }
  return weeks;
}

