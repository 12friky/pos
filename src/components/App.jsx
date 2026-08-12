import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './Dashboard'
import NewSale from './NewSale'
import Products from './Products'
import Inventory from './Inventory'
import Reports from './Reports'
import SaleHistory from './SaleHistory'

function App() {
  return (
    <BrowserRouter>
      <div className="dashboard">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">T</div>
            <div>
              <div className="brand-name">Till</div>
              <div className="brand-sub">Point of Sale</div>
            </div>
          </div>

          <nav>
            <div className="nav-label">Overview</div>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
              Dashboard
            </NavLink>
            <div className="nav-label">Operate</div>
            <NavLink to="/new-sale" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 7H6"/></svg>
              New Sale
            </NavLink>
            <NavLink to="/products" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></svg>
              Products
            </NavLink>
            <NavLink to="/inventory" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18M5 7v14h14V7"/><path d="M16 3H8v4h8V3Z"/></svg>
              Inventory
            </NavLink>
            <div className="nav-label">Insights</div>
            <NavLink to="/reports" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-4"/></svg>
              Reports
            </NavLink>
            <NavLink to="/sales-history" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
              Sales History
            </NavLink>
            <div className="nav-label">System</div>
            <a className="nav-item" href="#">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
              Settings
            </a>
          </nav>

          <div className="sidebar-foot">
            <div className="avatar">MA</div>
            <div>
              <div className="foot-name">Maya Antwi</div>
              <div className="foot-role">Cashier · Till 02</div>
            </div>
          </div>
        </aside>

        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/new-sale" element={<NewSale />} />
          <Route path="/products" element={<Products />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/sales-history" element={<SaleHistory />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
