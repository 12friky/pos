import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const PRODUCTS = [
  {
    id: 1,
    name: 'Bottled Water 500ml',
    price: 2.5,
    stock: 18,
    category: 'Drinks',
    sku: 'SKU-1042',
  },
  {
    id: 2,
    name: 'Jollof Rice',
    price: 18,
    stock: 12,
    category: 'Food',
    sku: 'SKU-2071',
  },
  {
    id: 3,
    name: 'Malt Drink Can',
    price: 6,
    stock: 6,
    category: 'Drinks',
    sku: 'SKU-1188',
  },
  {
    id: 4,
    name: 'Meat Pie',
    price: 4,
    stock: 2,
    category: 'Snacks',
    sku: 'SKU-3009',
  },
  {
    id: 5,
    name: 'Bread',
    price: 8,
    stock: 15,
    category: 'Food',
    sku: 'SKU-3010',
  },
  {
    id: 6,
    name: 'Soda',
    price: 5,
    stock: 20,
    category: 'Drinks',
    sku: 'SKU-3011',
  },
  {
    id: 7,
    name: 'Fried Rice',
    price: 20,
    stock: 9,
    category: 'Food',
    sku: 'SKU-3012',
  },
  {
    id: 8,
    name: 'Chicken Wings',
    price: 25,
    stock: 7,
    category: 'Food',
    sku: 'SKU-3013',
  },
]

