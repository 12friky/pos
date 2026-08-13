import '../styles/sale-receipt.css'

const money = (value) => `GH₵ ${Number(value || 0).toFixed(2)}`

export default function SaleReceipt({ receipt, onNewSale }) {
  const isValidReceipt =
    receipt &&
    Array.isArray(receipt.items) &&
    receipt.items.length > 0 &&
    Number.isFinite(receipt.total) &&
    Number.isFinite(receipt.received) &&
    receipt.received >= receipt.total

  if (!isValidReceipt) return null

  const logo = receipt.businessLogoUrl
  const logoSrc = logo && (String(logo).startsWith('http') || String(logo).startsWith('data:')) ? logo : (logo ? `${import.meta.env.VITE_API_URL}${logo}` : null)
  const businessName = receipt.businessName || 'Till POS Store'

  return (
    <div className="receipt-modal" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
      <div className="receipt-paper">
        <header className="receipt-store" style={{ textAlign: 'center' }}>
          {logoSrc ? (
            <img src={logoSrc} alt={businessName} style={{ width: 88, height: 88, objectFit: 'contain', margin: '0 auto', borderRadius: 12 }} />
          ) : null}
          <h1 id="receipt-title" style={{ marginTop: 8 }}>{businessName}</h1>
          <p>12 Market Street, Accra</p>
          <p>Phone: +233 30 123 4567</p>
          <strong>SALE RECEIPT</strong>
        </header>

        <div className="receipt-barcode" aria-label={`Receipt number ${receipt.orderNumber}`}>
          <span />
        </div>

        <dl className="receipt-meta">
          <div><dt>Order #</dt><dd>{receipt.orderNumber}</dd></div>
          <div><dt>Sold to</dt><dd>{receipt.customer}</dd></div>
          <div><dt>Order date</dt><dd>{receipt.date}</dd></div>
          <div><dt>Order time</dt><dd>{receipt.time}</dd></div>
          <div><dt>Sales person</dt><dd>{receipt.cashier}</dd></div>
          <div><dt>Register</dt><dd>{receipt.register}</dd></div>
          <div><dt>Payment</dt><dd>{receipt.payment}</dd></div>
        </dl>

        <div className="receipt-divider" />
        <div className="receipt-items">
          {receipt.items.map((item) => (
            <div className="receipt-item" key={item.id}>
              <span>{item.name}</span>
              <span>× {item.quantity}</span>
              <strong>{money(item.price * item.quantity)}</strong>
            </div>
          ))}
        </div>
        <div className="receipt-divider" />

        <div className="receipt-totals">
          <div><span>Subtotal</span><span>{money(receipt.subtotal)}</span></div>
          {receipt.discount > 0 && <div><span>Discount</span><span>({money(receipt.discount)})</span></div>}
          <div className="receipt-grand-total"><strong>Total</strong><strong>{money(receipt.total)}</strong></div>
          <div><span>{receipt.payment === 'Cash' ? 'Cash tendered' : 'Amount received'}</span><span>{money(receipt.received)}</span></div>
          {receipt.payment === 'Cash' && <div className="receipt-change"><strong>Change due</strong><strong>{money(receipt.change)}</strong></div>}
        </div>

        <footer className="receipt-footer">
          <p>Thank you for shopping with us.</p>
          <strong>30% off your next order with code LOCAL!</strong>
        </footer>
      </div>

      <div className="receipt-actions no-print">
        <button className="receipt-print-btn" onClick={() => window.print()}>Print receipt</button>
        <button className="receipt-new-sale-btn" onClick={onNewSale}>New sale</button>
      </div>
    </div>
  )
}
