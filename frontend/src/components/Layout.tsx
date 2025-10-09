import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { HeaderBar } from './Header';

export function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="dashboard-main">
        <HeaderBar />
        <main className="dashboard-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
