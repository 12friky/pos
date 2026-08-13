/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/register.css';

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const [step, setStep] = useState(1);
  const [isVisible, setIsVisible] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [showOtpSuccess, setShowOtpSuccess] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const [form, setForm] = useState({
    businessName: '',
    businessType: '',
    category: '',
    businessPhone: '',
    location: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    let timer;
    if (step === 3 && otpTimer > 0) {
      timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
    } else if (otpTimer === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, otpTimer]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setError('');
  };

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!form.businessName || !form.businessType || !form.category || !form.businessPhone || !form.location) {
        setError('Please complete all business information.');
        return;
      }
    }
    if (step === 2) {
      if (!form.ownerName || !form.email || !form.phone || !form.password || !form.confirmPassword) {
        setError('Please complete all account information.');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (form.password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
    }
    setStep((s) => s + 1);
    if (step === 2) {
      setOtp(['', '', '', '', '', '']);
      setOtpTimer(60);
      setCanResend(false);
      setOtpError('');
    }
  };

  const previousStep = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setOtpError('');
    if (value && index < 5) {
      const el = document.getElementById(`otp-${index + 1}`);
      if (el) el.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const el = document.getElementById(`otp-${index - 1}`);
      if (el) el.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').slice(0, 6).split('');
    if (paste.length === 6 && paste.every((c) => /\d/.test(c))) {
      setOtp(paste);
      const el = document.getElementById('otp-5');
      if (el) el.focus();
    }
  };

  const handleVerifyOtp = () => {
    const s = otp.join('');
    if (s.length !== 6) {
      setOtpError('Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (s === '123456') {
        setIsOtpVerified(true);
        setShowOtpSuccess(true);
        setTimeout(() => setShowOtpSuccess(false), 2500);
      } else {
        setOtpError('Invalid OTP.');
        setOtp(['', '', '', '', '', '']);
      }
    }, 1000);
  };

  const handleResendOtp = () => {
    setOtpTimer(60);
    setCanResend(false);
    setOtpError('');
    setTimeout(() => console.log('OTP resent'), 500);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
    setLogoFile(file);
  };

  const removeLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
    const inp = document.getElementById('logo-upload');
    if (inp) inp.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOtpVerified) {
      setError('Please verify your phone number first.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const registrationData = new FormData();
      registrationData.append('name', form.ownerName);
      registrationData.append('email', form.email);
      registrationData.append('password', form.password);
      registrationData.append('businessName', form.businessName);
      registrationData.append('businessType', form.businessType);
      registrationData.append('category', form.category);
      registrationData.append('businessPhone', form.businessPhone);
      registrationData.append('location', form.location);
      registrationData.append('phone', form.phone);
      if (logoFile) registrationData.append('logo', logoFile);

      const response = await fetch(API_URL + '/api/auth/register', {
        method: 'POST',
        body: registrationData,
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.errors?.[0]?.msg || 'Unable to create your account.');
        return;
      }

      onLogin(data.token, data.user);
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="register-page">
      <div className="register-bg-grid" aria-hidden="true"></div>
      <div className="register-glow register-glow-one" aria-hidden="true"></div>
      <div className="register-glow register-glow-two" aria-hidden="true"></div>

      <section className={`register-shell ${isVisible ? 'fade-in' : ''}`}>
        <aside className="register-showcase">
          <div className="showcase-brand">
            <div className="brand-logo-frame">
              {/* Replace this placeholder with your company logo when ready. */}
              <div className="brand-logo-placeholder">LOGO</div>
            </div>
            <span>Your Business</span>
          </div>

          <div className="showcase-content">
            <span className="showcase-eyebrow">SMART BUSINESS MANAGEMENT</span>
            <h1>Everything your business needs, <em>in one place.</em></h1>
            <p>
              Create your business account and get a clean, powerful workspace
              built to help you manage your POS with confidence.
            </p>

            <div className="showcase-points">
              <div className="showcase-point">
                <span className="point-icon">✓</span>
                <div>
                  <strong>Simple setup</strong>
                  <small>Get started in just a few steps.</small>
                </div>
              </div>
              <div className="showcase-point">
                <span className="point-icon">✓</span>
                <div>
                  <strong>Secure account</strong>
                  <small>Your account starts with phone verification.</small>
                </div>
              </div>
              <div className="showcase-point">
                <span className="point-icon">✓</span>
                <div>
                  <strong>Built for growth</strong>
                  <small>Organize your business from day one.</small>
                </div>
              </div>
            </div>
          </div>

          <div className="showcase-footer">
            <span className="status-dot"></span>
            Secure business registration
          </div>
        </aside>

        <section className="register-card">
          <div className="mobile-brand">
            <div className="brand-logo-frame">
              {/* Replace this placeholder with your company logo when ready. */}
              <div className="brand-logo-placeholder">LOGO</div>
            </div>
            <div>
              <strong>Your Business</strong>
              <small>Business management</small>
            </div>
          </div>

          <div className="register-header">
            <div>
              <span className="step-kicker">STEP {step} OF 3</span>
              <h2>
                {step === 1 && 'Register your business'}
                {step === 2 && 'Create your account'}
                {step === 3 && 'Verify your phone'}
              </h2>
              <p>
                {step === 1 && 'Tell us a little about your business to get started.'}
                {step === 2 && 'Create the account you will use to manage your POS.'}
                {step === 3 && 'Enter the 6-digit code sent to your phone number.'}
              </p>
            </div>
          </div>

          <div className="register-progress" aria-label={`Registration step ${step} of 3`}>
            <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
              <span>
                {step > 1 ? (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M12 3.75L5.6 10.15L3 7.55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : '1'}
              </span>
              <small>Business</small>
            </div>

            <div className={`progress-line ${step > 1 ? 'filled' : ''}`}></div>

            <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
              <span>
                {step > 2 ? (
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                    <path d="M12 3.75L5.6 10.15L3 7.55" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : '2'}
              </span>
              <small>Account</small>
            </div>

            <div className={`progress-line ${step > 2 ? 'filled' : ''}`}></div>

            <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
              <span>3</span>
              <small>Verify</small>
            </div>
          </div>

          <form className="register-form" onSubmit={handleSubmit}>
            {step === 1 && (
              <div className="register-step">
                <div className="logo-upload-section">
                  <div className="upload-copy">
                    <div className="upload-icon">
                      <svg width="19" height="19" viewBox="0 0 19 19" fill="none">
                        <path d="M9.5 12.5V3.5M9.5 3.5L6 7M9.5 3.5L13 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M4 10.5V14.25C4 15.2165 4.7835 16 5.75 16H13.25C14.2165 16 15 15.2165 15 14.25V10.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <strong>Business logo</strong>
                      <span>Add your company logo <b>· Optional</b></span>
                    </div>
                  </div>

                  <label className="logo-drop-zone" htmlFor="logo-upload">
                    {logoPreview ? (
                      <div className="logo-preview-container">
                        <img src={logoPreview} alt="Logo preview" className="logo-preview" />
                        <button type="button" className="remove-logo-btn" onClick={(e) => { e.preventDefault(); removeLogo(); }} aria-label="Remove logo">
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="logo-placeholder">
                        <div className="logo-placeholder-icon">+</div>
                        <strong>Upload logo</strong>
                        <span>PNG, JPG, SVG or WEBP</span>
                        <small>Up to 5MB</small>
                      </div>
                    )}
                    <input id="logo-upload" className="logo-input" type="file" accept="image/*" onChange={handleLogoUpload} />
                  </label>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Business name</label>
                    <input type="text" placeholder="e.g. Francis Enterprise" value={form.businessName} onChange={(e) => updateField('businessName', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Business type</label>
                    <input type="text" placeholder="e.g. Retail shop" value={form.businessType} onChange={(e) => updateField('businessType', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <input type="text" placeholder="e.g. Fashion & clothing" value={form.category} onChange={(e) => updateField('category', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Business phone</label>
                    <input type="tel" placeholder="e.g. 024 XXX XXXX" value={form.businessPhone} onChange={(e) => updateField('businessPhone', e.target.value)} />
                  </div>
                  <div className="form-group full-width">
                    <label>Business location</label>
                    <input type="text" placeholder="City, area or shop location" value={form.location} onChange={(e) => updateField('location', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="register-step">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Owner name</label>
                    <input type="text" placeholder="Your full name" value={form.ownerName} onChange={(e) => updateField('ownerName', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Email address</label>
                    <input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Phone number</label>
                    <input type="tel" placeholder="e.g. 024 XXX XXXX" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" placeholder="At least 6 characters" value={form.password} onChange={(e) => updateField('password', e.target.value)} />
                  </div>
                  <div className="form-group full-width">
                    <label>Confirm password</label>
                    <input type="password" placeholder="Enter your password again" value={form.confirmPassword} onChange={(e) => updateField('confirmPassword', e.target.value)} />
                  </div>
                </div>

                <div className="security-note">
                  <span>⌁</span>
                  <div>
                    <strong>Your information stays protected</strong>
                    <small>Use a password you don't use on other accounts.</small>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="register-step otp-step">
                <div className="otp-instructions">
                  <div className="otp-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="7" y="3" width="10" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.7"/>
                      <path d="M10 6H14M11 18H13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h3>Check your phone</h3>
                  <p>We sent a verification code to <strong>{form.phone || 'your phone'}</strong></p>
                </div>

                <div className="otp-container" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      className={`otp-input ${otpError ? 'error' : ''}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value.replace(/[^0-9]/g, ''))}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      aria-label={`Verification digit ${i + 1}`}
                    />
                  ))}
                </div>

                {otpError && (
                  <div className="otp-error">
                    <span>!</span>
                    {otpError}
                  </div>
                )}

                {showOtpSuccess && (
                  <div className="otp-success">
                    <span>✓</span> Phone verified successfully
                  </div>
                )}

                <div className="otp-timer">
                  {canResend ? (
                    <button type="button" className="otp-resend" onClick={handleResendOtp}>Resend verification code</button>
                  ) : (
                    <>Didn't receive it? Resend in <strong>{otpTimer}s</strong></>
                  )}
                </div>

                <button type="button" className="verify-otp-button" onClick={handleVerifyOtp} disabled={loading || isOtpVerified}>
                  {loading ? <><span className="spinner"></span> Verifying...</> : isOtpVerified ? <>✓ Verified</> : <>Verify phone</>}
                </button>
              </div>
            )}

            <div className="form-bottom">
              {error && (
                <div className="register-error">
                  <span>!</span>
                  {error}
                </div>
              )}

              <div className="form-actions">
                {step > 1 && (
                  <button type="button" className="back-button" onClick={previousStep}>
                    <span>←</span> Back
                  </button>
                )}
                {step < 3 && (
                  <button type="button" className="continue-button" onClick={nextStep}>
                    Continue <span>→</span>
                  </button>
                )}
                {step === 3 && (
                  <button type="submit" className="continue-button submit-button" disabled={loading}>
                    {loading ? <><span className="spinner"></span> Creating account...</> : <>Complete registration <span>→</span></>}
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="register-login">
            Already have an account?
            <button type="button" onClick={() => navigate('/login')}>Sign in</button>
          </div>

          <div className="register-footer">
            <span>🔒</span> Your data is handled securely
          </div>
        </section>
      </section>
    </main>
  );
}
