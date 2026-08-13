import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Dashboard from './Dashboard'
import NewSale from './NewSale'
import Products from './Products'
import Inventory from './Inventory'
import Reports from './Reports'
import SaleHistory from './SaleHistory'
import Login from './Login'
import Register from './Register'
import Settings from './Settings'
import { CustomerTools, InventoryUtilities, MarketingCenter } from './Utilities'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [utilitiesOpen, setUtilitiesOpen] = useState(false)
  const [isMobileNav, setIsMobileNav] = useState(() => window.matchMedia('(max-width: 1024px)').matches)
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem('posToken')))
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem('posUser')
      return raw ? JSON.parse(raw) : null
    } catch (e) {
      return null
    }
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1024px)')
    const updateNavigationMode = () => {
      setIsMobileNav(mediaQuery.matches)
      if (!mediaQuery.matches) setSidebarOpen(false)
    }

    updateNavigationMode()
    mediaQuery.addEventListener('change', updateNavigationMode)
    return () => mediaQuery.removeEventListener('change', updateNavigationMode)
  }, [])

  useEffect(() => {
    const loadCurrentUser = async () => {
      const token = localStorage.getItem('posToken')
      if (!token) return
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
        if (!response.ok) return
        const { user } = await response.json()
        localStorage.setItem('posUser', JSON.stringify(user))
        setCurrentUser(user)
      } catch (error) { console.error('Unable to refresh business profile:', error) }
    }
    loadCurrentUser()
  }, [])

  const handleLogin = (token, user) => {
    if (token) localStorage.setItem('posToken', token)
    if (user) {
      try {
        localStorage.setItem('posUser', JSON.stringify(user))
      } catch (e) {}
      setCurrentUser(user)
    }
    setIsLoggedIn(true)
  }

  const dashboardShell = (
    <div className={"dashboard " + (sidebarOpen ? 'sidebar-open' : '')}>
      {isMobileNav && !sidebarOpen && (
        <button
          className="hamburger-btn"
          aria-label="Open menu"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(true)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M3 12h18" />
            <path d="M3 18h18" />
          </svg>
        </button>
      )}

      <aside className="sidebar">
        <button
          className="sidebar-close"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        <div className="brand">
          {(() => {
            const logo = currentUser?.businessLogoUrl
            const logoSrc = logo && (String(logo).startsWith('http') || String(logo).startsWith('data:')) ? logo : (logo ? `${import.meta.env.VITE_API_URL}${logo}` : null)
            return (
              <>
                <div className="brand-mark">{logoSrc ? <img src={logoSrc} alt={currentUser?.businessName || 'Business logo'} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} /> : (currentUser?.businessName || 'T').slice(0, 1).toUpperCase()}</div>
                <div>
                  <div className="brand-name">{currentUser?.businessName || 'Till'}</div>
                  <div className="brand-sub">Point of Sale</div>
                </div>
              </>
            )
          })()}
        </div>

        <nav>
          <div className="nav-label">Overview</div>
          <NavLink to="/" end onClick={() => setSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
            Dashboard
          </NavLink>
          <div className="nav-label">Operate</div>
          <NavLink to="/new-sale" onClick={() => setSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 7H6"/></svg>
            New Sale
          </NavLink>
          <NavLink to="/products" onClick={() => setSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></svg>
            Products
          </NavLink>
          <NavLink to="/inventory" onClick={() => setSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 7h18M5 7v14h14V7"/><path d="M16 3H8v4h8V3Z"/></svg>
            Inventory
          </NavLink>
          <div className="nav-label">Insights</div>
          <NavLink to="/reports" onClick={() => setSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-4"/></svg>
            Reports
          </NavLink>
          <NavLink to="/sales-history" onClick={() => setSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
            Sales History
          </NavLink>
          <div className="nav-label">System</div>
          <NavLink to="/settings" onClick={() => setSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
            Settings
          </NavLink>
          <button type="button" className="nav-label utilities-toggle" onClick={() => setUtilitiesOpen((open) => !open)} aria-expanded={utilitiesOpen}>
            Utilities <span>{utilitiesOpen ? '⌃' : '⌄'}</span>
          </button>
          {utilitiesOpen && (
            <div className="utilities-submenu">
              <NavLink to="/utilities/marketing" onClick={() => setSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>📣 Marketing Center</NavLink>
              <NavLink to="/utilities/customers" onClick={() => setSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>👥 Customer Tools</NavLink>
              <NavLink to="/utilities/inventory" onClick={() => setSidebarOpen(false)} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>📦 Inventory Utilities</NavLink>
            </div>
          )}
          <button
            type="button"
            className="nav-item"
            onClick={() => {
              localStorage.removeItem('posToken')
              localStorage.removeItem('posUser')
              setCurrentUser(null)
              setIsLoggedIn(false)
              setSidebarOpen(false)
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>
            Logout
          </button>
        </nav>

        <div className="sidebar-foot">
          <div className="avatar">{currentUser ? (currentUser.name || '').slice(0,2).toUpperCase() : 'MA'}</div>
          <div>
            <div className="foot-name">{currentUser ? currentUser.name : 'Maya Antwi'}</div>
            <div className="foot-role">Cashier · Till 02</div>
          </div>
        </div>
      </aside>

      {isMobileNav && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Routes>
        <Route path="/" element={<Dashboard user={currentUser} />} />
        <Route path="/new-sale" element={<NewSale user={currentUser} />} />
        <Route path="/products" element={<Products />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/sales-history" element={<SaleHistory />} />
        <Route path="/settings" element={<Settings onUserUpdated={setCurrentUser} />} />
        <Route path="/utilities/marketing" element={<MarketingCenter />} />
        <Route path="/utilities/customers" element={<CustomerTools />} />
        <Route path="/utilities/inventory" element={<InventoryUtilities />} />
        <Route path="*" element={<Navigate replace to="/" />} />
      </Routes>
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate replace to="/" /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={isLoggedIn ? <Navigate replace to="/" /> : <Register onLogin={handleLogin} />}
        />
        <Route path="/*" element={isLoggedIn ? dashboardShell : <Navigate replace to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
