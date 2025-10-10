import { ReactNode } from 'react';

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal">
      <div className="modal__backdrop" onClick={onClose} role="presentation" />
      <div className="modal__content">
        <div className="modal__header">
          <h2>{title}</h2>
          <button className="button button--ghost" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}
