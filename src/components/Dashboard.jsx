import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { posDb } from '../data/posDb'
import { syncPosData } from '../data/sync'

export default function Dashboard({ user }) {
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState('week')
  const userId = String(user?.id || user?._id || '')
  const products = useLiveQuery(() => userId ? posDb.products.where('userId').equals(userId).toArray() : [], [userId], [])
  const sales = useLiveQuery(() => userId ? posDb.sales.where('userId').equals(userId).toArray() : [], [userId], [])

  useEffect(() => {
    const token = localStorage.getItem('posToken')
    if (userId && token) syncPosData({ userId, token })
  }, [userId])

  // derive basic inventory stats from products collection
  const totalProducts = products.length
  const totalUnits = products.reduce((s, p) => s + (p.stock || 0), 0)
  const totalInventoryValue = products.reduce((s, p) => s + (p.cost || 0) * (p.stock || 0), 0)
  const lowStockItems = products.filter((p) => (p.stock || 0) <= (p.minStock || 0))
  const lowStockCount = lowStockItems.length

  // topList fallback: use products sorted by stock desc (best available without sales data)
  const inventoryFallback = [...products]
    .sort((a, b) => (b.stock || 0) - (a.stock || 0))
    .slice(0, 3)
    .map((p) => ({ name: p.name, units: p.stock || 0, revenue: `GH₵ ${(p.price || 0) * (p.stock || 0)}` }))

  const startOfToday = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const startOfRange = useMemo(() => {
    const d = new Date(startOfToday)
    d.setDate(d.getDate() - (timeRange === 'today' ? 0 : timeRange === 'week' ? 6 : 29))
    return d
  }, [startOfToday, timeRange])
  const rangeSales = sales.filter((sale) => new Date(sale.createdAt) >= startOfRange)
  const todaySales = sales.filter((sale) => new Date(sale.createdAt) >= startOfToday)
  const todayTotals = todaySales.reduce((totals, sale) => {
    totals.discount += Number(sale.discount) || 0
    totals[sale.paymentMethod] = (totals[sale.paymentMethod] || 0) + (Number(sale.total) || 0)
    return totals
  }, { discount: 0, Cash: 0, Card: 0, Mobile: 0 })
  const topList = useMemo(() => {
    const productByName = new Map(products.map((product) => [product.name, product]))
    const productsByName = new Map()
    rangeSales.forEach((sale) => sale.items.forEach((item) => {
      const current = productsByName.get(item.name) || { name: item.name, units: 0, revenue: 0, imageUrl: productByName.get(item.name)?.imageUrl }
      current.units += Number(item.quantity) || 0
      current.revenue += (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)
      productsByName.set(item.name, current)
    }))
    if (productsByName.size === 0) return inventoryFallback
    return [...productsByName.values()].sort((a, b) => b.units - a.units).slice(0, 3)
  }, [rangeSales, inventoryFallback, products])
  const weeklySales = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(startOfToday)
    date.setDate(date.getDate() - (6 - index))
    const value = sales.filter((sale) => new Date(sale.createdAt).toDateString() === date.toDateString())
      .reduce((sum, sale) => sum + (Number(sale.total) || 0), 0)
    return { label: index === 6 ? 'TODAY' : date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(), value }
  }), [sales, startOfToday])
  const maxWeeklySales = Math.max(...weeklySales.map((day) => day.value), 1)
  const money = (value) => `GH₵ ${Number(value || 0).toFixed(2)}`

  const handleQuick = (action) => {
    if (action === 'add') navigate('/products')
    if (action === 'adjust') navigate('/products')
    if (action === 'new') navigate('/new-sale')
    if (action === 'export') window.print()
    if (action === 'till') {
      alert('Toggle till (open/close) — implement backend to persist')
    }
  }

  const styles = `
    * {
      box-sizing: border-box;
    }

    .dashboard-page {
      min-height: 100vh;
      background: #f6f7f5;
      color: #202522;
      font-family:
        Inter,
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
      padding: 28px 24px 40px;
    }

    .dashboard-shell {
      width: 100%;
      max-width: none;
    }

    /* HEADER */

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      margin-bottom: 30px;
    }

    .greeting-eyebrow {
      color: #8b938d;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.09em;
      margin-bottom: 7px;
      text-transform: uppercase;
    }

    .greeting {
      font-size: 28px;
      font-weight: 750;
      letter-spacing: -0.04em;
      color: #1f2521;
    }

    .topbar-right {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .search {
      width: 260px;
      height: 44px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 0 14px;
      border: 1px solid #e4e8e4;
      background: #ffffff;
      color: #8a928c;
      border-radius: 12px;
      font-size: 13px;
      box-shadow: 0 2px 8px rgba(31, 37, 33, 0.025);
    }

    .search svg {
      width: 17px;
      height: 17px;
      flex-shrink: 0;
    }

    .icon-btn {
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e4e8e4;
      border-radius: 12px;
      background: #fff;
      color: #5e6761;
      position: relative;
      cursor: pointer;
    }

    .icon-btn svg {
      width: 18px;
      height: 18px;
    }

    .dot {
      position: absolute;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #d95c4d;
      top: 9px;
      right: 9px;
      border: 2px solid #fff;
    }

    .primary-btn {
      height: 44px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 17px;
      border: 0;
      border-radius: 12px;
      background: #27332c;
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 5px 15px rgba(39, 51, 44, 0.12);
      transition: 0.2s ease;
    }

    .primary-btn:hover {
      background: #1f2923;
      transform: translateY(-1px);
    }

    .primary-btn svg {
      width: 16px;
      height: 16px;
    }

    /* STAT CARDS */

    .stat-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      margin-bottom: 18px;
    }

    .stat-card {
      background: #fff;
      border: 1px solid #e8ebe8;
      border-radius: 17px;
      padding: 20px;
      min-height: 142px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 3px 12px rgba(31, 37, 33, 0.025);
    }

    .stat-card::after {
      content: "";
      position: absolute;
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: #f5f7f5;
      right: -35px;
      bottom: -40px;
    }

    .stat-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .stat-label {
      font-size: 12px;
      color: #7b847e;
      font-weight: 600;
    }

    .stat-value {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.04em;
      color: #202722;
    }

    .stat-icon {
      width: 39px;
      height: 39px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 11px;
      margin-bottom: 16px;
    }

    .stat-icon svg {
      width: 19px;
      height: 19px;
    }

    .icon-green {
      background: #edf5ef;
      color: #4c7959;
    }

    .icon-blue {
      background: #edf5f5;
      color: #397373;
    }

    .icon-amber {
      background: #faf4e7;
      color: #9b7433;
    }

    .icon-red {
      background: #f9eeee;
      color: #a9574f;
    }

    .badge {
      font-size: 10px;
      font-weight: 750;
      padding: 5px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }

    .badge-up {
      color: #4c7658;
      background: #edf6ef;
    }

    .badge-down {
      color: #a35c55;
      background: #faeeee;
    }

    /* MAIN GRID */

    .content-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.45fr) minmax(300px, 0.7fr);
      gap: 18px;
    }

    .main-column {
      min-width: 0;
    }

    .side-column {
      min-width: 0;
    }

    .panel {
      background: #fff;
      border: 1px solid #e7ebe7;
      border-radius: 17px;
      margin-bottom: 18px;
      overflow: hidden;
      box-shadow: 0 3px 12px rgba(31, 37, 33, 0.025);
    }

    .panel-head {
      min-height: 68px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 20px;
      border-bottom: 1px solid #eef0ee;
    }

    .panel-title {
      font-size: 14px;
      font-weight: 750;
      color: #252b27;
      letter-spacing: -0.01em;
    }

    .panel-link {
      text-decoration: none;
      color: #5d7764;
      font-size: 12px;
      font-weight: 700;
    }

    .panel-link:hover {
      color: #354e3c;
    }

    /* TOP PRODUCTS */

    .time-toggle {
      display: flex;
      gap: 3px;
      padding: 3px;
      background: #f3f5f3;
      border-radius: 9px;
    }

    .toggle-btn {
      border: 0;
      background: transparent;
      color: #8a928d;
      font-size: 11px;
      font-weight: 650;
      padding: 7px 10px;
      border-radius: 7px;
      cursor: pointer;
    }

    .toggle-btn.active {
      background: #fff;
      color: #263129;
      box-shadow: 0 1px 5px rgba(20, 30, 23, 0.08);
    }

    .top-list {
      list-style: none;
      padding: 6px 20px 10px;
      margin: 0;
    }

    .top-item {
      display: grid;
      grid-template-columns: 35px 34px 1fr auto;
      align-items: center;
      gap: 12px;
      min-height: 58px;
      border-bottom: 1px solid #f0f2f0;
    }

    .top-item:last-child {
      border-bottom: 0;
    }

    .top-product-image { width: 34px; height: 34px; border-radius: 9px; object-fit: cover; background: #edf3ef; }

    .top-rank {
      width: 28px;
      height: 28px;
      border-radius: 9px;
      background: #f2f5f2;
      color: #657168;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 750;
    }

    .top-item:first-child .top-rank {
      background: #eaf2eb;
      color: #4d7658;
    }

    .top-name {
      font-size: 13px;
      font-weight: 650;
      color: #303732;
    }

    .top-meta {
      color: #909791;
      font-size: 11px;
      text-align: right;
    }

    .mono {
      color: #4d5851;
      font-weight: 650;
    }

    /* CHART */

    .chart-panel-body {
      padding: 22px 20px 17px;
    }

    .chart {
      height: 185px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 14px;
      padding: 10px 5px 0;
      position: relative;
    }

    .chart::before,
    .chart::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      border-top: 1px dashed #edf0ed;
    }

    .chart::before {
      top: 33%;
    }

    .chart::after {
      top: 66%;
    }

    .bar-col {
      height: 100%;
      flex: 1;
      display: flex;
      align-items: center;
      flex-direction: column;
      justify-content: flex-end;
      position: relative;
      z-index: 1;
    }

    .bar {
      width: min(42px, 70%);
      min-height: 15px;
      border-radius: 8px 8px 4px 4px;
      background: #dfe8e1;
      transition: 0.25s ease;
    }

    .bar:hover {
      background: #c6d6c9;
    }

    .bar.today {
      background: #607b67;
      box-shadow: 0 5px 13px rgba(96, 123, 103, 0.18);
    }

    .bar-label {
      margin-top: 9px;
      color: #969d98;
      font-size: 9px;
      font-weight: 750;
      letter-spacing: 0.04em;
    }

    .bar-col:last-child .bar-label {
      color: #526b59;
    }

    /* TRANSACTIONS */

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 600px;
    }

    th {
      text-align: left;
      padding: 13px 20px;
      color: #9aa09c;
      font-size: 10px;
      font-weight: 750;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      background: #fafbfa;
    }

    td {
      padding: 15px 20px;
      border-top: 1px solid #f0f2f0;
      color: #68716b;
      font-size: 12px;
    }

    .txn-id {
      color: #3b4740;
      font-weight: 750;
    }

    .txn-amount {
      color: #27312b;
      font-weight: 750;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      padding: 5px 8px;
      border-radius: 7px;
      font-size: 10px;
      font-weight: 700;
    }

    .pill-card {
      background: #edf4f4;
      color: #47706f;
    }

    .pill-cash {
      background: #f0f5ef;
      color: #57735c;
    }

    .pill-mobile {
      background: #f7f1e6;
      color: #8c713c;
    }

    /* TILL SUMMARY */

    .till-card {
      background: #29342e;
      color: #fff;
      border-radius: 17px;
      margin-bottom: 18px;
      padding: 22px;
      position: relative;
      overflow: hidden;
      box-shadow: 0 8px 22px rgba(41, 52, 46, 0.12);
    }

    .till-card::after {
      content: "";
      position: absolute;
      width: 150px;
      height: 150px;
      border-radius: 50%;
      right: -65px;
      top: -65px;
      background: rgba(255,255,255,0.045);
    }

    .receipt-eyebrow {
      font-size: 10px;
      font-weight: 750;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #a9b5ad;
      margin-bottom: 5px;
    }

    .receipt-title {
      font-size: 17px;
      font-weight: 750;
      margin-bottom: 21px;
    }

    .receipt-line {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      padding: 9px 0;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      color: #b9c1bb;
      font-size: 11px;
    }

    .receipt-line span:last-child {
      color: #f3f5f3;
      font-weight: 650;
    }

    .receipt-total {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-top: 17px;
      margin-top: 6px;
      font-size: 12px;
      font-weight: 700;
    }

    .receipt-total span:last-child {
      font-size: 20px;
      letter-spacing: -0.03em;
    }

    /* STOCK */

    .stock-list {
      padding: 5px 20px 10px;
    }

    .stock-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      min-height: 64px;
      border-bottom: 1px solid #f0f2f0;
    }

    .stock-row:last-child {
      border-bottom: 0;
    }

    .stock-name {
      color: #39423c;
      font-size: 12px;
      font-weight: 650;
    }

    .stock-sku {
      margin-top: 4px;
      color: #a0a6a1;
      font-size: 10px;
    }

    .stock-qty {
      color: #a55850;
      background: #faefed;
      border-radius: 8px;
      padding: 6px 8px;
      font-size: 10px;
      font-weight: 750;
      white-space: nowrap;
    }

    /* QUICK ACTIONS */

    .quick-actions {
      padding: 7px 20px 20px;
    }

    .qa-btn {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 12px 0;
      background: transparent;
      border: 0;
      border-bottom: 1px solid #f0f2f0;
      color: #56615a;
      font-size: 12px;
      font-weight: 650;
      text-align: left;
      cursor: pointer;
      transition: 0.18s ease;
    }

    .qa-btn:last-child {
      border-bottom: 0;
    }

    .qa-btn:hover {
      color: #29362e;
      padding-left: 4px;
    }

    .qa-btn svg {
      width: 17px;
      height: 17px;
      color: #718078;
    }

    /* RESPONSIVE */

    @media (max-width: 1150px) {
      .stat-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .content-grid {
        grid-template-columns: 1fr;
      }

      .side-column {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 18px;
        align-items: start;
      }

      .side-column .panel,
      .side-column .till-card {
        margin-bottom: 0;
      }
    }

    @media (max-width: 800px) {
      .dashboard-page {
        padding: 20px 16px 30px;
      }

      .topbar {
        align-items: flex-start;
        flex-direction: column;
      }

      .topbar-right {
        width: 100%;
      }

      .search {
        flex: 1;
        width: auto;
      }

      .side-column {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 580px) {
      .greeting {
        font-size: 23px;
      }

      .stat-grid {
        grid-template-columns: 1fr;
      }

      .stat-card {
        min-height: 125px;
      }

      .panel-head {
        padding: 0 15px;
      }

      .top-list {
        padding-left: 15px;
        padding-right: 15px;
      }

      .top-item {
        grid-template-columns: 32px 1fr;
        gap: 10px;
      }

      .top-meta {
        grid-column: 2;
        text-align: left;
        margin-top: -7px;
        padding-bottom: 8px;
      }

      .topbar-right {
        flex-wrap: wrap;
      }

      .search {
        width: 100%;
        flex-basis: 100%;
      }

      .primary-btn {
        flex: 1;
        justify-content: center;
      }
    }

    @media print {
      .dashboard {
        background: white;
      }

      .topbar-right,
      .quick-actions {
        display: none;
      }

      .panel,
      .stat-card,
      .till-card {
        box-shadow: none;
      }
    }
  `

  return (
    <>
      <style>{styles}</style>

      <main className="dashboard-page">
        <div className="dashboard-shell">

          {/* HEADER */}
          <header className="topbar">
            <div>
              <div className="greeting-eyebrow">
                TUE, AUG 11 · TILL 02 OPEN
              </div>

              <div className="greeting">
                Good afternoon, { (typeof user === 'object' && user && user.name) ? user.name : 'Maya' }
              </div>
            </div>

            <div className="topbar-right">

              <div className="search">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>

                <input
                  type="search"
                  placeholder="Search products, orders..."
                  aria-label="Search products or orders"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const q = e.target.value.trim()
                      if (q) navigate(`/products?q=${encodeURIComponent(q)}`)
                      else navigate('/products')
                    }
                  }}
                  style={{
                    border: 0,
                    outline: 'none',
                    background: 'transparent',
                    color: '#3d4740',
                    fontSize: 13,
                    width: '100%'
                  }}
                />
              </div>

              <button className="icon-btn">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                </svg>

                <span className="dot"></span>
              </button>

              <button
                className="primary-btn"
                onClick={() => navigate('/new-sale')}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>

                New Sale
              </button>

            </div>
          </header>

          {/* STATISTICS */}
          <section className="stat-grid">

            <div className="stat-card">
              <div className="stat-icon icon-green">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>

              <div className="stat-top">
                <div className="stat-label">
                  Inventory value
                </div>

                <div className="badge badge-up">
                  {totalProducts > 0 ? '+Live' : '—'}
                </div>
              </div>

              <div className="stat-value">
                GH₵ {totalInventoryValue.toFixed(2)}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-blue">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="9" cy="21" r="1.5" />
                  <circle cx="18" cy="21" r="1.5" />
                  <path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 7H6" />
                </svg>
              </div>

              <div className="stat-top">
                <div className="stat-label">
                  Total products
                </div>

                <div className="badge badge-up">
                  {totalProducts}
                </div>
              </div>

              <div className="stat-value">
                {totalProducts}
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-amber">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-4 4" />
                </svg>
              </div>

              <div className="stat-top">
                <div className="stat-label">
                  Average price
                </div>

                <div className="badge badge-down">
                  {products.length ? '' : '—'}
                </div>
              </div>

              <div className="stat-value">
                GH₵ {
                  (products.length
                    ? (products.reduce((s, p) => s + (p.price || 0), 0) / products.length).toFixed(2)
                    : '0.00')
                }
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon icon-red">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" />
                  <path d="M21 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" />
                  <path d="M21 8H3m4 4h4" />
                </svg>
              </div>

              <div className="stat-top">
                <div className="stat-label">
                  Low Stock Items
                </div>

                <div className="badge badge-down">
                  {lowStockCount} items
                </div>
              </div>

              <div className="stat-value">
                {lowStockCount}
              </div>
            </div>

          </section>

          {/* CONTENT */}
          <section className="content-grid">

            {/* LEFT */}
            <div className="main-column">

              {/* TOP SELLING */}
              <div className="panel">

                <div className="panel-head">
                  <div className="panel-title">
                    Top-selling products
                  </div>

                  <div className="time-toggle">
                    {['today', 'week', 'month'].map((t) => (
                      <button
                        key={t}
                        className={
                          'toggle-btn' +
                          (timeRange === t ? ' active' : '')
                        }
                        onClick={() => setTimeRange(t)}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <ol className="top-list">
                  {topList.map((product, index) => (
                    <li
                      className="top-item"
                      key={product.name}
                    >
                      <div className="top-rank">
                        {index + 1}
                      </div>

                      {product.imageUrl ? <img className="top-product-image" src={product.imageUrl} alt={product.name} /> : <div className="top-product-image" />}

                      <div className="top-name">
                        {product.name}
                      </div>

                      <div className="top-meta">
                        {product.units} sold ·{' '}
                        <span className="mono">
                        {money(product.revenue)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>

              </div>

              {/* SALES CHART */}
              <div className="panel">

                <div className="panel-head">
                  <div className="panel-title">
                    Sales this week
                  </div>

                  <a className="panel-link" href="#">
                    View report →
                  </a>
                </div>

                <div className="chart-panel-body">

                  <div className="chart">
                    {weeklySales.map((day) => (
                      <div className="bar-col" key={day.label}>
                        <div className={'bar' + (day.label === 'TODAY' ? ' today' : '')} style={{ height: `${Math.max((day.value / maxWeeklySales) * 100, day.value ? 4 : 0)}%` }} />
                        <div className="bar-label">{day.label}</div>
                      </div>
                    ))}
                    {weeklySales.length === -1 && <>

                    <div className="bar-col">
                      <div
                        className="bar"
                        style={{ height: '52%' }}
                      />
                      <div className="bar-label">
                        MON
                      </div>
                    </div>

                    <div className="bar-col">
                      <div
                        className="bar"
                        style={{ height: '68%' }}
                      />
                      <div className="bar-label">
                        TUE
                      </div>
                    </div>

                    <div className="bar-col">
                      <div
                        className="bar"
                        style={{ height: '44%' }}
                      />
                      <div className="bar-label">
                        WED
                      </div>
                    </div>

                    <div className="bar-col">
                      <div
                        className="bar"
                        style={{ height: '79%' }}
                      />
                      <div className="bar-label">
                        THU
                      </div>
                    </div>

                    <div className="bar-col">
                      <div
                        className="bar"
                        style={{ height: '61%' }}
                      />
                      <div className="bar-label">
                        FRI
                      </div>
                    </div>

                    <div className="bar-col">
                      <div
                        className="bar"
                        style={{ height: '35%' }}
                      />
                      <div className="bar-label">
                        SAT
                      </div>
                    </div>

                    <div className="bar-col">
                      <div
                        className="bar today"
                        style={{ height: '88%' }}
                      />
                      <div className="bar-label">
                        TODAY
                      </div>
                    </div>

                    </>}
                  </div>

                </div>

              </div>

              {/* TRANSACTIONS */}
              <div className="panel">

                <div className="panel-head">
                  <div className="panel-title">
                    Recent transactions
                  </div>

                  <a className="panel-link" href="#">
                    View all →
                  </a>
                </div>

                <div className="table-wrap">

                  <table>
                    <thead>
                      <tr>
                        <th>Order</th>
                        <th>Cashier</th>
                        <th>Payment</th>
                        <th>Time</th>
                        <th style={{ textAlign: 'right' }}>
                          Amount
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {sales.slice(0, 5).map((sale) => {
                        const createdAt = new Date(sale.createdAt)
                        const cashier = sale.cashier?.name || 'Cashier'
                        return (
                          <tr key={sale._id}>
                            <td className="txn-id">#{sale._id.slice(-6).toUpperCase()}</td>
                            <td>{cashier}</td>
                            <td><span className={`pill pill-${(sale.paymentMethod || 'cash').toLowerCase()}`}>{sale.paymentMethod}</span></td>
                            <td>{createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="txn-amount" style={{ textAlign: 'right' }}>{money(sale.total)}</td>
                          </tr>
                        )
                      })}
                      {sales.length === -1 && <>

                      <tr>
                        <td className="txn-id">#0241</td>
                        <td>Maya A.</td>
                        <td>
                          <span className="pill pill-card">
                            Card
                          </span>
                        </td>
                        <td>2:14 PM</td>
                        <td
                          className="txn-amount"
                          style={{ textAlign: 'right' }}
                        >
                          GH₵ 148.00
                        </td>
                      </tr>

                      <tr>
                        <td className="txn-id">#0240</td>
                        <td>Kojo B.</td>
                        <td>
                          <span className="pill pill-cash">
                            Cash
                          </span>
                        </td>
                        <td>1:52 PM</td>
                        <td
                          className="txn-amount"
                          style={{ textAlign: 'right' }}
                        >
                          GH₵ 32.50
                        </td>
                      </tr>

                      <tr>
                        <td className="txn-id">#0239</td>
                        <td>Maya A.</td>
                        <td>
                          <span className="pill pill-mobile">
                            Mobile
                          </span>
                        </td>
                        <td>1:38 PM</td>
                        <td
                          className="txn-amount"
                          style={{ textAlign: 'right' }}
                        >
                          GH₵ 91.20
                        </td>
                      </tr>

                      <tr>
                        <td className="txn-id">#0238</td>
                        <td>Kojo B.</td>
                        <td>
                          <span className="pill pill-cash">
                            Cash
                          </span>
                        </td>
                        <td>1:05 PM</td>
                        <td
                          className="txn-amount"
                          style={{ textAlign: 'right' }}
                        >
                          GH₵ 15.00
                        </td>
                      </tr>

                      <tr>
                        <td className="txn-id">#0237</td>
                        <td>Maya A.</td>
                        <td>
                          <span className="pill pill-card">
                            Card
                          </span>
                        </td>
                        <td>12:47 PM</td>
                        <td
                          className="txn-amount"
                          style={{ textAlign: 'right' }}
                        >
                          GH₵ 210.75
                        </td>
                      </tr>

                      </>}
                    </tbody>
                  </table>

                </div>

              </div>

            </div>

            {/* RIGHT */}
            <div className="side-column">

              {/* TILL */}
              <div className="till-card">

                <div className="receipt-eyebrow">
                  Today's Till
                </div>

                <div className="receipt-title">
                  Summary · Till 02
                </div>

                <div className="receipt-line"><span>Cash sales (live)</span><span>{money(todayTotals.Cash)}</span></div>
                <div className="receipt-line"><span>Card sales (live)</span><span>{money(todayTotals.Card)}</span></div>
                <div className="receipt-line"><span>Mobile money (live)</span><span>{money(todayTotals.Mobile)}</span></div>
                <div className="receipt-line"><span>Today's revenue</span><span>{money(todayTotals.Cash + todayTotals.Card + todayTotals.Mobile)}</span></div>
                {todaySales.length === -1 && <>
                <div className="receipt-line">
                  <span title={money(todayTotals.Cash)}>Cash sales</span>
                  <span>GH₵ 1,410.00</span>
                </div>

                <div className="receipt-line">
                  <span>Card sales</span>
                  <span>GH₵ 2,106.00</span>
                </div>

                <div className="receipt-line">
                  <span>Mobile money</span>
                  <span>GH₵ 770.00</span>
                </div>

                <div className="receipt-line">
                  <span>Discounts given</span>
                  <span>−GH₵ 84.50</span>
                </div>

                <div className="receipt-line">
                  <span>Total units</span>
                  <span>{totalUnits}</span>
                </div>

                <div className="receipt-total">
                  <span>Inventory value</span>
                  <span>GH₵ {totalInventoryValue.toFixed(2)}</span>
                </div>

                </>}
              </div>

              {/* LOW STOCK */}
              <div className="panel">

                <div className="panel-head">
                  <div className="panel-title">
                    Low stock alerts
                  </div>

                  <a className="panel-link" href="#">
                    Restock →
                  </a>
                </div>

                <div className="stock-list">

                    {lowStockItems.length === 0 ? (
                      <div style={{ padding: 12, color: '#7b8578' }}>No low stock items</div>
                    ) : (
                      lowStockItems.slice(0, 6).map((p) => (
                        <div className="stock-row" key={p._id}>
                          <div>
                            <div className="stock-name">{p.name}</div>
                            <div className="stock-sku">{p.sku}</div>
                          </div>

                          <div className="stock-qty">{p.stock} left</div>
                        </div>
                      ))
                    )}

                </div>

              </div>

              {/* QUICK ACTIONS */}
              <div className="panel">

                <div className="panel-head">
                  <div className="panel-title">
                    Quick actions
                  </div>
                </div>

                <div className="quick-actions">

                  <button
                    className="qa-btn"
                    onClick={() => handleQuick('add')}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="16"
                        rx="2"
                      />
                      <path d="M3 9h18M8 4v16" />
                    </svg>

                    Add new product
                  </button>

                  <button
                    className="qa-btn"
                    onClick={() => handleQuick('adjust')}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2" />
                      <path d="M21 8v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8" />
                      <path d="M21 8H3m4 4h4" />
                    </svg>

                    Adjust stock manually
                  </button>

                  <button
                    className="qa-btn"
                    onClick={() => handleQuick('new')}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 3v18h18" />
                      <path d="M18 17V9M13 17V5M8 17v-4" />
                    </svg>

                    Start new sale
                  </button>

                  <button
                    className="qa-btn"
                    onClick={() => handleQuick('export')}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M6 9V4h12v5" />
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                      <path d="M6 14h12v7H6z" />
                    </svg>

                    Export / print today's report
                  </button>

                  <button
                    className="qa-btn"
                    onClick={() => handleQuick('till')}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                    </svg>

                    Open / close till
                  </button>

                </div>

              </div>

            </div>

          </section>

        </div>
      </main>
    </>
  )
}
