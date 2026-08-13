import { useMemo, useState, useEffect } from 'react'

export default function Products() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [stockFilter, setStockFilter] = useState('All')
  const [sortBy, setSortBy] = useState('name')
  const [showFilters, setShowFilters] = useState(false)
  const [showDrawer, setShowDrawer] = useState(false)
  const [drawerMode, setDrawerMode] = useState('add')
  const [activeProduct, setActiveProduct] = useState(null)
  const [openActionProduct, setOpenActionProduct] = useState(null)
  const [formProduct, setFormProduct] = useState({
    name: '',
    sku: '',
    category: 'Food',
    unit: 'Plate',
    price: '',
    cost: '',
    stock: '',
    minStock: '',
    description: '',
    trackInventory: true,
    imageFile: null,
    imagePreview: '',
  })

  const [products, setProducts] = useState([])
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/products`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        // normalize id field to ease frontend usage (backend returns _id)
        const normalized = data.map((p) => ({ ...p, id: p._id || p.id }))
        setProducts(normalized)
      } catch (err) {
        console.error('Could not load products:', err)
        setProducts([])
      }
    }

    fetchProducts()
  }, [])

  const categories = [
    'All',
    ...new Set(products.map((product) => product.category)),
  ]

  const getStockStatus = (product) => {
    if (product.stock === 0) {
      return {
        label: 'Out of stock',
        className: 'stock-out',
      }
    }

    if (product.stock <= product.minStock) {
      return {
        label: 'Low stock',
        className: 'stock-low',
      }
    }

    return {
      label: 'In stock',
      className: 'stock-good',
    }
  }

  function openDrawer(mode, product = null) {
    setDrawerMode(mode)
    setShowDrawer(true)
    setOpenActionProduct(null)
    setActiveProduct(product)

    if (mode === 'edit' && product) {
      setFormProduct({
        name: product.name,
        sku: product.sku,
        category: product.category,
        unit: product.unit,
        price: product.price.toString(),
        cost: product.cost.toString(),
        stock: product.stock.toString(),
        minStock: product.minStock.toString(),
        description: product.description || '',
        trackInventory: true,
        imageFile: null,
        imagePreview: product.imageUrl || '',
      })
      return
    }

    setFormProduct({
      name: '',
      sku: '',
      category: 'Food',
      unit: 'Plate',
      price: '',
      cost: '',
      stock: '',
      minStock: '',
      description: '',
      trackInventory: true,
      imageFile: null,
      imagePreview: '',
    })
  }

  function handleImageChange(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setFormProduct((current) => ({ ...current, imageFile: file, imagePreview: url }))
  }

  function removeImage() {
    setFormProduct((current) => ({ ...current, imageFile: null, imagePreview: '' }))
    const inp = document.getElementById('product-image-upload')
    if (inp) inp.value = ''
  }

  function closeDrawer() {
    setShowDrawer(false)
    setActiveProduct(null)
    setOpenActionProduct(null)
  }

  function toggleActionMenu(id) {
    setOpenActionProduct((current) =>
      current === id ? null : id
    )
  }

  function handleEditProduct(product) {
    openDrawer('edit', product)
  }

  async function restockProduct(product) {
    const amount = window.prompt(`How many ${product.unit || 'units'} of ${product.name} would you like to add?`, String(Math.max(Number(product.minStock) || 1, 1)))
    if (amount === null) return
    const quantity = Number(amount)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setErrorMessage('Enter a restock quantity greater than zero.')
      setShowError(true)
      return
    }
    try {
      const token = localStorage.getItem('posToken')
      const response = await fetch(`${import.meta.env.VITE_API_URL}/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stock: Number(product.stock || 0) + quantity }),
      })
      const updated = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(updated.message || 'Unable to restock product')
      const normalized = { ...updated, id: updated._id || updated.id }
      setProducts((current) => current.map((item) => item.id === product.id ? normalized : item))
      setOpenActionProduct(null)
      setSuccessMessage(`${product.name} restocked successfully.`)
      setShowSuccess(true)
    } catch (error) {
      setErrorMessage(error.message || 'Unable to restock product')
      setShowError(true)
    }
  }

  function handleSaveProduct() {
    const token = localStorage.getItem('posToken')

    if (!token) {
      setErrorMessage('You must be logged in to add a product. Please log in first.')
      setShowError(true)
      return
    }

    if (!formProduct.name.trim()) {
      setErrorMessage('Product name is required.')
      setShowError(true)
      return
    }

    if (formProduct.imageFile && formProduct.imageFile.size > 5 * 1024 * 1024) {
      setErrorMessage('Product image must be 5MB or smaller.')
      setShowError(true)
      return
    }

    const payload = {
      name: formProduct.name,
      sku: formProduct.sku,
      category: formProduct.category,
      unit: formProduct.unit,
      price: parseFloat(formProduct.price) || 0,
      cost: parseFloat(formProduct.cost) || 0,
      stock: parseInt(formProduct.stock || '0', 10) || 0,
      minStock: parseInt(formProduct.minStock || '0', 10) || 0,
      description: formProduct.description || '',
      trackInventory: !!formProduct.trackInventory,
    }

    const doSave = async () => {
      try {
        let res
        const endpoint = drawerMode === 'edit' && activeProduct
          ? `${import.meta.env.VITE_API_URL}/products/${activeProduct.id}`
          : `${import.meta.env.VITE_API_URL}/products`
        const method = drawerMode === 'edit' ? 'PATCH' : 'POST'
        if (formProduct.imageFile) {
          const fd = new FormData()
          Object.keys(payload).forEach((k) => fd.append(k, payload[k]))
          fd.append('image', formProduct.imageFile)

          res = await fetch(endpoint, {
            method,
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: fd,
          })
        } else {
          res = await fetch(endpoint, {
            method,
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(payload),
          })
        }

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          const serverMsg = errBody && errBody.message ? errBody.message : 'Failed to save product'
          if (res.status === 401) {
            setErrorMessage('Not authorized. Please log in again.')
            setShowError(true)
            return
          }
          throw new Error(serverMsg)
        }

        const created = await res.json()
        // normalize id
        const createdNorm = { ...created, id: created._id || created.id }
        setProducts((current) => drawerMode === 'edit'
          ? current.map((product) => product.id === createdNorm.id ? createdNorm : product)
          : [createdNorm, ...current])
        // show success modal
        setSuccessMessage(drawerMode === 'edit' ? 'Product updated successfully' : 'Product added successfully')
        setShowSuccess(true)
        setShowDrawer(false)
        setOpenActionProduct(null)
        setActiveProduct(null)
      } catch (err) {
        console.error('Save product error:', err)
        // show error modal
        setErrorMessage(err.message || 'Failed to save product')
        setShowError(true)
        // fallback: close drawer but keep data
        setShowDrawer(false)
        setOpenActionProduct(null)
        setActiveProduct(null)
      }
    }

    doSave()
  }

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const query = search.toLowerCase().trim()

      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query)

      const matchesCategory =
        category === 'All' ||
        product.category === category

      const status = getStockStatus(product)

      const matchesStock =
        stockFilter === 'All' ||
        (stockFilter === 'In stock' &&
          status.label === 'In stock') ||
        (stockFilter === 'Low stock' &&
          status.label === 'Low stock') ||
        (stockFilter === 'Out of stock' &&
          status.label === 'Out of stock')

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStock
      )
    })

    result = [...result].sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }

      if (sortBy === 'price-high') {
        return b.price - a.price
      }

      if (sortBy === 'price-low') {
        return a.price - b.price
      }

      if (sortBy === 'stock-low') {
        return a.stock - b.stock
      }

      if (sortBy === 'stock-high') {
        return b.stock - a.stock
      }

      return 0
    })

    return result
  }, [search, category, stockFilter, sortBy, products])

  const totalInventoryValue = products.reduce(
    (sum, product) =>
      sum + product.cost * product.stock,
    0
  )

  const lowStockCount = products.filter(
    (product) =>
      product.stock > 0 &&
      product.stock <= product.minStock
  ).length

  const outOfStockCount = products.filter(
    (product) => product.stock === 0
  ).length

  const totalUnits = products.reduce(
    (sum, product) => sum + product.stock,
    0
  )

  const formatMoney = (value) =>
    `GH₵ ${value.toFixed(2)}`

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .products-page {
          min-height: 100vh;
          background: #f6f7f5;
          color: #252d28;
          padding: 28px 32px 45px;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .products-shell {
          width: 100%;
          max-width: none;
        }

        /* =========================
           HEADER
        ========================= */

        .products-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .products-eyebrow {
          color: #8b938d;
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .09em;
          margin-bottom: 6px;
        }

        .products-title {
          color: #222a25;
          font-size: 28px;
          font-weight: 820;
          letter-spacing: -.045em;
        }

        .products-description {
          margin-top: 6px;
          color: #949b96;
          font-size: 11px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-secondary {
          height: 42px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          gap: 7px;
          border: 1px solid #e0e5e0;
          background: #fff;
          color: #69736c;
          border-radius: 11px;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }

        .header-secondary svg {
          width: 15px;
          height: 15px;
        }

        .header-primary {
          height: 42px;
          padding: 0 16px;
          display: flex;
          align-items: center;
          gap: 7px;
          border: 0;
          background: #647f6a;
          color: #fff;
          border-radius: 11px;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
          box-shadow: 0 5px 13px rgba(100,127,106,.15);
        }

        .header-primary svg {
          width: 15px;
          height: 15px;
        }

        /* =========================
           SUMMARY
        ========================= */

        .summary-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 20px;
        }

        .summary-card {
          background: #fff;
          border: 1px solid #e6eae6;
          border-radius: 15px;
          padding: 16px;
          min-height: 102px;
        }

        .summary-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .summary-label {
          color: #929a94;
          font-size: 10px;
          font-weight: 700;
        }

        .summary-icon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f2f5f2;
          color: #758278;
        }

        .summary-icon svg {
          width: 15px;
          height: 15px;
        }

        .summary-value {
          margin-top: 13px;
          color: #303a33;
          font-size: 20px;
          font-weight: 820;
          letter-spacing: -.035em;
        }

        .summary-note {
          margin-top: 4px;
          color: #a0a6a1;
          font-size: 9px;
        }

        .summary-note.warning {
          color: #a17a42;
        }

        .summary-note.danger {
          color: #a45b53;
        }

        /* =========================
           MAIN PANEL
        ========================= */

        .products-panel {
          background: #fff;
          border: 1px solid #e5e9e5;
          border-radius: 17px;
          overflow: hidden;
          box-shadow:
            0 4px 16px rgba(30,38,32,.025);
        }

        .products-toolbar {
          padding: 17px 19px;
          border-bottom: 1px solid #edf0ed;
        }

        .toolbar-main {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .search-box {
          flex: 2 1 420px;
          min-width: 320px;
          height: 43px;
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 0 12px;
          border: 1px solid #e3e7e3;
          border-radius: 10px;
          background: #fafbfa;
        }

        .search-box svg {
          width: 16px;
          height: 16px;
          color: #9ba29d;
          flex-shrink: 0;
        }

        .search-box input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #3d4740;
          font-size: 11px;
        }

        .search-box input::placeholder {
          color: #a0a6a1;
        }

        .filter-btn {
          height: 43px;
          padding: 0 12px;
          display: flex;
          align-items: center;
          gap: 7px;
          border: 1px solid #e3e7e3;
          background: #fff;
          border-radius: 10px;
          color: #6c766f;
          font-size: 10px;
          font-weight: 750;
          cursor: pointer;
        }

        .filter-btn svg {
          width: 14px;
          height: 14px;
        }

        .sort-select {
          height: 43px;
          min-width: 150px;
          width: 160px;
          padding: 0 10px;
          border: 1px solid #e3e7e3;
          background: #fff;
          border-radius: 10px;
          color: #6c766f;
          font-size: 10px;
          font-weight: 700;
          outline: none;
        }

        .filter-row {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 12px;
          overflow-x: auto;
          padding-bottom: 1px;
        }

        .filter-chip {
          border: 0;
          background: #f3f5f3;
          color: #7a837c;
          border-radius: 8px;
          padding: 7px 11px;
          font-size: 9px;
          font-weight: 750;
          cursor: pointer;
          white-space: nowrap;
        }

        .filter-chip.active {
          background: #29362e;
          color: #fff;
        }

        .results-count {
          margin-left: auto;
          color: #9aa19c;
          font-size: 9px;
          white-space: nowrap;
        }

        /* =========================
           TABLE
        ========================= */

        .products-table {
          width: 100%;
        }

        .table-head {
          display: grid;
          grid-template-columns:
            minmax(250px, 2.2fr)
            1fr
            .8fr
            .8fr
            .8fr
            1fr
            45px;
          align-items: center;
          gap: 15px;
          padding: 11px 19px;
          background: #fafbfa;
          border-bottom: 1px solid #edf0ed;
          color: #9aa19c;
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .06em;
        }

        .product-row {
          display: grid;
          grid-template-columns:
            minmax(250px, 2.2fr)
            1fr
            .8fr
            .8fr
            .8fr
            1fr
            45px;
          align-items: center;
          gap: 15px;
          min-height: 78px;
          padding: 10px 19px;
          border-bottom: 1px solid #f0f2f0;
          transition: background .15s ease;
        }

        .product-row:last-child {
          border-bottom: 0;
        }

        .product-row:hover {
          background: #fcfdfc;
        }

        .product-info {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 0;
        }

        .product-avatar {
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #eef2ee;
          color: #708078;
          font-size: 13px;
          font-weight: 800;
        }

        .product-details {
          min-width: 0;
        }

        .product-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #354038;
          font-size: 11px;
          font-weight: 750;
        }

        .product-sku {
          margin-top: 4px;
          color: #9ca39e;
          font-size: 9px;
        }

        .category-label {
          display: inline-flex;
          padding: 5px 8px;
          border-radius: 7px;
          background: #f2f4f2;
          color: #737d76;
          font-size: 9px;
          font-weight: 700;
        }

        .price-value {
          color: #38433b;
          font-size: 11px;
          font-weight: 750;
        }

        .cost-value {
          color: #8b948e;
          font-size: 10px;
        }

        .margin-value {
          color: #56705c;
          font-size: 10px;
          font-weight: 750;
        }

        .stock-column {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 5px;
        }

        .stock-number {
          color: #3c463f;
          font-size: 11px;
          font-weight: 750;
        }

        .stock-status {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 7px;
          border-radius: 6px;
          font-size: 8px;
          font-weight: 750;
        }

        .stock-status::before {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .stock-good {
          background: #edf5ef;
          color: #54735a;
        }

        .stock-good::before {
          background: #62856a;
        }

        .stock-low {
          background: #faf3e5;
          color: #97743c;
        }

        .stock-low::before {
          background: #b28b4b;
        }

        .stock-out {
          background: #faeeee;
          color: #a15b54;
        }

        .stock-out::before {
          background: #ae625a;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e6eae6;
          background: #fff;
          color: #89918b;
          border-radius: 8px;
          cursor: pointer;
        }

        .action-btn svg {
          width: 15px;
          height: 15px;
        }

        .action-btn:hover {
          background: #f6f8f6;
          color: #59645c;
        }

        /* =========================
           FOOTER
        ========================= */

        .products-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 14px 19px;
          border-top: 1px solid #edf0ed;
          background: #fcfdfc;
        }

        .footer-info {
          color: #9ba29d;
          font-size: 9px;
        }

        .pagination {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .page-btn {
          width: 29px;
          height: 29px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e4e8e4;
          background: #fff;
          color: #747e77;
          border-radius: 7px;
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
        }

        .page-btn.active {
          background: #29362e;
          border-color: #29362e;
          color: #fff;
        }

        /* =========================
           LOW STOCK
        ========================= */

        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-top: 18px;
        }

        .bottom-panel {
          background: #fff;
          border: 1px solid #e6eae6;
          border-radius: 16px;
          overflow: hidden;
        }

        .bottom-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 18px;
          border-bottom: 1px solid #edf0ed;
        }

        .bottom-title {
          color: #354038;
          font-size: 12px;
          font-weight: 750;
        }

        .bottom-link {
          border: 0;
          background: transparent;
          color: #657c6a;
          font-size: 9px;
          font-weight: 750;
          cursor: pointer;
        }

        .low-stock-list {
          padding: 5px 18px 10px;
        }

        .low-stock-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 51px;
          border-bottom: 1px solid #f0f2f0;
        }

        .low-stock-item:last-child {
          border-bottom: 0;
        }

        .low-stock-name {
          color: #414a44;
          font-size: 10px;
          font-weight: 700;
        }

        .low-stock-sku {
          color: #a0a6a1;
          font-size: 8px;
          margin-top: 3px;
        }

        .low-stock-count {
          color: #a0733d;
          font-size: 10px;
          font-weight: 800;
        }

        .inventory-insight {
          padding: 16px 18px 18px;
        }

        .insight-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 9px 0;
          border-bottom: 1px solid #f0f2f0;
        }

        .insight-row:last-child {
          border-bottom: 0;
        }

        .insight-label {
          color: #8e9690;
          font-size: 9px;
        }

        .insight-value {
          color: #424c45;
          font-size: 10px;
          font-weight: 750;
        }

        /* =========================
           EMPTY
        ========================= */

        .empty-state {
          padding: 65px 20px;
          text-align: center;
        }

        .empty-state-icon {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 13px;
          border-radius: 15px;
          background: #f1f4f1;
          color: #8a958d;
        }

        .empty-state-icon svg {
          width: 23px;
          height: 23px;
        }

        .empty-state-title {
          color: #414a44;
          font-size: 13px;
          font-weight: 750;
        }

        .empty-state-text {
          margin-top: 5px;
          color: #9ba19c;
          font-size: 10px;
        }

        /* =========================
           RESPONSIVE
        ========================= */

        @media (max-width: 1200px) {
          .table-head,
          .product-row {
            grid-template-columns:
              minmax(220px, 2fr)
              .8fr
              .8fr
              .8fr
              .9fr
              40px;
          }

          .table-head > div:nth-child(3),
          .product-row > div:nth-child(3) {
            display: none;
          }
        }

        @media (max-width: 950px) {
          .products-page {
            padding: 22px 16px 35px;
          }

          .summary-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .bottom-grid {
            grid-template-columns: 1fr;
          }

          .products-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .header-actions {
            width: 100%;
          }
        }

        @media (max-width: 700px) {
          .toolbar-main {
            flex-wrap: wrap;
          }

          .search-box {
            flex-basis: 100%;
          }

          .sort-select {
            flex: 1;
          }

          .filter-btn {
            flex: 1;
            justify-content: center;
          }

          .table-head {
            display: none;
          }

          .product-row {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: 12px;
            padding: 15px;
          }

          .product-row > div:nth-child(2),
          .product-row > div:nth-child(3),
          .product-row > div:nth-child(4),
          .product-row > div:nth-child(5) {
            display: none;
          }

          .product-row > div:nth-child(6) {
            grid-column: 1;
          }

          .product-row > div:nth-child(7) {
            grid-column: 2;
            grid-row: 1 / span 2;
          }

          .product-info {
            min-width: 0;
          }

          .products-footer {
            padding: 13px 15px;
          }
        }

        @media (max-width: 520px) {
          .products-title {
            font-size: 24px;
          }

          .summary-grid {
            grid-template-columns: 1fr 1fr;
            gap: 8px;
          }

          .summary-card {
            min-height: 92px;
            padding: 13px;
          }

          .summary-value {
            font-size: 17px;
          }

          .header-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
          }

          .header-primary,
          .header-secondary {
            justify-content: center;
          }

          .pagination {
            display: none;
          }
        }

        .action-menu-wrapper {
          position: relative;
        }

        .action-menu {
          position: absolute;
          right: 0;
          top: 40px;
          display: grid;
          gap: 8px;
          padding: 10px;
          background: #fff;
          border: 1px solid #e3e7e3;
          border-radius: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          z-index: 5;
          min-width: 120px;
        }

        .menu-btn {
          width: 100%;
          text-align: left;
          border: 0;
          background: transparent;
          padding: 10px 12px;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 700;
          color: #3b453f;
          cursor: pointer;
        }

        .menu-btn:hover {
          background: #f3f6f3;
        }

        .menu-btn.danger {
          color: #a64d45;
        }

        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(27,33,31,0.35);
          display: flex;
          justify-content: flex-end;
          z-index: 20;
        }

        .drawer {
          width: 420px;
          max-width: 100%;
          background: #fff;
          height: 100vh;
          display: flex;
          flex-direction: column;
          box-shadow: -8px 0 24px rgba(0,0,0,0.08);
        }

        .drawer-head {
          padding: 20px 22px;
          border-bottom: 1px solid #eef0ee;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .drawer-title {
          font-size: 18px;
          font-weight: 800;
          color: #232b24;
        }

        .drawer-sub {
          margin-top: 4px;
          font-size: 11px;
          color: #7a827a;
        }

        .drawer-close {
          width: 34px;
          height: 34px;
          border-radius: 11px;
          border: 1px solid #e3e7e3;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #5f6a62;
        }

        .drawer-close svg {
          width: 14px;
          height: 14px;
        }

        .drawer-body {
          flex: 1;
          overflow-y: auto;
          padding: 22px;
        }

        .img-upload {
          width: 100%;
          min-height: 120px;
          border: 1.5px dashed #d7ded7;
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #6e796f;
          margin-bottom: 18px;
          cursor: pointer;
        }

        .img-upload svg {
          width: 24px;
          height: 24px;
        }

        .img-upload span {
          font-size: 12.5px;
          font-weight: 700;
        }

        .img-upload small {
          font-size: 11px;
          color: #8c968b;
        }

        .field-group {
          margin-bottom: 16px;
        }

        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          color: #6f7a70;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        input[type="text"],
        input[type="number"],
        select,
        textarea {
          width: 100%;
          border: 1px solid #e3e7e3;
          border-radius: 11px;
          padding: 11px 13px;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          color: #212a22;
          background: #fff;
          outline: none;
        }

        input:focus,
        select:focus,
        textarea:focus {
          border-color: #5d7a61;
        }

        textarea {
          resize: vertical;
          min-height: 90px;
          font-family: 'Inter', sans-serif;
        }

        .input-prefix {
          position: relative;
        }

        .input-prefix span {
          position: absolute;
          left: 13px;
          top: 50%;
          transform: translateY(-50%);
          font-family: 'IBM Plex Mono', monospace;
          color: #6f7a70;
          font-size: 13px;
        }

        .input-prefix input {
          padding-left: 36px;
        }

        .barcode-field {
          display: grid;
          grid-template-columns: 1fr 48px;
          gap: 10px;
        }

        .scan-mini {
          width: 48px;
          border-radius: 11px;
          border: 1px solid #90a98d;
          background: #e7f0e8;
          color: #3e5a3f;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .scan-mini svg {
          width: 16px;
          height: 16px;
        }

        .hint {
          margin-top: 8px;
          font-size: 11px;
          color: #738071;
        }

        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 14px;
          background: #fbfdf8;
          border: 1px solid #e7ebe7;
          border-radius: 11px;
          margin-top: 10px;
        }

        .toggle-text .t-label {
          font-size: 13px;
          font-weight: 700;
          color: #354038;
        }

        .toggle-text .t-sub {
          font-size: 11px;
          color: #7b8578;
          margin-top: 3px;
        }

        .switch {
          width: 38px;
          height: 22px;
          border-radius: 999px;
          background: #5d7a61;
          position: relative;
          cursor: pointer;
        }

        .switch::after {
          content: "";
          position: absolute;
          top: 3px;
          right: 3px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
        }

        .drawer-foot {
          padding: 16px 22px;
          border-top: 1px solid #eef0ee;
          display: flex;
          gap: 10px;
        }

        .btn-cancel,
        .btn-save {
          flex: 1;
          padding: 12px;
          border-radius: 11px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
        }

        .btn-cancel {
          background: #f4f6f2;
          color: #5c6b5f;
          border-color: #e3e7e3;
        }

        .btn-save {
          background: #3b5f42;
          color: #fff;
          border-color: #3b5f42;
        }
      `}</style>

      <main className="products-page">
        <div className="products-shell">

          {/* =========================
              HEADER
          ========================= */}

          <header className="products-header">

            <div>
              <div className="products-eyebrow">
                Inventory
              </div>

              <div className="products-title">
                Products
              </div>

              <div className="products-description">
                Manage products, pricing and stock levels
              </div>
            </div>

            <div className="header-actions">

              <button className="header-secondary">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 3v12" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>

                Export
              </button>

              <button className="header-secondary">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M12 3v12" />
                  <path d="m17 8-5-5-5 5" />
                  <path d="M5 21h14" />
                </svg>

                Import
              </button>

              <button
                className="header-primary"
                onClick={() => openDrawer('add')}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>

                Add product
              </button>

            </div>

          </header>

          {/* =========================
              SUMMARY CARDS
          ========================= */}

          <section className="summary-grid">

            <div className="summary-card">

              <div className="summary-top">

                <span className="summary-label">
                  Total products
                </span>

                <div className="summary-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="m4 7 8-4 8 4-8 4-8-4Z" />
                    <path d="m4 7v10l8 4 8-4V7" />
                    <path d="m12 11v10" />
                  </svg>
                </div>

              </div>

              <div className="summary-value">
                {products.length}
              </div>

              <div className="summary-note">
                Active products
              </div>

            </div>

            <div className="summary-card">

              <div className="summary-top">

                <span className="summary-label">
                  Inventory units
                </span>

                <div className="summary-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M4 7h16" />
                    <path d="M6 7v13h12V7" />
                    <path d="M9 7V4h6v3" />
                  </svg>
                </div>

              </div>

              <div className="summary-value">
                {totalUnits}
              </div>

              <div className="summary-note">
                Items currently in stock
              </div>

            </div>

            <div className="summary-card">

              <div className="summary-top">

                <span className="summary-label">
                  Low stock
                </span>

                <div className="summary-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M12 3 2.5 20h19L12 3Z" />
                    <path d="M12 9v5" />
                    <path d="M12 17.5h.01" />
                  </svg>
                </div>

              </div>

              <div className="summary-value">
                {lowStockCount}
              </div>

              <div className="summary-note warning">
                Products need attention
              </div>

            </div>

            <div className="summary-card">

              <div className="summary-top">

                <span className="summary-label">
                  Inventory value
                </span>

                <div className="summary-icon">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v10" />
                    <path d="M15 9.5c0-1-1.2-1.8-3-1.8s-3 .8-3 1.8 1.2 1.7 3 1.7 3 .8 3 1.8-1.2 1.8-3 1.8-3-.8-3-1.8" />
                  </svg>
                </div>

              </div>

              <div className="summary-value">
                {formatMoney(totalInventoryValue)}
              </div>

              <div className="summary-note">
                Based on current cost
              </div>

            </div>

          </section>

          {/* =========================
              PRODUCTS TABLE
          ========================= */}

          <section className="products-panel">

            <div className="products-toolbar">

              <div className="toolbar-main">

                <label className="search-box">

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
                    placeholder="Search products by name or SKU..."
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                  />

                </label>

                <button
                  className="filter-btn"
                  onClick={() =>
                    setShowFilters(!showFilters)
                  }
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M4 6h16" />
                    <path d="M7 12h10" />
                    <path d="M10 18h4" />
                  </svg>

                  Filters
                </button>

                <select
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value)
                  }
                >
                  <option value="name">
                    Sort: Name
                  </option>

                  <option value="price-high">
                    Price: High to Low
                  </option>

                  <option value="price-low">
                    Price: Low to High
                  </option>

                  <option value="stock-low">
                    Stock: Low to High
                  </option>

                  <option value="stock-high">
                    Stock: High to Low
                  </option>
                </select>

              </div>

              {showFilters && (
                <div className="filter-row">

                  <button
                    className={
                      'filter-chip' +
                      (stockFilter === 'All'
                        ? ' active'
                        : '')
                    }
                    onClick={() =>
                      setStockFilter('All')
                    }
                  >
                    All stock
                  </button>

                  <button
                    className={
                      'filter-chip' +
                      (stockFilter === 'In stock'
                        ? ' active'
                        : '')
                    }
                    onClick={() =>
                      setStockFilter('In stock')
                    }
                  >
                    In stock
                  </button>

                  <button
                    className={
                      'filter-chip' +
                      (stockFilter === 'Low stock'
                        ? ' active'
                        : '')
                    }
                    onClick={() =>
                      setStockFilter('Low stock')
                    }
                  >
                    Low stock
                  </button>

                  <button
                    className={
                      'filter-chip' +
                      (stockFilter === 'Out of stock'
                        ? ' active'
                        : '')
                    }
                    onClick={() =>
                      setStockFilter('Out of stock')
                    }
                  >
                    Out of stock
                  </button>

                </div>
              )}

              <div className="filter-row">

                {categories.map((item) => (
                  <button
                    key={item}
                    className={
                      'filter-chip' +
                      (category === item
                        ? ' active'
                        : '')
                    }
                    onClick={() =>
                      setCategory(item)
                    }
                  >
                    {item}
                  </button>
                ))}

                <span className="results-count">
                  {filteredProducts.length} products
                </span>

              </div>

            </div>

            {filteredProducts.length === 0 ? (

              <div className="empty-state">

                <div className="empty-state-icon">

                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-4-4" />
                  </svg>

                </div>

                <div className="empty-state-title">
                  No products found
                </div>

                <div className="empty-state-text">
                  Try changing your search or filters.
                </div>

              </div>

            ) : (

              <div className="products-table">

                {/* TABLE HEADER */}

                <div className="table-head">

                  <div>Product</div>
                  <div>Category</div>
                  <div>Price</div>
                  <div>Cost</div>
                  <div>Margin</div>
                  <div>Stock</div>
                  <div />

                </div>

                {/* PRODUCT ROWS */}

                {filteredProducts.map((product) => {

                  const status =
                    getStockStatus(product)

                  const margin =
                    product.price - product.cost

                  const marginPercent =
                    product.price > 0
                      ? (margin / product.price) * 100
                      : 0

                  const initial =
                    product.name.charAt(0).toUpperCase()

                  return (
                    <div
                      className="product-row"
                      key={product.id}
                    >

                      {/* PRODUCT */}

                      <div className="product-info">

                              <div className="product-avatar">
                                  {product.imageUrl ? (
                                    (() => {
                                      const src = product.imageUrl && String(product.imageUrl)
                                      const imageSrc = src && (src.startsWith('http') || src.startsWith('data:')) ? src : `${import.meta.env.VITE_API_URL}${src}`
                                      return <img src={imageSrc} alt={product.name} style={{ width: 43, height: 43, borderRadius: 11, objectFit: 'cover' }} />
                                    })()
                                  ) : (
                                    initial
                                  )}
                              </div>

                        <div className="product-details">

                          <div className="product-name">
                            {product.name}
                          </div>

                          <div className="product-sku">
                            {product.sku}
                          </div>

                        </div>

                      </div>

                      {/* CATEGORY */}

                      <div>
                        <span className="category-label">
                          {product.category}
                        </span>
                      </div>

                      {/* PRICE */}

                      <div className="price-value">
                        {formatMoney(product.price)}
                      </div>

                      {/* COST */}

                      <div className="cost-value">
                        {formatMoney(product.cost)}
                      </div>

                      {/* MARGIN */}

                      <div className="margin-value">
                        {marginPercent.toFixed(0)}%
                      </div>

                      {/* STOCK */}

                      <div className="stock-column">

                        <div className="stock-number">
                          {product.stock}{' '}
                          <span
                            style={{
                              color: '#a0a6a1',
                              fontSize: '8px',
                              fontWeight: 500,
                            }}
                          >
                            {product.unit}s
                          </span>
                        </div>

                        <span
                          className={
                            'stock-status ' +
                            status.className
                          }
                        >
                          {status.label}
                        </span>

                      </div>

                      {/* ACTION */}

                      <div>

                        <div className="action-menu-wrapper">
                        <button
                          className="action-btn"
                          title="More actions"
                          onClick={() =>
                            toggleActionMenu(product.id)
                          }
                        >
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <circle
                              cx="5"
                              cy="12"
                              r="1"
                            />
                            <circle
                              cx="12"
                              cy="12"
                              r="1"
                            />
                            <circle
                              cx="19"
                              cy="12"
                              r="1"
                            />
                          </svg>
                        </button>

                        {openActionProduct === product.id && (
                          <div className="action-menu">
                            <button
                              type="button"
                              className="menu-btn"
                              onClick={() => restockProduct(product)}
                            >
                              Restock
                            </button>
                            <button
                              type="button"
                              className="menu-btn"
                              onClick={() =>
                                handleEditProduct(product)
                              }
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="menu-btn"
                              onClick={() =>
                                setOpenActionProduct(null)
                              }
                            >
                              Hide
                            </button>
                          </div>
                        )}
                      </div>

                      </div>

                    </div>
                  )
                })}

              </div>

            )}

            {/* FOOTER */}

            <div className="products-footer">

              <div className="footer-info">
                Showing {filteredProducts.length} of{' '}
                {products.length} products
              </div>

              <div className="pagination">

                <button className="page-btn">
                  ‹
                </button>

                <button className="page-btn active">
                  1
                </button>

                <button className="page-btn">
                  2
                </button>

                <button className="page-btn">
                  3
                </button>

                <button className="page-btn">
                  ›
                </button>

              </div>

            </div>

          </section>

          {showDrawer && (
            <div
              className="overlay"
              onClick={closeDrawer}
            >
              <aside
                className="drawer"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="drawer-head">
                  <div>
                    <div className="drawer-title">
                      {drawerMode === 'add'
                        ? 'Add product'
                        : 'Edit product'}
                    </div>
                    <div className="drawer-sub">
                      {drawerMode === 'add'
                        ? 'Enter product details below.'
                        : activeProduct
                        ? `${activeProduct.name} · ${activeProduct.sku}`
                        : ''}
                    </div>
                  </div>
                  <div
                    className="drawer-close"
                    onClick={closeDrawer}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6 6 18" />
                      <path d="M6 6l12 12" />
                    </svg>
                  </div>
                </div>

                <div className="drawer-body">
                    <label className="img-upload" htmlFor="product-image-upload">
                      {formProduct.imagePreview ? (
                        <div style={{ position: 'relative', width: '100%' }}>
                          <img src={formProduct.imagePreview} alt="preview" style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'cover' }} />
                          <button type="button" onClick={(e) => { e.preventDefault(); removeImage() }} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 8px', cursor: 'pointer' }}>Remove</button>
                        </div>
                      ) : (
                        <>
                          <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="9" cy="9" r="2" />
                            <path d="m21 15-5-5L5 21" />
                          </svg>
                          <span>Upload product image</span>
                          <small>PNG or JPG, up to 2MB</small>
                        </>
                      )}
                      <input id="product-image-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
                    </label>

                  <div className="field-group">
                    <label>Product name</label>
                    <input
                      type="text"
                      value={formProduct.name}
                      onChange={(e) =>
                        setFormProduct((current) => ({
                          ...current,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="field-group">
                    <label>Barcode / SKU</label>
                    <div className="barcode-field">
                      <input
                        type="text"
                        value={formProduct.sku}
                        onChange={(e) =>
                          setFormProduct((current) => ({
                            ...current,
                            sku: e.target.value,
                          }))
                        }
                      />
                      <div className="scan-mini">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                          <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                          <path d="M7 12h10" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="field-row">
                    <div>
                      <label>Category</label>
                      <select
                        value={formProduct.category}
                        onChange={(e) =>
                          setFormProduct((current) => ({
                            ...current,
                            category: e.target.value,
                          }))
                        }
                      >
                        <option>Food</option>
                        <option>Drinks</option>
                        <option>Snacks</option>
                        <option>Bakery</option>
                        <option>Household</option>
                      </select>
                    </div>
                    <div>
                      <label>Unit</label>
                      <select
                        value={formProduct.unit}
                        onChange={(e) =>
                          setFormProduct((current) => ({
                            ...current,
                            unit: e.target.value,
                          }))
                        }
                      >
                        <option>Plate</option>
                        <option>Bottle</option>
                        <option>Can</option>
                        <option>Piece</option>
                        <option>Loaf</option>
                      </select>
                    </div>
                  </div>

                  <div className="field-row">
                    <div>
                      <label>Selling price</label>
                      <div className="input-prefix">
                        <span>GH₵</span>
                        <input
                          type="number"
                          value={formProduct.price}
                          onChange={(e) =>
                            setFormProduct((current) => ({
                              ...current,
                              price: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <label>Cost price</label>
                      <div className="input-prefix">
                        <span>GH₵</span>
                        <input
                          type="number"
                          value={formProduct.cost}
                          onChange={(e) =>
                            setFormProduct((current) => ({
                              ...current,
                              cost: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="field-row">
                    <div>
                      <label>Stock quantity</label>
                      <input
                        type="number"
                        value={formProduct.stock}
                        onChange={(e) =>
                          setFormProduct((current) => ({
                            ...current,
                            stock: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label>Low stock alert at</label>
                      <input
                        type="number"
                        value={formProduct.minStock}
                        onChange={(e) =>
                          setFormProduct((current) => ({
                            ...current,
                            minStock: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="hint">
                    You'll get a dashboard alert when stock drops to the selected low-stock threshold.
                  </div>

                  <div className="field-group">
                    <label>Description (optional)</label>
                    <textarea
                      value={formProduct.description}
                      onChange={(e) =>
                        setFormProduct((current) => ({
                          ...current,
                          description: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="toggle-row">
                    <div className="toggle-text">
                      <div className="t-label">Track inventory</div>
                      <div className="t-sub">Stock reduces automatically on each sale</div>
                    </div>
                    <div className="switch" />
                  </div>
                </div>

                <div className="drawer-foot">
                  <button
                    className="btn-cancel"
                    onClick={closeDrawer}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-save"
                    onClick={handleSaveProduct}
                  >
                    Save changes
                  </button>
                </div>
              </aside>
            </div>
          )}

            {/* Success modal */}
            {showSuccess && (
              <div className="overlay" onClick={() => setShowSuccess(false)}>
                <div className="drawer" style={{ width: 420, maxWidth: '90%', margin: 'auto', height: 'auto' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ padding: 22 }}>
                    <h3 style={{ marginTop: 0 }}>Success</h3>
                    <p>{successMessage}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn-save" onClick={() => setShowSuccess(false)}>OK</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error modal */}
            {showError && (
              <div className="overlay" onClick={() => setShowError(false)}>
                <div className="drawer" style={{ width: 420, maxWidth: '90%', margin: 'auto', height: 'auto' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ padding: 22 }}>
                    <h3 style={{ marginTop: 0 }}>Error</h3>
                    <p>{errorMessage}</p>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <button className="btn-cancel" onClick={() => setShowError(false)}>Close</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* =========================
              BOTTOM INFORMATION
          ========================= */}

          <div className="bottom-grid">

            {/* LOW STOCK */}

            <section className="bottom-panel">

              <div className="bottom-head">

                <div className="bottom-title">
                  Products needing attention
                </div>

                <button className="bottom-link">
                  View all
                </button>

              </div>

              <div className="low-stock-list">

                {products
                  .filter(
                    (product) =>
                      product.stock <=
                      product.minStock
                  )
                  .slice(0, 4)
                  .map((product) => (
                    <div
                      className="low-stock-item"
                      key={product.id}
                    >

                      <div>

                        <div className="low-stock-name">
                          {product.name}
                        </div>

                        <div className="low-stock-sku">
                          {product.sku}
                        </div>

                      </div>

                      <div className="low-stock-count">
                        {product.stock === 0
                          ? 'Out of stock'
                          : `${product.stock} left`}
                      </div>

                    </div>
                  ))}

              </div>

            </section>

            {/* INVENTORY INSIGHT */}

            <section className="bottom-panel">

              <div className="bottom-head">

                <div className="bottom-title">
                  Inventory overview
                </div>

              </div>

              <div className="inventory-insight">

                <div className="insight-row">

                  <span className="insight-label">
                    Total products
                  </span>

                  <span className="insight-value">
                    {products.length}
                  </span>

                </div>

                <div className="insight-row">

                  <span className="insight-label">
                    Total units
                  </span>

                  <span className="insight-value">
                    {totalUnits}
                  </span>

                </div>

                <div className="insight-row">

                  <span className="insight-label">
                    Low stock items
                  </span>

                  <span
                    className="insight-value"
                    style={{
                      color: '#9b773e',
                    }}
                  >
                    {lowStockCount}
                  </span>

                </div>

                <div className="insight-row">

                  <span className="insight-label">
                    Out of stock
                  </span>

                  <span
                    className="insight-value"
                    style={{
                      color: '#a45b53',
                    }}
                  >
                    {outOfStockCount}
                  </span>

                </div>

                <div className="insight-row">

                  <span className="insight-label">
                    Inventory cost value
                  </span>

                  <span className="insight-value">
                    {formatMoney(totalInventoryValue)}
                  </span>

                </div>

              </div>

            </section>

          </div>

        </div>
      </main>
    </>
  )
}