export default function NewSale() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [payment, setPayment] = useState('Cash')
  const [discount, setDiscount] = useState(0)
  const [customer, setCustomer] = useState('Walk-in customer')
  const [heldSale, setHeldSale] = useState(false)

  

  const [cart, setCart] = useState([
    {
      ...PRODUCTS[2],
      quantity: 1,
    },
  ])

  const categories = ['All', 'Food', 'Drinks', 'Snacks']

  const filteredProducts = useMemo(() => {
    const searchValue = search.toLowerCase().trim()

    if (!searchValue) {
      return []
    }

    return PRODUCTS.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchValue) ||
        product.sku.toLowerCase().includes(searchValue)

      const matchesCategory =
        category === 'All' || product.category === category

      return matchesSearch && matchesCategory
    })
  }, [search, category])

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  )

  const discountAmount = Math.min(
    Number(discount) || 0,
    subtotal
  )

  const total = subtotal - discountAmount

  function addToCart(product) {
    if (!product || product.stock <= 0) return

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.id === product.id
      )

      if (existing) {
        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + 1,
                  product.stock
                ),
              }
            : item
        )
      }

      return [
        ...currentCart,
        {
          ...product,
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
          quantity: Math.min(
            item.quantity + 1,
            item.stock
          ),
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
  }

  function handleCompleteSale() {
    if (!cart.length) {
      alert(
        'Add at least one product before completing the sale.'
      )
      return
    }

    alert(
      `Sale completed\nTotal: GH₵ ${total.toFixed(
        2
      )}\nPayment: ${payment}`
    )

    setCart([])
    setDiscount(0)
    setCustomer('Walk-in customer')
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
      <style>{`
        * {
          box-sizing: border-box;
        }

        .sale-page {
          min-height: 100vh;
          background: #f6f7f5;
          color: #202622;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
          padding: 28px 32px 40px;
        }

        .sale-shell {
          width: 100%;
          max-width: none;
          margin: 0 auto;
        }

        /* =========================
           HEADER
        ========================= */

        .sale-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 22px;
        }

        .sale-eyebrow {
          color: #8a928c;
          font-size: 11px;
          font-weight: 750;
          letter-spacing: .08em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .sale-title {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -.045em;
          color: #202722;
        }

        .sale-header-actions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .till-status {
          display: flex;
          align-items: center;
          gap: 7px;
          background: #edf5ef;
          color: #52745b;
          border: 1px solid #dce9de;
          border-radius: 10px;
          padding: 9px 11px;
          font-size: 11px;
          font-weight: 700;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #5c8a65;
        }

        .outline-btn {
          height: 42px;
          padding: 0 13px;
          border: 1px solid #e1e6e1;
          background: #fff;
          border-radius: 11px;
          color: #56615a;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .outline-btn:hover {
          background: #fafbfa;
        }

        /* =========================
           MAIN LAYOUT
        ========================= */

        .sale-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.55fr) 460px;
          gap: 18px;
          align-items: start;
        }

        .left-column {
          min-width: 0;
        }

        .right-column {
          min-width: 0;
          position: sticky;
          top: 20px;
        }

        /* =========================
           PANELS
        ========================= */

        .sale-panel {
          background: #fff;
          border: 1px solid #e6eae6;
          border-radius: 17px;
          box-shadow: 0 3px 12px rgba(31, 37, 33, .025);
          overflow: hidden;
        }

        .cart-panel {
          margin-bottom: 10px;
        }

        .sale-panel-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          min-height: 68px;
          padding: 0 20px;
          border-bottom: 1px solid #eef0ee;
        }

        .panel-title {
          font-size: 14px;
          font-weight: 750;
          color: #27302a;
        }

        .panel-subtitle {
          margin-top: 4px;
          font-size: 11px;
          color: #929a94;
        }

        /* =========================
           PRODUCT SELECTOR
        ========================= */

        .product-selector {
          padding: 20px;
        }

        .product-search-label {
          display: block;
          color: #7d867f;
          font-size: 10px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin-bottom: 8px;
        }

        .product-search {
          height: 48px;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          background: #f8f9f8;
          border: 1px solid #e4e8e4;
          border-radius: 11px;
          color: #8c948e;
          margin-bottom: 12px;
        }

        .product-search svg {
          width: 17px;
          height: 17px;
          flex-shrink: 0;
        }

        .product-search input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #313a34;
          font-size: 12px;
        }

        .product-search input::placeholder {
          color: #9ba19d;
        }

        .category-row {
          display: flex;
          align-items: center;
          gap: 7px;
          overflow-x: auto;
          margin-bottom: 14px;
          padding-bottom: 2px;
        }

        .category-btn {
          border: 0;
          background: #f3f5f3;
          color: #737d76;
          padding: 8px 13px;
          border-radius: 9px;
          font-size: 10px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
        }

        .category-btn.active {
          background: #29362e;
          color: #fff;
        }

        .product-search-results {
          display: grid;
          gap: 9px;
          margin-top: 14px;
        }

        .product-search-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 16px;
          border-radius: 13px;
          border: 1px solid #e3e8e2;
          background: #f9fbf8;
          color: #24302a;
          text-align: left;
          cursor: pointer;
          transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
        }

        .product-search-item:hover:not(:disabled) {
          background: #eef5ec;
          border-color: #d9e3d6;
          transform: translateY(-1px);
        }

        .product-search-item:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          background: #f6f7f5;
        }

        .product-search-name {
          font-size: 12px;
          font-weight: 700;
        }

        .product-search-meta {
          margin-top: 4px;
          color: #76816d;
          font-size: 11px;
        }

        .product-search-action {
          font-size: 11px;
          font-weight: 700;
          color: #3e503f;
          white-space: nowrap;
        }

        .no-results {
          padding: 14px 16px;
          border-radius: 13px;
          background: #fff6f6;
          border: 1px solid #f0d6d6;
          color: #8a5a5a;
          font-size: 12px;
        }

        .customer-section {
          padding: 14px 20px;
        }

        .summary-panel {
          background: #29352e;
          color: #fff;
          border-radius: 17px;
          padding: 14px;
          margin-bottom: 10px;
          box-shadow: 0 8px 22px rgba(41, 53, 46, .12);
        }

        .summary-total {
          padding-top: 10px;
          margin-top: 2px;
        }

        /* =========================
           CART
        ========================= */

        .cart-panel {
          min-height: 430px;
        }

        .cart-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .item-count {
          color: #8d9690;
          font-size: 11px;
          font-weight: 650;
        }

        .clear-btn {
          border: 0;
          background: transparent;
          color: #a45b53;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .cart-items {
          padding: 5px 20px;
        }

        .cart-item {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 15px;
          align-items: center;
          padding: 15px 0;
          border-bottom: 1px solid #f0f2f0;
        }

        .cart-item:last-child {
          border-bottom: 0;
        }

        .cart-name {
          color: #313a34;
          font-size: 12px;
          font-weight: 700;
        }

        .cart-sku {
          color: #a0a6a1;
          font-size: 10px;
          margin-top: 4px;
        }

        .cart-price {
          color: #303a34;
          font-size: 12px;
          font-weight: 750;
          text-align: right;
        }

        .quantity-control {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-top: 8px;
          padding: 3px;
          border: 1px solid #e4e8e4;
          border-radius: 8px;
          background: #f8f9f8;
        }

        .qty-btn {
          width: 24px;
          height: 24px;
          border: 0;
          background: #fff;
          color: #526057;
          border-radius: 6px;
          font-size: 15px;
          cursor: pointer;
        }

        .qty-value {
          min-width: 16px;
          text-align: center;
          color: #354038;
          font-size: 11px;
          font-weight: 750;
        }

        .remove-item {
          display: block;
          margin-top: 7px;
          margin-left: auto;
          border: 0;
          background: transparent;
          color: #a0a6a1;
          font-size: 9px;
          cursor: pointer;
        }

        .remove-item:hover {
          color: #a45b53;
        }

        .empty-cart {
          min-height: 320px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 30px;
        }

        .empty-icon {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 17px;
          background: #f1f4f1;
          color: #89958c;
          margin-bottom: 13px;
        }

        .empty-icon svg {
          width: 25px;
          height: 25px;
        }

        .empty-title {
          color: #424b45;
          font-size: 13px;
          font-weight: 750;
        }

        .empty-text {
          max-width: 240px;
          margin-top: 6px;
          color: #9aa19c;
          font-size: 11px;
          line-height: 1.5;
        }

        /* =========================
           CUSTOMER
        ========================= */

        .customer-section {
          padding: 16px 20px;
          border-top: 1px solid #eef0ee;
        }

        .customer-label {
          display: block;
          color: #7d867f;
          font-size: 10px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: .06em;
          margin-bottom: 7px;
        }

        .customer-select {
          width: 100%;
          height: 40px;
          padding: 0 10px;
          border: 1px solid #e2e7e2;
          border-radius: 9px;
          background: #fafbfa;
          color: #4e5951;
          font-size: 11px;
          outline: none;
        }

        /* =========================
           SUMMARY
        ========================= */

        .summary-panel {
          background: #29352e;
          color: #fff;
          border-radius: 17px;
          padding: 21px;
          margin-bottom: 18px;
          box-shadow: 0 8px 22px rgba(41, 53, 46, .12);
        }

        .summary-eyebrow {
          color: #aeb9b1;
          font-size: 10px;
          font-weight: 750;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .summary-title {
          margin-top: 4px;
          margin-bottom: 20px;
          font-size: 17px;
          font-weight: 750;
        }

        .summary-line {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          padding: 9px 0;
          border-bottom: 1px solid rgba(255,255,255,.08);
          color: #b9c2bb;
          font-size: 11px;
        }

        .summary-line strong {
          color: #f2f5f3;
          font-weight: 700;
        }

        .discount-input {
          width: 70px;
          height: 27px;
          padding: 0 7px;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 7px;
          background: rgba(255,255,255,.07);
          color: #fff;
          outline: none;
          text-align: right;
          font-size: 10px;
        }

        .summary-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 17px;
          margin-top: 5px;
        }

        .summary-total span:first-child {
          color: #d4dbd5;
          font-size: 12px;
          font-weight: 700;
        }

        .summary-total span:last-child {
          color: #fff;
          font-size: 25px;
          font-weight: 850;
          letter-spacing: -.04em;
        }

        /* =========================
           PAYMENT
        ========================= */

        .payment-panel {
          padding-bottom: 18px;
        }

        .payment-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 16px 20px 0;
        }

        .payment-btn {
          height: 72px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
          border: 1px solid #e5e9e5;
          background: #fafbfa;
          border-radius: 11px;
          color: #707a73;
          cursor: pointer;
          font-size: 10px;
          font-weight: 750;
        }

        .payment-btn svg {
          width: 18px;
          height: 18px;
        }

        .payment-btn.active {
          background: #edf4ee;
          border-color: #bdd0c0;
          color: #4d7155;
        }

        /* =========================
           ACTIONS
        ========================= */

        .checkout-actions {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 9px;
          margin-top: 14px;
        }

        .hold-btn,
        .complete-btn {
          height: 48px;
          border-radius: 11px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
        }

        .hold-btn {
          border: 1px solid #dfe4df;
          background: #fff;
          color: #667169;
        }

        .complete-btn {
          border: 0;
          background: #647f6a;
          color: #fff;
          box-shadow: 0 5px 14px rgba(100,127,106,.2);
        }

        .complete-btn:hover {
          background: #55715c;
        }

        /* =========================
           RECENT PRODUCTS
        ========================= */

        .recent-items {
          padding: 6px 20px 12px;
        }

        .recent-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          min-height: 55px;
          border-bottom: 1px solid #f0f2f0;
        }

        .recent-row:last-child {
          border-bottom: 0;
        }

        .recent-name {
          color: #3b443e;
          font-size: 11px;
          font-weight: 700;
        }

        .recent-sku {
          color: #a0a6a1;
          font-size: 9px;
          margin-top: 3px;
        }

        .recent-price {
          color: #3d4941;
          font-size: 11px;
          font-weight: 750;
        }

        /* =========================
           HELD SALE
        ========================= */

        .held-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 13px;
          margin-bottom: 18px;
          border: 1px solid #eadfc8;
          background: #faf5e9;
          color: #8a713e;
          border-radius: 11px;
          font-size: 11px;
          font-weight: 700;
        }

        /* =========================
           RESPONSIVE
        ========================= */

        @media (max-width: 1200px) {
          .sale-layout {
            grid-template-columns: minmax(0, 1fr) 350px;
          }
        }

        @media (max-width: 950px) {
          .sale-page {
            padding: 20px 16px 30px;
          }

          .sale-layout {
            grid-template-columns: 1fr;
          }

          .right-column {
            position: static;
          }
        }

        @media (max-width: 650px) {
          .sale-topbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .sale-header-actions {
            width: 100%;
          }

          .till-status {
            flex: 1;
          }

          .product-selector {
            padding: 15px;
          }

          .sale-panel-head {
            padding-left: 15px;
            padding-right: 15px;
          }

          .cart-items {
            padding-left: 15px;
            padding-right: 15px;
          }

          .payment-options {
            padding-left: 15px;
            padding-right: 15px;
          }

          .summary-panel {
            padding: 18px;
          }

          /* Removed obsolete dropdown button layout since search results now handle selection. */
        }

        @media (max-width: 430px) {
          .sale-title {
            font-size: 23px;
          }

          .payment-options {
            grid-template-columns: repeat(3, 1fr);
          }

          .payment-btn {
            height: 65px;
          }

          .checkout-actions {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

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
                onClick={() => navigate('/dashboard')}
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
                onClick={() => setHeldSale(false)}
                style={{
                  border: 0,
                  background: 'transparent',
                  color: '#8a713e',
                  fontWeight: 750,
                  cursor: 'pointer'
                }}
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
                            key={product.id}
                            className="product-search-item"
                            type="button"
                            disabled={product.stock === 0}
                            onClick={() => addToCart(product)}
                          >
                            <div>
                              <div className="product-search-name">
                                {product.name}
                              </div>
                              <div className="product-search-meta">
                                {product.sku} · GH₵ {product.price.toFixed(2)} · {product.stock} in stock
                              </div>
                            </div>
                            <span className="product-search-action">
                              {product.stock === 0 ? 'Out of stock' : 'Add'}
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
                    onClick={() =>
                      setPayment('Cash')
                    }
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
                    onClick={() =>
                      setPayment('Card')
                    }
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
                    onClick={() =>
                      setPayment('Mobile')
                    }
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

                {/* CHECKOUT ACTIONS */}
                <div
                  style={{
                    padding: '0 20px'
                  }}
                >

                  <div className="checkout-actions">

                    <button
                      className="hold-btn"
                      onClick={handleHoldSale}
                    >
                      Hold Sale
                    </button>

                    <button
                      className="complete-btn"
                      onClick={handleCompleteSale}
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
    </>
  )
}

