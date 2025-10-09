export function Pagination({ page, total, limit, onPageChange }: { page: number; total: number; limit: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <button className="button button--ghost" type="button" disabled={!canPrev} onClick={() => canPrev && onPageChange(page - 1)}>
        Anterior
      </button>
      <span>
        Página {page} de {totalPages}
      </span>
      <button className="button button--ghost" type="button" disabled={!canNext} onClick={() => canNext && onPageChange(page + 1)}>
        Siguiente
      </button>
    </div>
  );
}
