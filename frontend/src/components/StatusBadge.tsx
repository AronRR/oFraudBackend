import { ReportStatus, ReportFlagStatus } from '../api/types';

const statusStyles: Record<string, { background: string; color: string; border: string }> = {
  pending: { background: 'rgba(245, 158, 11, 0.12)', color: '#fcd34d', border: 'rgba(245, 158, 11, 0.4)' },
  approved: { background: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', border: 'rgba(16, 185, 129, 0.4)' },
  rejected: { background: 'rgba(248, 113, 113, 0.12)', color: '#fca5a5', border: 'rgba(248, 113, 113, 0.4)' },
  removed: { background: 'rgba(100, 116, 139, 0.12)', color: '#e2e8f0', border: 'rgba(100, 116, 139, 0.4)' },
  validated: { background: 'rgba(16, 185, 129, 0.12)', color: '#6ee7b7', border: 'rgba(16, 185, 129, 0.4)' },
  dismissed: { background: 'rgba(100, 116, 139, 0.12)', color: '#e2e8f0', border: 'rgba(100, 116, 139, 0.4)' },
};

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  removed: 'Eliminado',
  validated: 'Validado',
  dismissed: 'Descartado',
};

export function StatusBadge({ status }: { status: ReportStatus | ReportFlagStatus }) {
  const style = statusStyles[status] ?? {
    background: 'rgba(148, 163, 184, 0.2)',
    color: '#e2e8f0',
    border: 'rgba(148, 163, 184, 0.4)',
  };
  const label = statusLabels[status] ?? status;
  return (
    <span
      className="status-badge"
      style={{ backgroundColor: style.background, color: style.color, border: `1px solid ${style.border}` }}
    >
      {label}
    </span>
  );
}
