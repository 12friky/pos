import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/login.css'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSignup, setShowSignup] = useState(false)
  const [signupData, setSignupData] = useState({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    businessType: '',
    category: '',
    location: ''
  })

  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (email === 'pos@gmail.com' && password === 'pos123') {
      setLoading(true)

      setTimeout(() => {
        onLogin()
        navigate('/', { replace: true })
      }, 700)

      return
    }

    setError('Incorrect email or password')
  }

  const handleSignupSubmit = (e) => {
    e.preventDefault()
    console.log('Business registration:', signupData)
    setShowSignup(false)
  }

  return (
    <main className="login-page">
      <div className="login-background-shape shape-one"></div>
      <div className="login-background-shape shape-two"></div>
      
      <div className="login-container">
        {/* Left Section - Form */}
        <section className="login-card">
          <div className="login-logo">
            <span>T</span>
          </div>

          <div className="login-heading">
            <h1>Welcome back</h1>
            <p>Sign in to continue to your POS dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <div className="input-container">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="pos@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-container">
                <span className="input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="login-error">
                <span>!</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`login-button ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <span className="arrow">→</span>
                </>
              )}
            </button>
          </form>

          <div className="signup-prompt">
            <span>Don't have an account?</span>
            <button 
              className="signup-link"
              onClick={() => setShowSignup(true)}
            >
              Sign up
            </button>
          </div>

          <div className="login-footer">
            <span>Point of Sale</span>
            <span className="footer-dot">•</span>
            <span>Business Management</span>
          </div>
        </section>

        {/* Right Section - Animated SVG */}
        <section className="login-visual">
          <div className="visual-content">
            <svg className="animated-svg" viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="200" cy="200" r="120" className="svg-circle-main" fill="rgba(46, 125, 82, 0.1)" stroke="#2e7d52" strokeWidth="2"/>
              <g className="svg-rotating">
                <circle cx="200" cy="80" r="8" fill="#2e7d52"/>
                <circle cx="320" cy="200" r="6" fill="#e8943a"/>
                <circle cx="200" cy="320" r="10" fill="#2e7d52" opacity="0.7"/>
                <circle cx="80" cy="200" r="5" fill="#e8943a" opacity="0.8"/>
              </g>
              <g className="svg-floating">
                <rect x="160" y="160" width="80" height="80" rx="20" fill="rgba(46, 125, 82, 0.2)" stroke="#2e7d52" strokeWidth="2"/>
                <path d="M180 200 L200 180 L220 200 L200 220 Z" fill="#2e7d52" opacity="0.6"/>
              </g>
              <circle cx="200" cy="200" r="3" fill="#2e7d52" className="svg-pulse-dot"/>
              <ellipse cx="200" cy="200" rx="180" ry="60" className="svg-orbit-ring" fill="none" stroke="rgba(46, 125, 82, 0.2)" strokeWidth="1" strokeDasharray="5 5"/>
              <ellipse cx="200" cy="200" rx="60" ry="180" className="svg-orbit-ring-2" fill="none" stroke="rgba(232, 148, 58, 0.2)" strokeWidth="1" strokeDasharray="5 5"/>
            </svg>
          </div>
        </section>
      </div>

      {/* Business Registration Modal - Horizontal Layout */}
      {showSignup && (
        <div className="modal-overlay" onClick={() => setShowSignup(false)}>
          <div className="business-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSignup(false)}>×</button>
            
            <div className="modal-header">
              <div className="modal-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4"/>
                  <path d="M9 9h.01M9 12h.01M9 15h.01M9 18h.01M15 9h.01M15 12h.01M15 15h.01M15 18h.01"/>
                </svg>
              </div>
              <div>
                <h2>Business Registration</h2>
                <p>Register your business to get started</p>
              </div>
            </div>

            <form onSubmit={handleSignupSubmit} className="business-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="businessName">Business Name</label>
                  <input
                    id="businessName"
                    type="text"
                    placeholder="ABC Fashion Shop"
                    value={signupData.businessName}
                    onChange={(e) => setSignupData({...signupData, businessName: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ownerName">Owner Name</label>
                  <input
                    id="ownerName"
                    type="text"
                    placeholder="John Mensah"
                    value={signupData.ownerName}
                    onChange={(e) => setSignupData({...signupData, ownerName: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="regEmail">Email</label>
                  <input
                    id="regEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={signupData.email}
                    onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone</label>
                  <input
                    id="phone"
                    type="tel"
                    placeholder="024 XXX XXXX"
                    value={signupData.phone}
                    onChange={(e) => setSignupData({...signupData, phone: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="businessType">Business Type</label>
                  <select
                    id="businessType"
                    value={signupData.businessType}
                    onChange={(e) => setSignupData({...signupData, businessType: e.target.value})}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="retail">Retail</option>
                    <option value="wholesale">Wholesale</option>
                    <option value="service">Service</option>
                    <option value="manufacturing">Manufacturing</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    value={signupData.category}
                    onChange={(e) => setSignupData({...signupData, category: e.target.value})}
                    required
                  >
                    <option value="">Select category</option>
                    <option value="fashion">Fashion</option>
                    <option value="electronics">Electronics</option>
                    <option value="food">Food & Beverage</option>
                    <option value="health">Health & Beauty</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="location">Location</label>
                <input
                  id="location"
                  type="text"
                  placeholder="Accra, Ghana"
                  value={signupData.location}
                  onChange={(e) => setSignupData({...signupData, location: e.target.value})}
                  required
                />
              </div>

              <button type="submit" className="business-submit">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                Register Business
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}