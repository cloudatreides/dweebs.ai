import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { user, loading: authLoading, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth()

  // Redirect to /home if already authenticated (e.g. after OAuth callback)
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/home', { replace: true })
    }
  }, [user, authLoading])
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmSent, setConfirmSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password)
        setConfirmSent(true)
      } else {
        await signInWithEmail(email, password)
        navigate('/home')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message)
    }
  }

  if (confirmSent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6" style={{ background: '#0D0D0F' }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-4">✉️</div>
          <h1 className="text-xl font-bold text-white mb-2">Check your email</h1>
          <p className="text-sm mb-6" style={{ color: '#9CA3AF' }}>
            We sent a confirmation link to <span className="text-white">{email}</span>. Click it to activate your account.
          </p>
          <button
            onClick={() => { setConfirmSent(false); setIsSignUp(false) }}
            className="text-sm font-medium"
            style={{ color: '#A78BFA' }}
          >
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-6" style={{ background: '#0D0D0F' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/logo.png" alt="dweebs.lol" className="w-36 h-36 mx-auto -mb-10 object-contain" />
          <h1 className="text-2xl font-bold text-white mb-1">dweebs<span style={{ color: '#7C3AED' }}>.lol</span></h1>
          <p className="text-sm" style={{ color: '#6B7280' }}>
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </p>
        </div>

        {/* Google OAuth */}
        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-medium text-white mb-4 transition-colors"
          style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <span className="text-xs" style={{ color: '#4B5563' }}>or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#374151]"
            style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none placeholder:text-[#374151]"
            style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}
          />

          {error && (
            <p className="text-xs text-red-400 px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-opacity"
            style={{ background: '#7C3AED', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* Toggle */}
        <p className="text-center text-sm mt-5" style={{ color: '#6B7280' }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="font-medium"
            style={{ color: '#A78BFA' }}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>

        {/* Legal */}
        <p className="text-center text-xs mt-4" style={{ color: '#4B5563' }}>
          By continuing, you agree to our{' '}
          <Link to="/terms" className="underline hover:opacity-80" style={{ color: '#6B7280' }}>Terms of Service</Link>
          {' '}and{' '}
          <Link to="/privacy" className="underline hover:opacity-80" style={{ color: '#6B7280' }}>Privacy Policy</Link>
        </p>
      </div>
    </div>
  )
}
