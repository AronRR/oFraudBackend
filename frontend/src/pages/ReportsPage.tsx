import { FormEvent, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../hooks/useApi';
import type { AdminReportsResponse, ReportStatus } from '../api/types';
import { StatusBadge } from '../components/StatusBadge';
import { formatDateTime } from '../utils/format';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';

const statusOptions: Array<{ value: ReportStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobados' },
  { value: 'rejected', label: 'Rechazados' },
  { value: 'removed', label: 'Eliminados' },
];

export function ReportsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ReportStatus | 'all'>('pending');
  const [page, setPage] = useState(1);
  const [rejectContext, setRejectContext] = useState<{ reportId: number; note: string; reason: string }>({ reportId: 0, note: '', reason: '' });
  const [isRejectOpen, setRejectOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const limit = 10;

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (status !== 'all') {
      params.set('status', status);
    }
    return params.toString();
  }, [page, status]);

  const reportsQuery = useQuery({
    queryKey: ['admin-reports', queryString],
    queryFn: () => api.get<AdminReportsResponse>(`/admin/reports?${queryString}`),
  });

  const handleApprove = async (reportId: number) => {
    setActionError(null);
    try {
      await api.post('/reports/moderate', { action: 'approve', reportId });
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo aprobar el reporte');
    }
  };

  const handleOpenReject = (reportId: number) => {
    setRejectContext({ reportId, note: '', reason: '' });
    setRejectOpen(true);
  };

  const handleReject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);
    try {
      await api.post('/reports/moderate', {
        action: 'reject',
        reportId: rejectContext.reportId,
        rejectionReasonText: rejectContext.reason || null,
        note: rejectContext.note || null,
      });
      setRejectOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo rechazar el reporte');
    }
  };

  const handleRemove = async (reportId: number) => {
    setActionError(null);
    try {
      await api.del(`/admin/reports/${reportId}`);
      await queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'No se pudo eliminar el reporte');
    }
  };

  return (
    <div className="stack stack--lg">
      <section className="card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Moderación de reportes</h2>
            <p className="card__subtitle">Aprueba, rechaza o elimina los reportes enviados por la comunidad.</p>
          </div>
          <div className="card__filters">
            <label className="card__label">
              Estado
              <select
                className="card__select"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as ReportStatus | 'all');
                  setPage(1);
                }}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {actionError && <p className="card__error">{actionError}</p>}

        {reportsQuery.isLoading && <p>Cargando reportes…</p>}
        {reportsQuery.isError && (
          <p className="card__error">Error al cargar los reportes: {(reportsQuery.error as Error).message}</p>
        )}

        {reportsQuery.data && reportsQuery.data.items.length === 0 && <p>No se encontraron reportes con el filtro seleccionado.</p>}

        {reportsQuery.data && reportsQuery.data.items.length > 0 && (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th>Autor</th>
                  <th>Revisor</th>
                  <th>Actualizado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reportsQuery.data.items.map((report) => (
                  <tr key={report.reportId}>
                    <td>{report.reportId}</td>
                    <td>
                      <strong>{report.title ?? 'Sin título'}</strong>
                      <p className="table__meta">Creado: {formatDateTime(report.createdAt)}</p>
                    </td>
                    <td>{report.categoryName ?? 'Sin categoría'}</td>
                    <td>
                      <StatusBadge status={report.status} />
                    </td>
                    <td>
                      <p>{report.author.name ?? 'Anónimo'}</p>
                      <p className="table__meta">{report.author.email ?? 'sin correo'}</p>
                    </td>
                    <td>{report.reviewer?.name ?? '—'}</td>
                    <td>{formatDateTime(report.updatedAt)}</td>
                    <td>
                      <div className="table__actions">
                        {report.status === 'pending' && (
                          <>
                            <button className="button button--primary" type="button" onClick={() => handleApprove(report.reportId)}>
                              Aprobar
                            </button>
                            <button
                              className="button button--danger"
                              type="button"
                              onClick={() => handleOpenReject(report.reportId)}
                            >
                              Rechazar
                            </button>
                          </>
                        )}
                        {report.status !== 'removed' && (
                          <button className="button button--ghost" type="button" onClick={() => handleRemove(report.reportId)}>
                            Eliminar
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

        {reportsQuery.data && (
          <Pagination
            page={reportsQuery.data.meta.page}
            limit={reportsQuery.data.meta.limit}
            total={reportsQuery.data.meta.total}
            onPageChange={setPage}
          />
        )}
      </section>

      <Modal open={isRejectOpen} title="Rechazar reporte" onClose={() => setRejectOpen(false)}>
        <form className="form" onSubmit={handleReject}>
          <label className="form__label">
            Motivo del rechazo
            <textarea
              className="form__textarea"
              value={rejectContext.reason}
              onChange={(event) => setRejectContext((ctx) => ({ ...ctx, reason: event.target.value }))}
              placeholder="Describe brevemente el motivo"
              rows={3}
            />
          </label>
          <label className="form__label">
            Nota interna
            <textarea
              className="form__textarea"
              value={rejectContext.note}
              onChange={(event) => setRejectContext((ctx) => ({ ...ctx, note: event.target.value }))}
              placeholder="Notas visibles solo para administradores"
              rows={2}
            />
          </label>
          <div className="form__actions">
            <button className="button button--ghost" type="button" onClick={() => setRejectOpen(false)}>
              Cancelar
            </button>
            <button className="button button--danger" type="submit">
              Confirmar rechazo
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
