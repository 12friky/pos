import { useEffect, useState } from 'react'
import '../styles/settings.css'

const emptySettings = {
  name: '', businessName: '', businessType: '', category: '',
  businessPhone: '', location: '', phone: '', email: '', businessLogoUrl: '',
}

export default function Settings({ onUserUpdated }) {
  const [form, setForm] = useState(emptySettings)
  const [logo, setLogo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('posToken')
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!response.ok) throw new Error('Unable to load settings')
        const { user } = await response.json()
        setForm({ ...emptySettings, ...user })
      } catch (err) {
        setError(err.message || 'Unable to load settings')
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')
    try {
      const token = localStorage.getItem('posToken')
      const data = new FormData()
      ;['name', 'businessName', 'businessType', 'category', 'businessPhone', 'location', 'phone'].forEach((field) => data.append(field, form[field] || ''))
      if (logo) data.append('logo', logo)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
        method: 'PUT', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: data,
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.message || 'Unable to save settings')
      setForm({ ...emptySettings, ...body.user })
      localStorage.setItem('posUser', JSON.stringify(body.user))
      onUserUpdated(body.user)
      setLogo(null)
      setMessage('Settings saved successfully.')
    } catch (err) {
      setError(err.message || 'Unable to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <main className="settings-page"><p>Loading settings…</p></main>

  return (
    <main className="settings-page">
      <header className="settings-header">
        <div><span>BUSINESS SETTINGS</span><h1>Settings</h1><p>Manage the business and cashier details shown across your POS.</p></div>
      </header>
      <form className="settings-form" onSubmit={save}>
        <section className="settings-card">
          <h2>Business profile</h2>
          <p>These details identify your business on receipts and throughout the POS.</p>
          <div className="settings-logo-row">
            {form.businessLogoUrl ? <img src={form.businessLogoUrl} alt="Business logo" /> : <div className="settings-logo-placeholder">{(form.businessName || 'B').slice(0, 1).toUpperCase()}</div>}
            <label className="settings-upload">Change logo<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => setLogo(event.target.files?.[0] || null)} /></label>
          </div>
          <div className="settings-grid">
            <label>Business name<input required value={form.businessName} onChange={(e) => update('businessName', e.target.value)} /></label>
            <label>Business phone<input value={form.businessPhone} onChange={(e) => update('businessPhone', e.target.value)} /></label>
            <label>Business type<input value={form.businessType} onChange={(e) => update('businessType', e.target.value)} placeholder="e.g. Restaurant" /></label>
            <label>Category<input value={form.category} onChange={(e) => update('category', e.target.value)} placeholder="e.g. Food and beverage" /></label>
            <label className="settings-full">Location / address<input value={form.location} onChange={(e) => update('location', e.target.value)} /></label>
          </div>
        </section>
        <section className="settings-card">
          <h2>Cashier account</h2><p>Update the person operating this POS account.</p>
          <div className="settings-grid">
            <label>Full name<input required value={form.name} onChange={(e) => update('name', e.target.value)} /></label>
            <label>Personal phone<input value={form.phone} onChange={(e) => update('phone', e.target.value)} /></label>
            <label className="settings-full">Email address<input value={form.email} disabled /></label>
          </div>
        </section>
        {error && <p className="settings-error">{error}</p>}
        {message && <p className="settings-success">{message}</p>}
        <div className="settings-actions"><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button></div>
      </form>
    </main>
  )
}
