import { useEffect, useMemo, useState } from 'react'
import '../styles/report.css'
import { useLiveQuery } from 'dexie-react-hooks'
import { posDb } from '../data/posDb'
import { syncPosData } from '../data/sync'

const HISTORY = [
  {
    id: 'TXN-2001',
    customer: 'Nana Yeboah',
    amount: 125,
    method: 'Cash',
    status: 'Completed',
    date: '2026-08-10',
    time: '09:18 AM',
  },
  {
    id: 'TXN-2002',
    customer: 'Akosua Mensah',
    amount: 78,
    method: 'Card',
    status: 'Completed',
    date: '2026-08-10',
    time: '09:42 AM',
  },
  {
    id: 'TXN-2003',
    customer: 'Kofi Boateng',
    amount: 42,
    method: 'Mobile',
    status: 'Refunded',
    date: '2026-08-10',
    time: '10:05 AM',
  },
  {
    id: 'TXN-2004',
    customer: 'Ama Adu',
    amount: 215,
    method: 'Cash',
    status: 'Completed',
    date: '2026-08-10',
    time: '10:38 AM',
  },
  {
    id: 'TXN-2005',
    customer: 'Kojo Darko',
    amount: 96,
    method: 'Card',
    status: 'Completed',
    date: '2026-08-10',
    time: '11:25 AM',
  },
  {
    id: 'TXN-2006',
    customer: 'Esi Frimpong',
    amount: 52,
    method: 'Mobile',
    status: 'Completed',
    date: '2026-08-09',
    time: '04:12 PM',
  },
  {
    id: 'TXN-2007',
    customer: 'Yaw Owusu',
    amount: 142,
    method: 'Cash',
    status: 'Completed',
    date: '2026-08-09',
    time: '02:05 PM',
  },
  {
    id: 'TXN-2008',
    customer: 'Abena Osei',
    amount: 36,
    method: 'Card',
    status: 'Refunded',
    date: '2026-08-09',
    time: '01:07 PM',
  },
]

