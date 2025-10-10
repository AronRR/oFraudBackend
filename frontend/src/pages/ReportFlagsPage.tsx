import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import type { AdminReportFlagsResponse, ReportFlagStatus } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/format';
import { Pagination } from '../components/Pagination';

const flagStatusOptions: Array<{ value: ReportFlagStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'validated', label: 'Validados' },
  { value: 'dismissed', label: 'Descartados' },
];

export function ReportFlagsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportFlagStatus | 'all'>('pending');
  const [page, setPage] = useState(1);
  const limit = 10;
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (status !== 'all') {
      params.set('status', status);
    }
    return params.toString();
  }, [page, status]);

  const flagsQuery = useQuery({
    queryKey: ['admin-report-flags', queryString],
    queryFn: () => api.get<AdminReportFlagsResponse>(`/admin/report-flags?${queryString}`),
  });

  const updateFlagStatus = async (flagId: number, newStatus: ReportFlagStatus) => {
    setError(null);
    try {
      await api.patch(`/admin/report-flags/${flagId}`, { status: newStatus });
      await queryClient.invalidateQueries({ queryKey: ['admin-report-flags'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la alerta');
    }
  };

  return (
    <section className="card">
      <div className="card__header">
        <div>
          <h2 className="card__title">Alertas de la comunidad</h2>
          <p className="card__subtitle">Gestiona los reportes de abuso y contenido sospechoso.</p>
        </div>
        <div className="card__filters">
          <label className="card__label">
            Estado
            <select
              className="card__select"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as ReportFlagStatus | 'all');
                setPage(1);
              }}
            >
              {flagStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {flagsQuery.data && (
        <div className="card__chips">
          <span>Pendientes: {flagsQuery.data.counts.pending}</span>
          <span>Validados: {flagsQuery.data.counts.validated}</span>
          <span>Descartados: {flagsQuery.data.counts.dismissed}</span>
        </div>
      )}

      {error && <p className="card__error">{error}</p>}

      {flagsQuery.isLoading && <p>Cargando alertas…</p>}
      {flagsQuery.isError && (
        <p className="card__error">No se pudieron obtener las alertas: {(flagsQuery.error as Error).message}</p>
      )}

      {flagsQuery.data && flagsQuery.data.items.length === 0 && <p>No hay alertas registradas con el filtro aplicado.</p>}

      {flagsQuery.data && flagsQuery.data.items.length > 0 && (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Reporte</th>
                <th>Motivo</th>
                <th>Reportado por</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {flagsQuery.data.items.map((flag) => (
                <tr key={flag.flagId}>
                  <td>{flag.flagId}</td>
                  <td>
                    <strong>{flag.reportTitle ?? `Reporte #${flag.reportId}`}</strong>
                    <p className="table__meta">Estado: {flag.reportStatus}</p>
                  </td>
                  <td>
                    <p>{flag.reasonCode}</p>
                    {flag.details && <p className="table__meta">{flag.details}</p>}
                  </td>
                  <td>
                    <p>{flag.reporter.name ?? 'Anónimo'}</p>
                    <p className="table__meta">{flag.reporter.email ?? 'sin correo'}</p>
                  </td>
                  <td>
                    <StatusBadge status={flag.status} />
                  </td>
                  <td>{formatDateTime(flag.createdAt)}</td>
                  <td>
                    <div className="table__actions">
                      {flag.status !== 'validated' && (
                        <button
                          className="button button--primary"
                          type="button"
                          onClick={() => updateFlagStatus(flag.flagId, 'validated')}
                        >
                          Validar
                        </button>
                      )}
                      {flag.status !== 'dismissed' && (
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => updateFlagStatus(flag.flagId, 'dismissed')}
                        >
                          Descartar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {flagsQuery.data && (
        <Pagination
          page={flagsQuery.data.meta.page}
          limit={flagsQuery.data.meta.limit}
          total={flagsQuery.data.meta.total}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}
