import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import '../styles/login.css'

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.message || data.errors?.[0]?.msg || 'Incorrect email or password')
        return
      }

      onLogin(data.token, data.user)
      navigate('/', { replace: true })
    } catch (err) {
      console.error(err)
      setError('Unable to login. Please try again.')
    } finally {
      setLoading(false)
    }
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
              type="button"
              className="signup-link"
              onClick={() => navigate('/register')}
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
    </main>
  )
}