import { NavLink } from 'react-router-dom';
import { ChartBarIcon, ClipboardDocumentListIcon, FlagIcon, Squares2X2Icon } from '@heroicons/react/24/outline';

const navItems = [
  { to: '/dashboard', label: 'Resumen', icon: ChartBarIcon },
  { to: '/reports', label: 'Reportes', icon: ClipboardDocumentListIcon },
  { to: '/report-flags', label: 'Alertas', icon: FlagIcon },
  { to: '/categories', label: 'Categorías', icon: Squares2X2Icon },
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__logo">oFraud</span>
        <p className="sidebar__subtitle">Panel administrativo</p>
      </div>
      <nav className="sidebar__nav">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
          >
            <Icon className="sidebar__icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
