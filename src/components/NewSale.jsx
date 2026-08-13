import { useMemo, useState, useEffect } from 'react'
import '../styles/newsale.css'
import { useNavigate } from 'react-router-dom'
import SaleReceipt from './SaleReceipt'

// products loaded from backend

export default function NewSale({ user }) {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [payment, setPayment] = useState('Cash')
  const [cashReceived, setCashReceived] = useState('')
  const [cashError, setCashError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [confirmingSale, setConfirmingSale] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [customer, setCustomer] = useState('Walk-in customer')
  const [heldSale, setHeldSale] = useState(false)

  const [products, setProducts] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [recentSalesLoading, setRecentSalesLoading] = useState(true)

  const [cart, setCart] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('posToken')
        const [productsRes, salesRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/api/products`),
          fetch(`${import.meta.env.VITE_API_URL}/api/sales?limit=50`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }),
        ])
        if (!productsRes.ok) throw new Error('Failed to load products')
        setProducts(await productsRes.json())
        if (salesRes.ok) setRecentSales(await salesRes.json())
      } catch (err) {
        console.error('NewSale: could not fetch products', err)
        setProducts([])
      } finally {
        setRecentSalesLoading(false)
      }
    }

    load()
  }, [])

  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))]

  const filteredProducts = useMemo(() => {
    const searchValue = search.toLowerCase().trim()

    if (!searchValue) return []

    return products.filter((product) => {
      const name = (product.name || '').toLowerCase()
      const sku = (product.sku || '').toLowerCase()
      const matchesSearch = name.includes(searchValue) || sku.includes(searchValue)
      const matchesCategory = category === 'All' || product.category === category
      return matchesSearch && matchesCategory
    })
  }, [search, category, products])

  const recentlySoldProducts = useMemo(() => {
    const currentProducts = new Map(products.map((product) => [String(product._id || product.id), product]))
    const seen = new Set()
    const result = []

    recentSales.forEach((sale) => sale.items.forEach((item) => {
      const product = currentProducts.get(String(item.product))
      const key = String(item.product || item.sku || item.name)
      if (!product || seen.has(key) || result.length === 3) return
      seen.add(key)
      result.push(product)
    }))

    return result
  }, [recentSales, products])

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  )

  const discountAmount = Math.min(
    Number(discount) || 0,
    subtotal
  )

  const total = subtotal - discountAmount
  const receivedAmount = Number(cashReceived)
  const cashBalance = receivedAmount - total

  function selectPayment(method) {
    setPayment(method)
    setCashError('')
  }

  function addToCart(product) {
    if (!product || (product.stock || 0) <= 0) return

    setCart((currentCart) => {
      const pid = product._id || product.id
      const existing = currentCart.find((item) => item.id === pid)

      if (existing) {
        return currentCart.map((item) =>
          item.id === pid
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stock || 0) }
            : item
        )
      }

      return [
        ...currentCart,
        {
          id: pid,
          name: product.name,
          sku: product.sku,
          price: product.price,
          stock: product.stock,
          quantity: 1,
        },
      ]
    })

    setSearch('')
  }

  function increaseQuantity(id) {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== id) return item

        return {
          ...item,
          quantity: Math.min(item.quantity + 1, item.stock || 0),
        }
      })
    )
  }

  function decreaseQuantity(id) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  function removeItem(id) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== id)
    )
  }

  function clearCart() {
    setCart([])
    setDiscount(0)
    setCashReceived('')
    setCashError('')
  }

  async function handleCompleteSale(isConfirmed = false) {
    if (!cart.length) {
      alert(
        'Add at least one product before completing the sale.'
      )
      return
    }

    if (payment === 'Cash') {
      if (!Number.isFinite(receivedAmount) || cashReceived.trim() === '') {
        setCashError('Enter the cash received from the customer.')
        return
      }

      if (receivedAmount < total) {
        setCashError(`Cash received must cover the total of GH₵ ${total.toFixed(2)}.`)
        return
      }
    }

    if (!isConfirmed) {
      setConfirmingSale(true)
      return
    }

    const now = new Date()

    const salePayload = {
      items: cart.map((item) => ({
        product: item.id,
        name: item.name,
        sku: item.sku,
        unitPrice: item.price,
        quantity: item.quantity,
      })),
      subtotal,
      discount: discountAmount,
      total,
      paymentMethod: payment,
      customer,
    }

    const token = localStorage.getItem('posToken')

    if (!token) {
      alert('You must be logged in to complete a sale. Please log in first.')
      return
    }

    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/sales`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(salePayload),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.message || 'Failed to create sale')
        }

        const createdSale = await res.json()

        setReceipt({
          orderNumber: `POS-${(createdSale._id || now.valueOf()).toString().slice(-8).toUpperCase()}`,
          customer,
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cashier: (user && user.name) ? user.name : 'Cashier',
          businessName: (user && user.businessName) ? user.businessName : undefined,
          businessLogoUrl: (user && user.businessLogoUrl) ? user.businessLogoUrl : undefined,
          register: 'Till 02',
          payment,
          items: cart.map((item) => ({ ...item })),
          subtotal,
          discount: discountAmount,
          total,
          received: payment === 'Cash' ? receivedAmount : total,
          change: payment === 'Cash' ? cashBalance : 0,
        })

        // refresh products and normalize ids
        const pRes = await fetch(`${import.meta.env.VITE_API_URL}/api/products`)
        if (pRes.ok) {
          const pData = await pRes.json()
          const normalized = pData.map((p) => ({ ...p, id: p._id || p.id }))
          setProducts(normalized)
        }

        setCart([])
        setDiscount(0)
        setCustomer('Walk-in customer')
      } catch (err) {
        console.error('Sale create error:', err)
        alert(err.message || 'Unable to complete sale')
      }
    }

  function startNewSale() {
    setReceipt(null)
    setCart([])
    setDiscount(0)
    setCustomer('Walk-in customer')
    setCashReceived('')
    setCashError('')
  }

  function handleHoldSale() {
    if (!cart.length) {
      alert('There are no items to hold.')
      return
    }

    setHeldSale(true)
  }

  return (
    <>

      <main className="sale-page">
        <div className="sale-shell">

          {/* HEADER */}
          <header className="sale-topbar">

            <div>
              <div className="sale-eyebrow">
                New Sale · Till 02
              </div>

              <div className="sale-title">
                Create a sale
              </div>
            </div>

            <div className="sale-header-actions">

              <div className="till-status">
                <span className="status-dot" />
                Till 02 Open
              </div>

              <button
                className="outline-btn"
                onClick={() => navigate('/')}
              >
                Exit sale
              </button>

            </div>

          </header>

          {/* HELD SALE MESSAGE */}
          {heldSale && (
            <div className="held-banner">

              <span>
                Sale saved temporarily. You can continue later.
              </span>

              <button
                className="held-dismiss-btn"
                onClick={() => setHeldSale(false)}
              >
                Dismiss
              </button>

            </div>
          )}

          <div className="sale-layout">

            {/* =========================
                LEFT COLUMN
            ========================= */}

            <div className="left-column">

              {/* PRODUCT SELECTOR */}
              <section className="sale-panel">

                <div className="sale-panel-head">

                  <div>
                    <div className="panel-title">
                      Add products
                    </div>

                    <div className="panel-subtitle">
                      Search and select a product to add it to the sale
                    </div>
                  </div>

                  <span className="item-count">
                    {filteredProducts.length} available
                  </span>

                </div>

                <div className="product-selector">

                  <label className="product-search-label">
                    Search product
                  </label>

                  <label className="product-search">

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
                      type="text"
                      placeholder="Search by product name or SKU..."
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                    />

                  </label>

                  {/* CATEGORY FILTERS */}
                  <div className="category-row">

                    {categories.map((item) => (
                      <button
                        key={item}
                        className={
                          'category-btn' +
                          (category === item ? ' active' : '')
                        }
                        onClick={() => setCategory(item)}
                      >
                        {item}
                      </button>
                    ))}

                  </div>

                  {search.trim() !== '' && (
                    <div className="product-search-results">
                      {filteredProducts.length === 0 ? (
                        <div className="no-results">
                          No matching products found.
                        </div>
                      ) : (
                        filteredProducts.map((product) => (
                          <button
                            key={product._id || product.id}
                            className="product-search-item"
                            type="button"
                            disabled={(product.stock || 0) === 0}
                            onClick={() => addToCart(product)}
                          >
                            <div>
                              <div className="product-search-name">
                                {product.name}
                              </div>
                              <div className="product-search-meta">
                                {product.sku} · GH₵ {Number(product.price || 0).toFixed(2)} · {(product.stock || 0)} in stock
                              </div>
                            </div>
                            <span className="product-search-action">
                              {(product.stock || 0) === 0 ? 'Out of stock' : 'Add'}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                </div>

              </section>

              {/* RECENT PRODUCTS */}
              <section className="sale-panel">

                <div className="sale-panel-head">

                  <div>
                    <div className="panel-title">
                      Recently sold
                    </div>

                    <div className="panel-subtitle">
                      Products you sell frequently
                    </div>
                  </div>

                </div>

                <div className="recent-items">
                  {recentSalesLoading ? (
                    <div className="recent-row"><div className="recent-name">Loading recent sales…</div></div>
                  ) : recentlySoldProducts.length === 0 ? (
                    <div className="recent-row"><div className="recent-name">No sales recorded yet</div><div className="recent-sku">Completed sales will appear here.</div></div>
                  ) : (
                    recentlySoldProducts.map((product) => (
                      <button
                        className="recent-row"
                        type="button"
                        key={product._id || product.id}
                        disabled={product.trackInventory && Number(product.stock || 0) <= 0}
                        onClick={() => addToCart(product)}
                        style={{ width: '100%', border: 0, textAlign: 'left', cursor: 'pointer' }}
                      >
                        <div>
                          <div className="recent-name">{product.name}</div>
                          <div className="recent-sku">{product.sku || 'No SKU'} · {Number(product.stock || 0)} in stock</div>
                        </div>
                        <div className="recent-price">GH₵ {Number(product.price || 0).toFixed(2)}</div>
                      </button>
                    ))
                  )}
                  {recentlySoldProducts.length === -1 && <>

                  <div className="recent-row">

                    <div>
                      <div className="recent-name">
                        Malt Drink Can
                      </div>

                      <div className="recent-sku">
                        SKU-1188
                      </div>
                    </div>

                    <div className="recent-price">
                      GH₵ 6.00
                    </div>

                  </div>

                  <div className="recent-row">

                    <div>
                      <div className="recent-name">
                        Meat Pie
                      </div>

                      <div className="recent-sku">
                        SKU-3009
                      </div>
                    </div>

                    <div className="recent-price">
                      GH₵ 4.00
                    </div>

                  </div>

                  <div className="recent-row">

                    <div>
                      <div className="recent-name">
                        Bottled Water 500ml
                      </div>

                      <div className="recent-sku">
                        SKU-1042
                      </div>
                    </div>

                    <div className="recent-price">
                      GH₵ 2.50
                    </div>

                  </div>

                  </>}
                </div>

              </section>

            </div>

            {/* =========================
                RIGHT COLUMN
            ========================= */}

            <aside className="right-column">

              {/* CURRENT SALE / CART */}
              <section className="sale-panel cart-panel">

                <div className="sale-panel-head">

                  <div>
                    <div className="panel-title">
                      Current sale
                    </div>

                    <div className="panel-subtitle">
                      {cart.length === 0
                        ? 'No products added'
                        : `${cart.length} product${
                            cart.length > 1 ? 's' : ''
                          }`}
                    </div>
                  </div>

                  {cart.length > 0 && (
                    <div className="cart-header-actions">

                      <span className="item-count">
                        {cart.reduce(
                          (sum, item) =>
                            sum + item.quantity,
                          0
                        )}{' '}
                        items
                      </span>

                      <button
                        className="clear-btn"
                        onClick={clearCart}
                      >
                        Clear
                      </button>

                    </div>
                  )}

                </div>

                {cart.length === 0 ? (

                  <div className="empty-cart">

                    <div className="empty-icon">

                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="9" cy="21" r="1.5" />
                        <circle cx="18" cy="21" r="1.5" />
                        <path d="M2 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.7a2 2 0 0 0 2-1.6L21 7H6" />
                      </svg>

                    </div>

                    <div className="empty-title">
                      Your sale is empty
                    </div>

                    <div className="empty-text">
                      Search for a product and select it
                      from the product list to start this sale.
                    </div>

                  </div>

                ) : (

                  <div className="cart-items">

                    {cart.map((item) => (
                      <div
                        className="cart-item"
                        key={item.id}
                      >

                        <div>

                          <div className="cart-name">
                            {item.name}
                          </div>

                          <div className="cart-sku">
                            {item.sku}
                          </div>

                          <div className="quantity-control">

                            <button
                              className="qty-btn"
                              onClick={() =>
                                decreaseQuantity(item.id)
                              }
                            >
                              −
                            </button>

                            <span className="qty-value">
                              {item.quantity}
                            </span>

                            <button
                              className="qty-btn"
                              onClick={() =>
                                increaseQuantity(item.id)
                              }
                            >
                              +
                            </button>

                          </div>

                        </div>

                        <div>

                          <div className="cart-price">
                            GH₵{' '}
                            {(
                              item.price *
                              item.quantity
                            ).toFixed(2)}
                          </div>

                          <button
                            className="remove-item"
                            onClick={() =>
                              removeItem(item.id)
                            }
                          >
                            Remove
                          </button>

                        </div>

                      </div>
                    ))}

                  </div>

                )}

                {/* CUSTOMER */}
                <div className="customer-section">

                  <label className="customer-label">
                    Customer
                  </label>

                  <select
                    className="customer-select"
                    value={customer}
                    onChange={(e) =>
                      setCustomer(e.target.value)
                    }
                  >

                    <option>
                      Walk-in customer
                    </option>

                    <option>
                      John Mensah
                    </option>

                    <option>
                      Ama Boateng
                    </option>

                    <option>
                      Kwame Asante
                    </option>

                  </select>

                </div>

              </section>

              {/* SALE SUMMARY */}
              <section className="summary-panel">

                <div className="summary-eyebrow">
                  Sale summary
                </div>

                <div className="summary-title">
                  Order total
                </div>

                <div className="summary-line">

                  <span>
                    Subtotal
                  </span>

                  <strong>
                    GH₵ {subtotal.toFixed(2)}
                  </strong>

                </div>

                <div className="summary-line">

                  <span>
                    Discount
                  </span>

                  <input
                    className="discount-input"
                    type="number"
                    min="0"
                    max={subtotal}
                    value={discount}
                    onChange={(e) =>
                      setDiscount(e.target.value)
                    }
                  />

                </div>

                <div className="summary-total">

                  <span>
                    Total
                  </span>

                  <span>
                    GH₵ {total.toFixed(2)}
                  </span>

                </div>

              </section>

              {/* PAYMENT */}
              <section className="sale-panel payment-panel">

                <div className="sale-panel-head">

                  <div>
                    <div className="panel-title">
                      Payment method
                    </div>

                    <div className="panel-subtitle">
                      Select how the customer is paying
                    </div>
                  </div>

                </div>

                <div className="payment-options">

                  {/* CASH */}
                  <button
                    className={
                      'payment-btn' +
                      (payment === 'Cash'
                        ? ' active'
                        : '')
                    }
                    onClick={() => selectPayment('Cash')}
                  >

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect
                        x="3"
                        y="6"
                        width="18"
                        height="12"
                        rx="2"
                      />

                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                      />
                    </svg>

                    Cash

                  </button>

                  {/* CARD */}
                  <button
                    className={
                      'payment-btn' +
                      (payment === 'Card'
                        ? ' active'
                        : '')
                    }
                    onClick={() => selectPayment('Card')}
                  >

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                      />

                      <path d="M3 10h18" />
                    </svg>

                    Card

                  </button>

                  {/* MOBILE */}
                  <button
                    className={
                      'payment-btn' +
                      (payment === 'Mobile'
                        ? ' active'
                        : '')
                    }
                    onClick={() => selectPayment('Mobile')}
                  >

                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect
                        x="6"
                        y="2.5"
                        width="12"
                        height="19"
                        rx="2"
                      />

                      <path d="M10 18.5h4" />
                    </svg>

                    Mobile

                  </button>

                </div>

                {payment === 'Cash' && (
                  <div className="cash-payment">
                    <label htmlFor="cash-received">Cash received</label>
                    <div className="cash-input-row">
                      <span>GH₵</span>
                      <input
                        id="cash-received"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={cashReceived}
                        onChange={(event) => {
                          setCashReceived(event.target.value)
                          setCashError('')
                        }}
                        aria-describedby="cash-balance cash-error"
                      />
                    </div>
                    <div className="cash-balance" id="cash-balance">
                      <span>Balance / change due</span>
                      <strong className={cashReceived !== '' && cashBalance < 0 ? 'amount-owing' : ''}>
                        GH₵ {cashReceived === '' ? '0.00' : Math.max(cashBalance, 0).toFixed(2)}
                      </strong>
                    </div>
                    {cashReceived !== '' && cashBalance < 0 && (
                      <p className="cash-shortfall">Amount still due: GH₵ {Math.abs(cashBalance).toFixed(2)}</p>
                    )}
                    {cashError && <p className="cash-error" id="cash-error" role="alert">{cashError}</p>}
                  </div>
                )}

                {/* CHECKOUT ACTIONS */}
                <div className="checkout-action-wrap">

                  <div className="checkout-actions">

                    <button
                      className="hold-btn"
                      onClick={handleHoldSale}
                    >
                      Hold Sale
                    </button>

                    <button
                      className="complete-btn"
                      onClick={() => handleCompleteSale()}
                    >
                      Complete Sale
                    </button>

                  </div>

                </div>

              </section>

            </aside>

          </div>

        </div>
      </main>
      {confirmingSale && (
        <div className="sale-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-sale-title">
          <div className="sale-confirm-card">
            <div className="sale-confirm-icon" aria-hidden="true">✓</div>
            <h2 id="confirm-sale-title">Confirm sale</h2>
            <p>Review the payment before completing this sale and preparing the receipt.</p>
            <div className="sale-confirm-details">
              <span>Total</span>
              <strong>GH₵ {total.toFixed(2)}</strong>
              <span>Payment method</span>
              <strong>{payment}</strong>
              {payment === 'Cash' && (
                <>
                  <span>Change due</span>
                  <strong>GH₵ {cashBalance.toFixed(2)}</strong>
                </>
              )}
            </div>
            <div className="sale-confirm-actions">
              <button className="sale-confirm-cancel" onClick={() => setConfirmingSale(false)}>
                Go back
              </button>
              <button className="sale-confirm-approve" onClick={() => {
                setConfirmingSale(false)
                handleCompleteSale(true)
              }}>
                Confirm &amp; prepare receipt
              </button>
            </div>
          </div>
        </div>
      )}
      <SaleReceipt receipt={receipt} onNewSale={startNewSale} />
    </>
  )
}

