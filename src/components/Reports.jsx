/* eslint-disable no-unused-vars */
import { useEffect, useMemo, useState } from 'react'
import '../styles/report.css'

const REPORTS = [
  {
    title: 'Total sales',
    value: 'GH₵ 15,860',
    change: '+12.2%',
    type: 'up',
    description: 'vs previous period',
  },
  {
    title: 'Today’s sales',
    value: 'GH₵ 3,520',
    change: '+8.9%',
    type: 'up',
    description: 'vs yesterday',
  },
  {
    title: 'Gross profit',
    value: 'GH₵ 5,960',
    change: '+6.4%',
    type: 'up',
    description: '37.6% margin',
  },
  {
    title: 'Refunds',
    value: 'GH₵ 334',
    change: '-0.3%',
    type: 'down',
    description: '2.1% refund rate',
  },
]

const CHART_ROWS = [
  { label: 'Monday', value: 48, amount: 2180 },
  { label: 'Tuesday', value: 64, amount: 2940 },
  { label: 'Wednesday', value: 72, amount: 3270 },
  { label: 'Thursday', value: 58, amount: 2650 },
  { label: 'Friday', value: 84, amount: 3860 },
  { label: 'Saturday', value: 91, amount: 4180 },
  { label: 'Sunday', value: 67, amount: 3080 },
]

const TRANSACTIONS = [
  {
    id: 'TXN-1001',
    customer: 'Faith Appiah',
    amount: 150,
    method: 'Cash',
    status: 'Completed',
    time: '10:42 AM',
  },
  {
    id: 'TXN-1002',
    customer: 'Mark Mensah',
    amount: 72,
    method: 'Card',
    status: 'Completed',
    time: '11:18 AM',
  },
  {
    id: 'TXN-1003',
    customer: 'Esi Nkansah',
    amount: 42,
    method: 'Mobile',
    status: 'Refunded',
    time: '12:06 PM',
  },
  {
    id: 'TXN-1004',
    customer: 'Kwame Boateng',
    amount: 320,
    method: 'Cash',
    status: 'Completed',
    time: '1:25 PM',
  },
  {
    id: 'TXN-1005',
    customer: 'Ama Serwaa',
    amount: 185,
    method: 'Mobile',
    status: 'Completed',
    time: '2:14 PM',
  },
]

const CHANNELS = [
  {
    name: 'Cash',
    description: 'In-store payments',
    amount: 8340,
    percentage: 53,
  },
  {
    name: 'Card',
    description: 'POS terminal',
    amount: 5760,
    percentage: 36,
  },
  {
    name: 'Mobile',
    description: 'Mobile money',
    amount: 1760,
    percentage: 11,
  },
]

const PRODUCTS = [
  {
    name: 'Jollof Rice (Large)',
    category: 'Food',
    units: 86,
    revenue: 946,
  },
  {
    name: 'Chicken Wings',
    category: 'Food',
    units: 52,
    revenue: 832,
  },
  {
    name: 'Bottled Water 500ml',
    category: 'Drinks',
    units: 148,
    revenue: 740,
  },
  {
    name: 'Fresh Bread',
    category: 'Food',
    units: 62,
    revenue: 310,
  },
]

