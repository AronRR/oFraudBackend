import { useQuery } from '@tanstack/react-query';
import { MetricCard } from '../components/MetricCard';
import { useApi } from '../hooks/useApi';
import { formatNumber } from '../utils/format';
import type {
  MetricsOverview,
  MetricsTopCategory,
  MetricsTopHost,
  FraudStats,
} from '../api/types';

export function DashboardPage() {
  const api = useApi();

  const metricsQuery = useQuery({
    queryKey: ['metrics-overview'],
    queryFn: () => api.get<MetricsOverview>('/admin/metrics/overview'),
  });

  const topCategoriesQuery = useQuery({
    queryKey: ['metrics-top-categories'],
    queryFn: () => api.get<MetricsTopCategory[]>(`/admin/metrics/top-categories?limit=5`),
  });

  const topHostsQuery = useQuery({
    queryKey: ['metrics-top-hosts'],
    queryFn: () => api.get<MetricsTopHost[]>(`/admin/metrics/top-hosts?limit=5`),
  });

  const fraudStatsQuery = useQuery({
    queryKey: ['insights-fraud-stats'],
    queryFn: () => api.get<FraudStats>('/insights/fraud-stats'),
  });

  if (metricsQuery.isLoading) {
    return <div className="card">Cargando métricas…</div>;
  }

  if (metricsQuery.isError) {
    return <div className="card card--error">Error al cargar métricas: {(metricsQuery.error as Error).message}</div>;
  }

  const metrics = metricsQuery.data;

  return (
    <div className="stack stack--lg">
      <section className="grid grid--metrics">
        <MetricCard title="Reportes totales" value={formatNumber(metrics.totalReports)} helper={`${formatNumber(metrics.approvedReports)} aprobados`} />
        <MetricCard title="Reportes pendientes" value={formatNumber(metrics.pendingReports)} helper={`${formatNumber(metrics.totalFlags)} alertas abiertas`} />
        <MetricCard title="Usuarios" value={formatNumber(metrics.totalUsers)} helper={`${formatNumber(metrics.blockedUsers)} bloqueados`} />
        <MetricCard title="Alertas validadas" value={formatNumber(metrics.validatedFlags)} helper={`${formatNumber(metrics.dismissedFlags)} descartadas`} />
      </section>

      <section className="card">
        <h2 className="card__title">Actividad reciente</h2>
        {fraudStatsQuery.isLoading && <p>Cargando tendencias…</p>}
        {fraudStatsQuery.isError && (
          <p className="card__error">No se pudieron obtener las estadísticas: {(fraudStatsQuery.error as Error).message}</p>
        )}
        {fraudStatsQuery.data && (
          <div className="grid grid--stats">
            <div>
              <p className="stat__label">Tiempo promedio de detección</p>
              <p className="stat__value">{formatNumber(fraudStatsQuery.data.averageDetectionDays)} días</p>
            </div>
            <div>
              <p className="stat__label">Reportes aprobados</p>
              <p className="stat__value">{formatNumber(fraudStatsQuery.data.totalReportsApproved)}</p>
            </div>
            <div>
              <p className="stat__label">Reportes esta semana</p>
              <p className="stat__value">{formatNumber(fraudStatsQuery.data.reportsThisWeek)}</p>
            </div>
            <div>
              <p className="stat__label">Reportes este mes</p>
              <p className="stat__value">{formatNumber(fraudStatsQuery.data.reportsThisMonth)}</p>
            </div>
            <div>
              <p className="stat__label">Usuarios activos</p>
              <p className="stat__value">{formatNumber(fraudStatsQuery.data.totalActiveUsers)}</p>
            </div>
            <div>
              <p className="stat__label">Categorías activas</p>
              <p className="stat__value">{formatNumber(fraudStatsQuery.data.categoriesCount)}</p>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid--two-cols">
        <article className="card">
          <h2 className="card__title">Categorías con más actividad</h2>
          {topCategoriesQuery.isLoading && <p>Cargando categorías…</p>}
          {topCategoriesQuery.isError && (
            <p className="card__error">No se pudieron obtener las categorías: {(topCategoriesQuery.error as Error).message}</p>
          )}
          {topCategoriesQuery.data && (
            <ul className="list">
              {topCategoriesQuery.data.map((category) => (
                <li key={category.id} className="list__item">
                  <div>
                    <p className="list__title">{category.name}</p>
                    <p className="list__subtitle">Slug: {category.slug}</p>
                  </div>
                  <div className="list__meta">
                    <span>{formatNumber(category.reportsCount)} reportes</span>
                    <span>{formatNumber(category.searchCount)} búsquedas</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card">
          <h2 className="card__title">Hosts más reportados</h2>
          {topHostsQuery.isLoading && <p>Cargando hosts…</p>}
          {topHostsQuery.isError && (
            <p className="card__error">No se pudieron obtener los hosts: {(topHostsQuery.error as Error).message}</p>
          )}
          {topHostsQuery.data && (
            <ul className="list">
              {topHostsQuery.data.map((host) => (
                <li key={host.host} className="list__item">
                  <div>
                    <p className="list__title">{host.host || 'Host desconocido'}</p>
                    <p className="list__subtitle">{formatNumber(host.reportsCount)} reportes totales</p>
                  </div>
                  <div className="list__meta">
                    <span>{formatNumber(host.approvedReportsCount)} aprobados</span>
                    <span>{formatNumber(host.pendingReportsCount)} pendientes</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </div>
  );
}
