import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../styles/auth.css'

export default function Register({ onLogin }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('pos@gmail.com')
  const [password, setPassword] = useState('pos123')
  const [confirmPassword, setConfirmPassword] = useState('pos123')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setError('')
    onLogin()
    navigate('/', { replace: true })
  }

  return (
    <main className="auth-page">
      <section className="auth-panel auth-panel-alt">
        <div className="auth-brand">
          <div className="auth-mark">T</div>
          <div>
            <h1>Create your account</h1>
            <p>Register and start managing sales, inventory, and reports.</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Maya Antwi"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="input-row">
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-button" type="submit">
            Create account
          </button>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </form>
      </section>
    </main>
  )
}