const formatMoney = (amount) =>
  `GH₵ ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

export default function Reports() {
  const [period, setPeriod] = useState('This week')
  const [paymentFilter, setPaymentFilter] = useState('All')
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const token = localStorage.getItem('posToken')
        const [salesResponse, productsResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/sales?limit=500`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch(`${import.meta.env.VITE_API_URL}/api/products`),
        ])
        if (salesResponse.ok) setSales(await salesResponse.json())
        if (productsResponse.ok) setProducts(await productsResponse.json())
      } catch (error) {
        console.error('Reports:', error)
      }
    }
    loadReportData()
  }, [])

  const periodStart = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    if (period === 'This week') start.setDate(now.getDate() - 6)
    if (period === 'This month') start.setMonth(now.getMonth() - 1)
    if (period === 'This quarter') start.setMonth(now.getMonth() - 3)
    if (period === 'This year') start.setFullYear(now.getFullYear() - 1)
    return start
  }, [period])
  const periodSales = useMemo(() => sales.filter((sale) => new Date(sale.createdAt) >= periodStart), [sales, periodStart])
  const totalRevenue = periodSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0)
  const productById = new Map(products.map((product) => [String(product._id || product.id), product]))
  const totalCost = periodSales.reduce((sum, sale) => sum + sale.items.reduce((itemsTotal, item) => {
    const product = productById.get(String(item.product))
    return itemsTotal + (Number(product?.cost) || 0) * (Number(item.quantity) || 0)
  }, 0), 0)
  const totalDiscounts = periodSales.reduce((sum, sale) => sum + (Number(sale.discount) || 0), 0)
  const REPORTS = [
    { title: 'Total sales', value: formatMoney(totalRevenue), change: `${periodSales.length} sales`, type: 'up', description: `During ${period.toLowerCase()}` },
    { title: 'Today’s sales', value: formatMoney(sales.filter((sale) => new Date(sale.createdAt).toDateString() === new Date().toDateString()).reduce((sum, sale) => sum + (Number(sale.total) || 0), 0)), change: 'Live', type: 'up', description: 'Completed today' },
    { title: 'Gross profit', value: formatMoney(totalRevenue - totalCost), change: totalRevenue ? `${((totalRevenue - totalCost) / totalRevenue * 100).toFixed(1)}%` : '0.0%', type: 'up', description: 'Revenue less product cost' },
    { title: 'Discounts', value: formatMoney(totalDiscounts), change: `${periodSales.filter((sale) => Number(sale.discount) > 0).length} sales`, type: 'down', description: 'Discounts given' },
  ]
  const CHART_ROWS = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date()
      date.setHours(0, 0, 0, 0)
      date.setDate(date.getDate() - (6 - index))
      const amount = sales.filter((sale) => new Date(sale.createdAt).toDateString() === date.toDateString()).reduce((sum, sale) => sum + (Number(sale.total) || 0), 0)
      return { label: date.toLocaleDateString('en-US', { weekday: 'long' }), amount }
    })
    const maximum = Math.max(...days.map((day) => day.amount), 1)
    return days.map((day) => ({ ...day, value: (day.amount / maximum) * 100 }))
  }, [sales])
  const CHANNELS = ['Cash', 'Card', 'Mobile'].map((name) => {
    const amount = periodSales.filter((sale) => sale.paymentMethod === name).reduce((sum, sale) => sum + (Number(sale.total) || 0), 0)
    return { name, description: `${name} payments`, amount, percentage: totalRevenue ? Math.round(amount / totalRevenue * 100) : 0 }
  })
  const PRODUCTS = useMemo(() => {
    const grouped = new Map()
    periodSales.forEach((sale) => sale.items.forEach((item) => {
      const current = grouped.get(item.name) || { name: item.name, category: productById.get(String(item.product))?.category || 'Uncategorized', units: 0, revenue: 0 }
      current.units += Number(item.quantity) || 0
      current.revenue += (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)
      grouped.set(item.name, current)
    }))
    return [...grouped.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 4)
  }, [periodSales, products])

  const filteredTransactions = useMemo(() => {
    return periodSales.map((sale) => ({
      id: sale._id,
      customer: sale.customer || 'Walk-in customer',
      amount: Number(sale.total) || 0,
      method: sale.paymentMethod || 'Cash',
      status: 'Completed',
      time: new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    })).filter((transaction) => paymentFilter === 'All' || transaction.method === paymentFilter)
  }, [paymentFilter, periodSales])

  return (
    <main className="reports-page">

      {/* HEADER */}
      <section className="reports-header">

        <div>
          <div className="reports-eyebrow">
            BUSINESS ANALYTICS
          </div>

          <h1>Reports</h1>

          <p>
            Track sales, revenue, profit and business performance.
          </p>
        </div>

        <div className="reports-header-actions">

          <select
            className="reports-period"
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option>This week</option>
            <option>This month</option>
            <option>This quarter</option>
            <option>This year</option>
          </select>

          <button
            className="reports-print-btn"
            type="button"
            onClick={() => window.print()}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M6 9V2h12v7" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <path d="M6 14h12v8H6z" />
            </svg>

            Print report
          </button>

        </div>

      </section>


      {/* SUMMARY CARDS */}
      <section className="reports-summary">

        {REPORTS.map((report, index) => (

          <div className="report-stat-card" key={report.title}>

            <div className="report-stat-top">

              <span className="report-stat-title">
                {report.title}
              </span>

              <span
                className={`report-change ${
                  report.type === 'up'
                    ? 'report-change-up'
                    : 'report-change-down'
                }`}
              >
                {report.type === 'up' ? '↑' : '↓'} {report.change}
              </span>

            </div>

            <div className="report-stat-value">
              {report.value}
            </div>

            <div className="report-stat-description">
              {report.description}
            </div>

          </div>

        ))}

      </section>


      {/* ANALYTICS GRID */}
      <section className="reports-main-grid">

        {/* SALES CHART */}
        <div className="reports-panel sales-chart-panel">

          <div className="reports-panel-header">

            <div>
              <div className="reports-panel-eyebrow">
                SALES TREND
              </div>

              <h2>Revenue overview</h2>

              <p>
                Sales performance for {period.toLowerCase()}.
              </p>
            </div>

            <div className="chart-total">
              <span>Total revenue</span>
              <strong>{formatMoney(totalRevenue)}</strong>
            </div>

          </div>


          <div className="sales-chart">

            <div className="chart-y-axis">
              <span>5k</span>
              <span>4k</span>
              <span>3k</span>
              <span>2k</span>
              <span>1k</span>
              <span>0</span>
            </div>

            <div className="chart-area">

              <div className="chart-grid-lines">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <div className="chart-bars">

                {CHART_ROWS.map((row) => (

                  <div
                    className="report-bar-column"
                    key={row.label}
                  >

                    <div className="report-bar-wrapper">

                      <div
                        className="report-bar"
                        style={{
                          height: `${row.value}%`,
                        }}
                        title={`${formatMoney(row.amount)}`}
                      >
                        <span className="report-bar-tooltip">
                          {formatMoney(row.amount)}
                        </span>
                      </div>

                    </div>

                    <span className="report-bar-label">
                      {row.label.slice(0, 3)}
                    </span>

                  </div>

                ))}

              </div>

            </div>

          </div>

        </div>


        {/* PAYMENT CHANNELS */}
        <aside className="reports-panel channel-panel">

          <div className="reports-panel-eyebrow">
            PAYMENT BREAKDOWN
          </div>

          <h2>Revenue by channel</h2>

          <p className="channel-subtitle">
            How customers are paying.
          </p>


          <div className="channel-total">
            <span>Total</span>
            <strong>{formatMoney(totalRevenue)}</strong>
          </div>


          <div className="channel-list">

            {CHANNELS.map((channel) => (

              <div className="channel-item" key={channel.name}>

                <div className="channel-item-top">

                  <div className="channel-name-wrapper">

                    <span
                      className={`channel-icon channel-${channel.name.toLowerCase()}`}
                    >
                      {channel.name === 'Cash'
                        ? '₵'
                        : channel.name === 'Card'
                        ? '▣'
                        : 'M'}
                    </span>

                    <div>
                      <strong>{channel.name}</strong>
                      <span>{channel.description}</span>
                    </div>

                  </div>

                  <div className="channel-amount">
                    {formatMoney(channel.amount)}
                  </div>

                </div>


                <div className="channel-progress">

                  <div
                    style={{
                      width: `${channel.percentage}%`,
                    }}
                  />

                </div>


                <div className="channel-percentage">
                  {channel.percentage}% of total revenue
                </div>

              </div>

            ))}

          </div>

        </aside>

      </section>


      {/* LOWER GRID */}
      <section className="reports-lower-grid">

        {/* TRANSACTIONS */}
        <div className="reports-panel transactions-panel">

          <div className="reports-panel-header">

            <div>
              <div className="reports-panel-eyebrow">
                TRANSACTIONS
              </div>

              <h2>Recent transactions</h2>

              <p>
                Latest sales processed by your business.
              </p>
            </div>

            <div className="transaction-actions">

              <select
                value={paymentFilter}
                onChange={(event) =>
                  setPaymentFilter(event.target.value)
                }
              >
                <option value="All">All payments</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Mobile">Mobile</option>
              </select>

              <button type="button">
                Export
              </button>

            </div>

          </div>


          <div className="reports-table-wrapper">

            <table className="reports-table">

              <thead>
                <tr>
                  <th>TRANSACTION</th>
                  <th>CUSTOMER</th>
                  <th>AMOUNT</th>
                  <th>PAYMENT</th>
                  <th>TIME</th>
                  <th>STATUS</th>
                </tr>
              </thead>

              <tbody>

                {filteredTransactions.map((transaction) => (

                  <tr key={transaction.id}>

                    <td>
                      <span className="transaction-id">
                        {transaction.id}
                      </span>
                    </td>

                    <td>

                      <div className="customer-cell">

                        <div className="customer-avatar">
                          {transaction.customer
                            .split(' ')
                            .map((name) => name[0])
                            .join('')
                            .slice(0, 2)}
                        </div>

                        <span>
                          {transaction.customer}
                        </span>

                      </div>

                    </td>

                    <td>
                      <strong className="transaction-amount">
                        {formatMoney(transaction.amount)}
                      </strong>
                    </td>

                    <td>

                      <span
                        className={`payment-pill payment-${transaction.method.toLowerCase()}`}
                      >
                        {transaction.method}
                      </span>

                    </td>

                    <td>
                      <span className="transaction-time">
                        {transaction.time}
                      </span>
                    </td>

                    <td>

                      <span
                        className={`transaction-status ${
                          transaction.status === 'Completed'
                            ? 'status-completed'
                            : 'status-refunded'
                        }`}
                      >
                        <span />
                        {transaction.status}
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </div>


        {/* BEST SELLING PRODUCTS */}
        <aside className="reports-panel products-panel">

          <div className="reports-panel-eyebrow">
            PRODUCT PERFORMANCE
          </div>

          <h2>Top selling products</h2>

          <p className="products-subtitle">
            Products generating the most sales.
          </p>


          <div className="top-products">

            {PRODUCTS.map((product, index) => (

              <div
                className="top-product"
                key={product.name}
              >

                <div className="product-rank">
                  {String(index + 1).padStart(2, '0')}
                </div>

                <div className="top-product-info">

                  <strong>
                    {product.name}
                  </strong>

                  <span>
                    {product.category} · {product.units} units sold
                  </span>

                </div>

                <div className="top-product-revenue">
                  {formatMoney(product.revenue)}
                </div>

              </div>

            ))}

          </div>


          <button className="view-products-button">
            View product report
            <span>→</span>
          </button>

        </aside>

      </section>

    </main>
  )
}
