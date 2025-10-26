import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BarChart3, Share2, Settings } from 'lucide-react';
import './Layout.css';

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1 className="app-title">Shopify Marketing Hub</h1>
          <p className="app-subtitle">Grow Your Store</p>
        </div>

        <nav className="nav-menu">
          <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/analytics" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <BarChart3 size={20} />
            <span>Analytics</span>
          </NavLink>

          <NavLink to="/social-media" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Share2 size={20} />
            <span>Social Media</span>
          </NavLink>

          <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <Settings size={20} />
            <span>Settings</span>
          </NavLink>
        </nav>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
