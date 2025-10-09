import { useAuth } from '../hooks/useAuth';

export function HeaderBar() {
  const { user, logout } = useAuth();

  return (
    <header className="header">
      <div>
        <h1 className="header__title">Panel de monitoreo</h1>
        <p className="header__subtitle">Gestiona los reportes y métricas de la comunidad</p>
      </div>
      <div className="header__actions">
        <div className="header__user">
          <span className="header__avatar">{user?.name?.charAt(0) ?? 'A'}</span>
          <div>
            <p className="header__user-name">{user?.name ?? 'Administrador'}</p>
            <p className="header__user-role">{user?.email ?? 'sin correo'}</p>
          </div>
        </div>
        <button className="button button--ghost" type="button" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
