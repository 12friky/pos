import { useEffect, useMemo, useState } from 'react'
import '../styles/inventory.css'

const stockStatus = (stock, minStock) => {
  if (stock === 0) {
    return {
      label: 'Out of stock',
      tone: 'danger',
      percentage: 0,
    }
  }

  if (stock <= minStock) {
    return {
      label: 'Low stock',
      tone: 'warning',
      percentage: Math.min((stock / (minStock * 2)) * 100, 100),
    }
  }

  return {
    label: 'In stock',
    tone: 'success',
    percentage: Math.min((stock / (minStock * 3)) * 100, 100),
  }
}

const formatMoney = (amount) =>
  `GH₵ ${amount.toLocaleString('en-GH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

const getInitials = (name) => {
  return name
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

export default function Inventory() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')

  const loadProducts = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/products`)
      if (!response.ok) throw new Error('Unable to load inventory')
      setProducts(await response.json())
    } catch (error) {
      console.error('Inventory:', error)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadProducts() }, [])

  const restockProduct = async (product) => {
    const amount = window.prompt(`Add stock for ${product.name}. Quantity to add:`, String(Math.max(Number(product.minStock) || 1, 1)))
    if (amount === null) return
    const quantity = Number(amount)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setActionError('Enter a restock quantity greater than zero.')
      return
    }
    try {
      const token = localStorage.getItem('posToken')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/products/${product._id || product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stock: Number(product.stock || 0) + quantity }),
      })
      const updated = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(updated.message || 'Unable to restock product')
      setProducts((current) => current.map((item) => (item._id || item.id) === (updated._id || updated.id) ? updated : item))
      setActionError('')
    } catch (error) {
      setActionError(error.message || 'Unable to restock product')
    }
  }

  const categories = ['All', ...new Set(products.map((item) => item.category).filter(Boolean))]

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query)

      const matchesCategory =
        filter === 'All' || product.category === filter

      const status = stockStatus(product.stock, product.minStock)

      const matchesStatus =
        statusFilter === 'All' || status.label === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [search, filter, statusFilter, products])

  const totalSKUs = products.length

  const lowStock = products.filter(
    (product) =>
      product.stock > 0 && product.stock <= product.minStock
  ).length

  const outOfStock = products.filter(
    (product) => product.stock === 0
  ).length

  const totalUnits = products.reduce(
    (sum, product) => sum + product.stock,
    0
  )

  const inventoryValue = products.reduce(
    (sum, product) => sum + product.stock * product.cost,
    0
  )

  const healthyStock = products.filter(
    (product) => product.stock > product.minStock
  ).length

  const stockHealth =
    totalSKUs > 0
      ? Math.round((healthyStock / totalSKUs) * 100)
      : 0

  const restockItems = products.filter(
    (item) => item.stock <= item.minStock
  )

  return (
    <main className="inventory-page">

      {/* HEADER */}
      <section className="inventory-header">

        <div>
          <div className="inventory-eyebrow">
            INVENTORY MANAGEMENT
          </div>

          <h1>Inventory</h1>

          <p>
            Monitor stock levels, inventory value and restocking needs.
          </p>
        </div>

        <div className="inventory-header-actions">

          <div className="inventory-search">
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
              placeholder="Search products or SKU..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <button
            className="inventory-refresh"
            type="button"
            onClick={() => {
              setSearch('')
              setFilter('All')
              setStatusFilter('All')
              loadProducts()
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20 11a8.1 8.1 0 0 0-15.5-3" />
              <path d="M4 4v4h4" />
              <path d="M4 13a8.1 8.1 0 0 0 15.5 3" />
              <path d="M20 20v-4h-4" />
            </svg>

            Reset
          </button>

          <button className="inventory-primary-btn">
            <span>+</span>
            Add Stock
          </button>

        </div>
      </section>


      {/* SUMMARY CARDS */}
      {actionError && <p style={{ color: '#a5332b', padding: '0 0 14px' }}>{actionError}</p>}
      <section className="inventory-stats">

        <div className="inventory-stat-card">

          <div className="inventory-stat-icon inventory-icon-green">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M4 19V5" />
              <path d="M4 19h16" />
              <path d="M8 16v-5" />
              <path d="M12 16V7" />
              <path d="M16 16v-8" />
            </svg>
          </div>

          <div>
            <span className="inventory-stat-label">
              Total products
            </span>

            <strong>{totalSKUs}</strong>

            <small>
              {totalUnits} total units in stock
            </small>
          </div>

        </div>


        <div className="inventory-stat-card">

          <div className="inventory-stat-icon inventory-icon-warning">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3 2.5 20h19L12 3Z" />
              <path d="M12 9v5" />
              <path d="M12 17h.01" />
            </svg>
          </div>

          <div>
            <span className="inventory-stat-label">
              Low stock
            </span>

            <strong>{lowStock}</strong>

            <small className="warning-text">
              Needs attention
            </small>
          </div>

        </div>


        <div className="inventory-stat-card">

          <div className="inventory-stat-icon inventory-icon-danger">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="m9 9 6 6" />
              <path d="m15 9-6 6" />
            </svg>
          </div>

          <div>
            <span className="inventory-stat-label">
              Out of stock
            </span>

            <strong>{outOfStock}</strong>

            <small>
              Products unavailable
            </small>
          </div>

        </div>


        <div className="inventory-stat-card inventory-value-card">

          <div className="inventory-stat-icon inventory-icon-money">
            ₵
          </div>

          <div>
            <span className="inventory-stat-label">
              Inventory value
            </span>

            <strong>
              {formatMoney(inventoryValue)}
            </strong>

            <small>
              Based on current cost
            </small>
          </div>

        </div>

      </section>


      {/* MAIN CONTENT */}
      <section className="inventory-layout">

        {/* LEFT */}
        <div className="inventory-main-panel">

          <div className="inventory-panel-header">

            <div>
              <h2>Current stock</h2>
              <p>
                {filteredProducts.length} products displayed
              </p>
            </div>

            <div className="inventory-filters">

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(event.target.value)
                }
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="All">All status</option>
                <option value="In stock">In stock</option>
                <option value="Low stock">Low stock</option>
                <option value="Out of stock">Out of stock</option>
              </select>

            </div>

          </div>


          {/* TABLE */}
          <div className="inventory-table-wrapper">

            <table className="inventory-table">

              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>CATEGORY</th>
                  <th>STOCK LEVEL</th>
                  <th>UNIT COST</th>
                  <th>STATUS</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>

                {filteredProducts.map((product) => {

                  const status = stockStatus(
                    product.stock,
                    product.minStock
                  )

                  return (
                    <tr key={product._id || product.id}>

                      <td>

                        <div className="inventory-product">

                          <div className="product-avatar">
                            {getInitials(product.name)}
                          </div>

                          <div>
                            <div className="product-name">
                              {product.name}
                            </div>

                            <div className="product-sku">
                              {product.sku}
                            </div>
                          </div>

                        </div>

                      </td>


                      <td>

                        <span className="category-badge">
                          {product.category}
                        </span>

                      </td>


                      <td>

                        <div className="stock-level">

                          <div className="stock-number">
                            <strong>
                              {product.stock}
                            </strong>

                            <span>
                              / min {product.minStock}
                            </span>
                          </div>

                          <div className="stock-progress">
                            <div
                              className={`stock-progress-fill ${status.tone}`}
                              style={{
                                width: `${status.percentage}%`,
                              }}
                            />
                          </div>

                        </div>

                      </td>


                      <td>

                        <span className="unit-cost">
                          {formatMoney(product.cost)}
                        </span>

                      </td>


                      <td>

                        <span
                          className={`inventory-status ${status.tone}`}
                        >
                          <span className="status-dot" />
                          {status.label}
                        </span>

                      </td>


                      <td>

                        <button
                          className="inventory-more"
                          type="button"
                          title="Adjust stock"
                          onClick={() => restockProduct(product)}
                        >
                          ⋮
                        </button>

                      </td>

                    </tr>
                  )
                })}

              </tbody>

            </table>

            {loading ? (
              <div className="inventory-empty"><h3>Loading inventory…</h3></div>
            ) : filteredProducts.length === 0 && (
              <div className="inventory-empty">
                <div className="empty-icon">⌕</div>
                <h3>No products found</h3>
                <p>
                  Try changing your search or filters.
                </p>
              </div>
            )}

          </div>

        </div>


        {/* RIGHT SIDEBAR */}
        <aside className="inventory-sidebar">

          {/* STOCK HEALTH */}
          <div className="inventory-side-card">

            <div className="side-card-header">
              <div>
                <span className="side-eyebrow">
                  INVENTORY HEALTH
                </span>

                <h3>Stock health</h3>
              </div>

              <div className="health-percentage">
                {stockHealth}%
              </div>
            </div>

            <div className="health-progress">
              <div
                style={{
                  width: `${stockHealth}%`,
                }}
              />
            </div>

            <p className="health-description">
              {healthyStock} of {totalSKUs} products
              are currently above their minimum stock level.
            </p>

          </div>


          {/* RESTOCK */}
          <div className="inventory-side-card">

            <div className="side-card-header">

              <div>
                <span className="side-eyebrow">
                  ATTENTION
                </span>

                <h3>Restock needed</h3>
              </div>

              <span className="alert-count">
                {restockItems.length}
              </span>

            </div>


            <div className="restock-list">

              {restockItems.length === 0 ? (

                <div className="no-alerts">
                  <div>✓</div>
                  <span>
                    All products have healthy stock levels.
                  </span>
                </div>

              ) : (

                restockItems.map((item) => (

                  <div
                    className="restock-item"
                    key={item._id || item.id}
                  >

                    <div className="restock-avatar">
                      {getInitials(item.name)}
                    </div>

                    <div className="restock-info">

                      <strong>
                        {item.name}
                      </strong>

                      <span>
                        {item.stock} left · Min {item.minStock}
                      </span>

                    </div>

                    <button
                      className="restock-button"
                      type="button"
                      onClick={() => restockProduct(item)}
                    >
                      Restock
                    </button>

                  </div>

                ))

              )}

            </div>

          </div>


          {/* QUICK ACTIONS */}
          <div className="inventory-side-card">

            <span className="side-eyebrow">
              QUICK ACTIONS
            </span>

            <h3>Inventory tools</h3>

            <div className="quick-actions">

              <button>
                <span className="quick-icon">+</span>
                Add new product
              </button>

              <button>
                <span className="quick-icon">↕</span>
                Adjust stock
              </button>

              <button>
                <span className="quick-icon">↓</span>
                Export inventory
              </button>

            </div>

          </div>

        </aside>

      </section>

    </main>
  )
}
