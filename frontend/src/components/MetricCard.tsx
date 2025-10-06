import { ReactNode } from 'react';

export function MetricCard({ title, value, helper }: { title: string; value: ReactNode; helper?: ReactNode }) {
  return (
    <article className="metric-card">
      <p className="metric-card__title">{title}</p>
      <p className="metric-card__value">{value}</p>
      {helper && <p className="metric-card__helper">{helper}</p>}
    </article>
  );
}
