export function formatDate(dateIso: string | null | undefined) {
  if (!dateIso) return '—';
  const date = new Date(dateIso);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateIso: string | null | undefined) {
  if (!dateIso) return '—';
  const date = new Date(dateIso);
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatNumber(num: number | null | undefined) {
  if (typeof num !== 'number' || Number.isNaN(num)) return '0';
  return new Intl.NumberFormat('es-ES').format(num);
}
