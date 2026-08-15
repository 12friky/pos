import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import '../styles/newsale.css'
import { useNavigate } from 'react-router-dom'
import SaleReceipt from './SaleReceipt'
import { useLiveQuery } from 'dexie-react-hooks'
import { posDb, queueOfflineSale } from '../data/posDb'
import { syncPosData } from '../data/sync'

// products loaded from backend

const productImageSrc = (imageUrl) => {
  if (!imageUrl) return null
  const value = String(imageUrl)
  return value.startsWith('http') || value.startsWith('data:') ? value : `${import.meta.env.VITE_API_URL}${value}`
}

function loadPaystackInline() {
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop)
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('paystack-inline-js')
    if (existing) {
      existing.addEventListener('load', () => resolve(window.PaystackPop), { once: true })
      existing.addEventListener('error', () => reject(new Error('Unable to load Paystack Checkout.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.id = 'paystack-inline-js'
    script.src = 'https://js.paystack.co/v2/inline.js'
    script.async = true
    script.onload = () => window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error('Paystack Checkout did not load.'))
    script.onerror = () => reject(new Error('Unable to load Paystack Checkout.'))
    document.head.appendChild(script)
  })
}

export default function NewSale({ user }) {
  const navigate = useNavigate()
  const userId = (() => {
    if (user?.id || user?._id) return String(user.id || user._id)
    try { const saved = JSON.parse(localStorage.getItem('posUser') || '{}'); return String(saved.id || saved._id || '') } catch { return '' }
  })()

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [payment, setPayment] = useState('Cash')
  const [cashReceived, setCashReceived] = useState('')
  const [cashError, setCashError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const [offlineNotice, setOfflineNotice] = useState(false)
  const [confirmingSale, setConfirmingSale] = useState(false)
  const [discount, setDiscount] = useState(0)
  const [customer, setCustomer] = useState('Walk-in customer')
  const [heldSale, setHeldSale] = useState(false)
  const [mobileError, setMobileError] = useState('')
  const [offlineMobileNotice, setOfflineMobileNotice] = useState(false)
  const [mobilePaymentPending, setMobilePaymentPending] = useState(null)
  const [saleScannerOpen, setSaleScannerOpen] = useState(false)
  const [saleScannerError, setSaleScannerError] = useState('')
  const [saleScannerFacing, setSaleScannerFacing] = useState('environment')
  const saleScannerRef = useRef(null)
  const saleScannerRegionRef = useRef(null)
  const lastSaleScanRef = useRef({ value: '', time: 0 })

  const products = useLiveQuery(() => userId ? posDb.products.where('userId').equals(userId).toArray() : [], [userId], [])
  const recentSales = useLiveQuery(() => userId ? posDb.sales.where('userId').equals(userId).reverse().sortBy('createdAt') : [], [userId], [])
  const recentSalesLoading = false

  const [cart, setCart] = useState([])

  useEffect(() => {
    const token = localStorage.getItem('posToken')
    if (userId && token) syncPosData({ userId, token })
  }, [userId])

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
    if (method === 'Mobile' && !navigator.onLine) {
      setOfflineMobileNotice(true)
      return
    }
    setPayment(method)
    setCashError('')
    setMobileError('')
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

  const stopSaleScanner = useCallback(async () => {
    const scanner = saleScannerRef.current
    if (!scanner) return

    saleScannerRef.current = null
    try {
      if (scanner.isScanning) await scanner.stop()
      await scanner.clear()
    } catch (error) {
      console.warn('Could not completely close sale barcode scanner:', error)
    }
  }, [])

  async function startSaleScanner(cameraFacing = saleScannerFacing) {
    setSaleScannerError('')
    setSaleScannerOpen(true)
    await new Promise((resolve) => requestAnimationFrame(resolve))
    if (!saleScannerRegionRef.current || saleScannerRef.current) return

    if (!navigator.mediaDevices?.getUserMedia) {
      setSaleScannerOpen(false)
      setSaleScannerError('This browser does not provide camera access. Open the POS in a current Chrome, Edge, or Safari browser.')
      return
    }
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      setSaleScannerOpen(false)
      setSaleScannerError('Camera access requires HTTPS. Open the POS using an HTTPS address, not an http:// network IP address.')
      return
    }

    let selectedCamera
    try {
      const cameras = await Html5Qrcode.getCameras()
      const cameraName = cameraFacing === 'environment' ? /back|rear|environment/i : /front|user|face/i
      selectedCamera = cameras.find((camera) => cameraName.test(camera.label)) || cameras[cameraFacing === 'environment' ? cameras.length - 1 : 0]
      if (!selectedCamera) throw new Error('No camera was found on this device.')
    } catch (error) {
      setSaleScannerOpen(false)
      setSaleScannerError(`Camera is unavailable: ${error?.message || 'check the browser camera permission.'}`)
      console.error('Could not list sale cameras:', error)
      return
    }

    const scanner = new Html5Qrcode(saleScannerRegionRef.current.id)
    saleScannerRef.current = scanner
    const scannerConfig = {
      fps: 12,
      qrbox: (width, height) => ({
        width: Math.max(1, Math.min(350, Math.floor(width - 12))),
        height: Math.max(1, Math.min(120, Math.floor(height - 12))),
      }),
      aspectRatio: 2.9,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
      ],
    }
    const onScanSuccess = async (decodedText) => {
      const barcode = decodedText.trim()
      const now = Date.now()
      if (!barcode || (lastSaleScanRef.current.value === barcode && now - lastSaleScanRef.current.time < 1000)) return

      lastSaleScanRef.current = { value: barcode, time: now }
      const product = products.find((item) => String(item.sku || '').trim() === barcode)
      setSaleScannerOpen(false)
      await stopSaleScanner()

      if (product && (product.stock || 0) > 0) {
        addToCart(product)
      } else {
        // Reuse the existing search result UI, including its "No matching products" state.
        setSearch(barcode)
      }
    }
    try {
      await scanner.start(
        selectedCamera.id,
        scannerConfig,
        onScanSuccess,
        () => undefined
      )
    } catch (error) {
      saleScannerRef.current = null
      try { await scanner.clear() } catch { /* Scanner did not finish initializing. */ }
      setSaleScannerOpen(false)
      setSaleScannerError(`Camera could not start: ${error?.message || 'allow camera access and try again.'}`)
      console.error('Sale barcode scanner error:', error)
    }
  }

  async function switchSaleScannerCamera() {
    const nextFacing = saleScannerFacing === 'environment' ? 'user' : 'environment'
    setSaleScannerFacing(nextFacing)
    await stopSaleScanner()
    await startSaleScanner(nextFacing)
  }

  useEffect(() => () => {
    void stopSaleScanner()
  }, [stopSaleScanner])

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

  const completeMobileSale = useCallback(async (reference) => {
    const savedCheckout = sessionStorage.getItem(`paystack-sale:${reference}`)
    if (!savedCheckout) throw new Error('The pending Mobile sale could not be found.')
    const pendingSale = JSON.parse(savedCheckout)
    const token = localStorage.getItem('posToken')
    if (!token) throw new Error('Please log in again before completing this payment.')

    const verifyResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/paystack/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const verification = await verifyResponse.json().catch(() => ({}))
    if (!verifyResponse.ok) throw new Error(verification.message || 'Unable to verify the Mobile payment.')
    if (verification.status !== 'success') return verification.status || 'pending'

    let createdSale = verification.sale
    if (!createdSale) {
      const saleResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/sales`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...pendingSale.salePayload, paystackReference: reference }),
      })
      createdSale = await saleResponse.json().catch(() => ({}))
      if (!saleResponse.ok) throw new Error(createdSale.message || 'Payment succeeded, but the sale could not be recorded.')
    }

    const now = new Date()
    setReceipt({ orderNumber: `POS-${(createdSale._id || now.valueOf()).toString().slice(-8).toUpperCase()}`, customer: createdSale.customer || pendingSale.customer, date: now.toLocaleDateString(), time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), cashier: pendingSale.cashier, businessName: pendingSale.businessName, businessLogoUrl: pendingSale.businessLogoUrl, register: 'Till 02', payment: 'Mobile', items: pendingSale.receiptItems, subtotal: createdSale.subtotal ?? pendingSale.salePayload.subtotal, discount: createdSale.discount ?? pendingSale.salePayload.discount, total: createdSale.total ?? pendingSale.salePayload.total, received: createdSale.total ?? pendingSale.salePayload.total, change: 0 })
    setCart([])
    setDiscount(0)
    setCustomer('Walk-in customer')
    sessionStorage.removeItem(`paystack-sale:${reference}`)
    await syncPosData({ userId, token })
    return 'success'
  }, [userId])

  useEffect(() => {
    if (!mobilePaymentPending) return undefined
    let active = true
    let attempts = 0

    const checkPayment = async () => {
      attempts += 1
      try {
        const status = await completeMobileSale(mobilePaymentPending.reference)
        // Paystack can report an inline transaction as abandoned before the
        // customer completes the checkout. Keep polling until it succeeds or
        // the checkout window expires.
        if (!active || status === 'pending' || status === 'abandoned') {
          if (attempts >= 36 && active) {
            setMobilePaymentPending(null)
            setMobileError('The Mobile payment timed out. Confirm it was not charged, then try again or use Cash.')
          }
          return
        }
        setMobilePaymentPending(null)
        if (status !== 'success') setMobileError('The Mobile payment was not completed. No sale was created.')
      } catch (error) {
        if (active) {
          console.error('Mobile payment status error:', error)
          setMobilePaymentPending(null)
          setMobileError(error.message || 'We could not confirm the Mobile payment.')
        }
      }
    }

    checkPayment()
    const timer = window.setInterval(checkPayment, 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [mobilePaymentPending, completeMobileSale])

  async function startMobileCheckout(salePayload) {
    if (!navigator.onLine) {
      setOfflineMobileNotice(true)
      return
    }

    const token = localStorage.getItem('posToken')
    if (!token) {
      setMobileError('You must be logged in to start a Mobile payment.')
      return
    }

    setMobileError('')
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/paystack/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          currency: 'GHS',
          channels: ['mobile_money'],
          metadata: { customer: salePayload.customer, source: 'pos-sale' },
          salePayload,
        }),
      })
      const checkout = await response.json().catch(() => ({}))
      if (!response.ok || !checkout.reference || !checkout.accessCode) {
        throw new Error(checkout.message || 'Unable to start Paystack Checkout.')
      }

      sessionStorage.setItem(`paystack-sale:${checkout.reference}`, JSON.stringify({
        salePayload,
        customer,
        cashier: user?.name || 'Cashier',
        businessName: user?.businessName,
        businessLogoUrl: user?.businessLogoUrl,
        receiptItems: cart.map((item) => ({ ...item })),
        received: total,
        change: 0,
      }))
      setMobilePaymentPending({ reference: checkout.reference })
      const PaystackPop = await loadPaystackInline()
      const popup = new PaystackPop()
      popup.resumeTransaction(checkout.accessCode)
    } catch (error) {
      console.error('Paystack initialization error:', error)
      setMobilePaymentPending(null)
      setMobileError(error.message || 'Unable to open Paystack Checkout. Please try again or use Cash.')
    }
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

    if (payment === 'Mobile') {
      await startMobileCheckout(salePayload)
      return
    }

    const saveOffline = async () => {
      const localSale = await queueOfflineSale(userId, salePayload)
      setReceipt({ orderNumber: `POS-LOCAL-${localSale.clientRequestId.slice(-6).toUpperCase()}`, customer, date: now.toLocaleDateString(), time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), cashier: user?.name || 'Cashier', businessName: user?.businessName, businessLogoUrl: user?.businessLogoUrl, register: 'Till 02', payment, items: cart.map((item) => ({ ...item })), subtotal, discount: discountAmount, total, received: payment === 'Cash' ? receivedAmount : total, change: payment === 'Cash' ? cashBalance : 0 })
      setCart([])
      setDiscount(0)
      setCustomer('Walk-in customer')
      setConfirmingSale(false)
      setOfflineNotice(true)
    }

    if (!navigator.onLine) {
      try { await saveOffline() } catch (error) { console.error('Offline sale save error:', error); alert(`Unable to save this sale locally: ${error.message || 'unknown local database error'}`) }
      return
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

        await syncPosData({ userId, token })

        setCart([])
        setDiscount(0)
        setCustomer('Walk-in customer')
      } catch (err) {
        console.error('Sale create error:', err)
        if (err instanceof TypeError) {
          try { await saveOffline() } catch (offlineError) { console.error('Offline sale save error:', offlineError); alert('Unable to save this sale locally.') }
        } else alert(err.message || 'Unable to complete sale')
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

                  <div className="sale-barcode-actions">
                    <button
                      type="button"
                      className="sale-scan-button"
                      onClick={startSaleScanner}
                      disabled={saleScannerOpen}
                    >
                      Scan retail barcode
                    </button>
                    <span>Scans a product directly into the cart</span>
                  </div>

                  {saleScannerOpen && (
                    <div className="sale-scanner-panel">
                      <div className="sale-scanner-head">
                        <span>Point the camera at a retail barcode</span>
                        <div className="sale-scanner-controls">
                          <button type="button" onClick={() => void switchSaleScannerCamera()}>
                            Use {saleScannerFacing === 'environment' ? 'front' : 'back'} camera
                          </button>
                          <button type="button" onClick={() => { void stopSaleScanner(); setSaleScannerOpen(false) }}>
                            Close camera
                          </button>
                        </div>
                      </div>
                      <div id="sale-barcode-scanner" className="sale-scanner-region" ref={saleScannerRegionRef} />
                    </div>
                  )}
                  {saleScannerError && <p className="sale-scanner-error">{saleScannerError}</p>}

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
                        <div className="recent-product-info">
                          {productImageSrc(product.imageUrl) && <img className="recent-product-image" src={productImageSrc(product.imageUrl)} alt={product.name} />}
                          <div>
                            <div className="recent-name">{product.name}</div>
                          <div className="recent-sku">{product.sku || 'No SKU'} · {Number(product.stock || 0)} in stock</div>
                        </div>
                        <div className="recent-price">GH₵ {Number(product.price || 0).toFixed(2)}</div>
                        </div>
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

                {payment === 'Mobile' && (
                  <div className="mobile-payment">
                    <p>Paystack will securely charge the order total of GH₵ {total.toFixed(2)}. The customer can enter their Mobile Money number there.</p>
                    {mobileError && <p className="cash-error" role="alert">{mobileError}</p>}
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
                      disabled={Boolean(mobilePaymentPending)}
                    >
                      {mobilePaymentPending ? 'Awaiting payment…' : payment === 'Mobile' ? 'Open Paystack Checkout' : 'Complete Sale'}
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
                {payment === 'Mobile' ? 'Open Paystack Checkout' : 'Confirm & prepare receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
      {offlineNotice && (
        <div className="offline-sale-modal" role="dialog" aria-modal="true" aria-labelledby="offline-sale-title">
          <div className="offline-sale-card"><div className="offline-sale-icon" aria-hidden="true">✓</div><span className="offline-sale-eyebrow">OFFLINE SALE SAVED</span><h2 id="offline-sale-title">Your sale is safely queued</h2><p>This sale is stored on this device and will synchronize automatically when an internet connection returns.</p><div className="offline-sale-actions"><button className="sale-confirm-approve" onClick={() => setOfflineNotice(false)}>View receipt</button></div></div>
        </div>
      )}
      {offlineMobileNotice && (
        <div className="offline-sale-modal" role="dialog" aria-modal="true" aria-labelledby="offline-mobile-title">
          <div className="offline-sale-card">
            <div className="offline-sale-icon" aria-hidden="true">!</div>
            <span className="offline-sale-eyebrow">NO INTERNET CONNECTION</span>
            <h2 id="offline-mobile-title">Mobile payment needs internet</h2>
            <p>Paystack cannot open while this device is offline. Please use Cash for this sale, then try Mobile again when your connection returns.</p>
            <div className="offline-sale-actions">
              <button className="sale-confirm-approve" onClick={() => {
                setPayment('Cash')
                setOfflineMobileNotice(false)
              }}>Use Cash</button>
            </div>
          </div>
        </div>
      )}
      <SaleReceipt receipt={receipt} onNewSale={startNewSale} />
    </>
  )
}