const formatMoney = (amount) =>
  `GH₵ ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const getPaymentClass = (method) => {
  if (method === 'Cash') return 'payment-cash'
  if (method === 'Card') return 'payment-card'
  return 'payment-mobile'
}

const getStatusClass = (status) =>
  status === 'Completed' ? 'status-completed' : 'status-refunded'

export default function SaleHistory() {
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('All')
  const [periodFilter, setPeriodFilter] = useState('Today')
  const userId = (() => { try { const user = JSON.parse(localStorage.getItem('posUser') || '{}'); return String(user.id || user._id || '') } catch { return '' } })()
  const sales = useLiveQuery(() => userId ? posDb.sales.where('userId').equals(userId).toArray() : [], [userId], [])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('posToken')
    if (userId && token) syncPosData({ userId, token })
  }, [userId])

  const filteredHistory = useMemo(() => {
    const query = search.trim().toLowerCase()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(startOfWeek.getDate() - 6)
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const startOfYear = new Date(today.getFullYear(), 0, 1)

    return sales.map((sale) => {
      const createdAt = new Date(sale.createdAt)
      return {
        id: String(sale._id || sale.serverId || sale.clientRequestId || sale.localId),
        customer: sale.customer || 'Walk-in customer',
        amount: Number(sale.total) || 0,
        method: sale.paymentMethod || 'Cash',
        status: 'Completed',
        date: createdAt.toLocaleDateString(),
        time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt,
      }
    }).filter((entry) => {
      const matchesSearch =
        entry.id.toLowerCase().includes(query) ||
        entry.customer.toLowerCase().includes(query) ||
        entry.date.toLowerCase().includes(query)

      const matchesMethod =
        methodFilter === 'All' || entry.method === methodFilter

      const matchesPeriod =
        periodFilter === 'All' ||
        (periodFilter === 'Today' && entry.createdAt >= today) ||
        (periodFilter === 'This week' && entry.createdAt >= startOfWeek) ||
        (periodFilter === 'This month' && entry.createdAt >= startOfMonth) ||
        (periodFilter === 'This year' && entry.createdAt >= startOfYear)

      return matchesSearch && matchesMethod && matchesPeriod
    })
  }, [search, methodFilter, periodFilter, sales])

  const totalSales = filteredHistory.reduce(
    (sum, entry) => sum + entry.amount,
    0
  )
  const totalTransactions = filteredHistory.length
  const refunds = filteredHistory.filter((entry) => entry.status === 'Refunded').length
  const avgTicket = totalTransactions ? totalSales / totalTransactions : 0

  return (
    <main className="reports-page">
      <section className="reports-header">
        <div>
          <div className="reports-eyebrow">SALES HISTORY</div>
          <h1>Sale history</h1>
          <p>Review each transaction, filter by payment type, and track refunds.</p>
        </div>

        <div className="reports-header-actions">
          <select
            className="reports-period"
            value={periodFilter}
            onChange={(event) => setPeriodFilter(event.target.value)}
          >
            <option value="Today">Today</option>
            <option value="This week">This week</option>
            <option value="This month">This month</option>
            <option value="This year">This year</option>
            <option value="All">All</option>
          </select>

          <input
            className="reports-period"
            type="search"
            placeholder="Search transaction, customer, date"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            className="reports-period"
            value={methodFilter}
            onChange={(event) => setMethodFilter(event.target.value)}
          >
            <option value="All">All methods</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Mobile">Mobile</option>
          </select>

          <button
            className="reports-print-btn"
            type="button"
            onClick={() => window.print()}
          >
            Print history
          </button>
        </div>
      </section>

      <section className="reports-summary">
        <div className="report-stat-card">
          <div className="report-stat-top">
            <span className="report-stat-title">Total revenue</span>
            <span className="report-change report-change-up">{totalTransactions ? '+8.9%' : '0.0%'}</span>
          </div>
          <div className="report-stat-value">{formatMoney(totalSales)}</div>
          <div className="report-stat-description">{totalTransactions} transactions</div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-top">
            <span className="report-stat-title">Transactions</span>
            <span className="report-change report-change-up">{totalTransactions || 0}</span>
          </div>
          <div className="report-stat-value">{totalTransactions}</div>
          <div className="report-stat-description">Entries shown</div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-top">
            <span className="report-stat-title">Refunds</span>
            <span className="report-change report-change-down">-{refunds}</span>
          </div>
          <div className="report-stat-value">{refunds}</div>
          <div className="report-stat-description">Refunded sales</div>
        </div>

        <div className="report-stat-card">
          <div className="report-stat-top">
            <span className="report-stat-title">Average ticket</span>
            <span className="report-change report-change-up">{totalTransactions ? '+2.1%' : '0.0%'}</span>
          </div>
          <div className="report-stat-value">{formatMoney(avgTicket)}</div>
          <div className="report-stat-description">Average sale value</div>
        </div>
      </section>

      <section className="reports-lower-grid">
        <div className="reports-panel transactions-panel">
          <div className="reports-panel-header">
            <div>
              <div className="reports-panel-eyebrow">Transaction log</div>
              <h2>Recent sales activity</h2>
            </div>
            <div className="transaction-actions">
              <select
                value={methodFilter}
                onChange={(event) => setMethodFilter(event.target.value)}
              >
                <option value="All">Filter by payment</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Mobile">Mobile</option>
              </select>
              <button type="button" onClick={() => setSearch('')}>Clear</button>
            </div>
          </div>

          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Transaction</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((entry) => (
                  <tr key={entry.id}>
                    <td className="transaction-id">#{entry.id.slice(-6).toUpperCase()}</td>
                    <td className="customer-cell">
                      <div className="customer-avatar">{entry.customer.split(' ').map((word) => word[0]).join('').slice(0, 2)}</div>
                      <span>{entry.customer}</span>
                    </td>
                    <td className="transaction-amount">{formatMoney(entry.amount)}</td>
                    <td>
                      <span className={`payment-pill ${getPaymentClass(entry.method)}`}>
                        {entry.method}
                      </span>
                    </td>
                    <td>
                      <span className={`transaction-status ${getStatusClass(entry.status)}`}>
                        <span />
                        {entry.status}
                      </span>
                    </td>
                    <td className="transaction-time">{entry.date} · {entry.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="reports-panel products-panel">
          <div className="reports-panel-header">
            <div>
              <div className="reports-panel-eyebrow">Snapshot</div>
              <h2>Sales by payment type</h2>
            </div>
          </div>
          <div className="channel-panel">
            <div className="channel-list">
              {['Cash', 'Card', 'Mobile'].map((method) => {
                const amount = filteredHistory
                  .filter((entry) => entry.method === method)
                  .reduce((sum, entry) => sum + entry.amount, 0)
                const percentage = totalSales ? Math.round((amount / totalSales) * 100) : 0
                return (
                  <div className="channel-item" key={method}>
                    <div className="channel-item-top">
                      <div className="channel-name-wrapper">
                        <div className={`channel-icon channel-${method.toLowerCase()}`}>
                          {method[0]}
                        </div>
                        <div>
                          <strong>{method}</strong>
                          <span>{percentage}% of revenue</span>
                        </div>
                      </div>
                      <div className="channel-amount">{formatMoney(amount)}</div>
                    </div>
                    <div className="channel-progress">
                      <div style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
