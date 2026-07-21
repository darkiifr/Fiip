export function normalizeTaskTime(value = '') {
  const raw = String(value || '').trim();
  const formatted = raw.match(/^(\d{1,2}):(\d{2})$/);
  const compact = raw.replace(/\D/g, '').slice(0, 4);

  let hours;
  let minutes;
  if (formatted) {
    hours = Number(formatted[1]);
    minutes = Number(formatted[2]);
  } else if (compact.length === 4) {
    hours = Number(compact.slice(0, 2));
    minutes = Number(compact.slice(2));
  } else if (compact.length === 3) {
    hours = Number(compact.slice(0, 1));
    minutes = Number(compact.slice(1));
  } else if (compact.length > 0) {
    hours = Number(compact);
    minutes = 0;
  } else {
    return '';
  }

  if (hours > 23 || minutes > 59) {return '';}
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
