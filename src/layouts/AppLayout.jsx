import { useState } from 'react'
import DesktopSidebar from '../components/DesktopSidebar'

function BetaBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('betaBannerDismissed') === 'true'
  })

  if (dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem('betaBannerDismissed', 'true')
    setDismissed(true)
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 text-xs" style={{ background: 'rgba(124,58,237,0.12)', borderBottom: '1px solid rgba(124,58,237,0.2)' }}>
      <div className="flex items-center gap-2 flex-1 justify-center">
        <span className="font-semibold px-1.5 py-0.5 rounded" style={{ background: 'rgba(124,58,237,0.3)', color: '#C4B5FD' }}>BETA</span>
        <span style={{ color: '#9CA3AF' }}>
          dweebs.lol is in early beta — things may break.{' '}
          <a
            href="https://x.com/Dweebslol"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors"
            style={{ color: '#A78BFA' }}
            onMouseEnter={e => e.target.style.color = '#C4B5FD'}
            onMouseLeave={e => e.target.style.color = '#A78BFA'}
          >
            Send us feedback ↗
          </a>
        </span>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 transition-colors"
        style={{ color: '#6B7280' }}
        onMouseEnter={e => e.target.style.color = '#9CA3AF'}
        onMouseLeave={e => e.target.style.color = '#6B7280'}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  )
}

export default function AppLayout({ children }) {
  return (
    <div className="flex h-dvh overflow-hidden max-w-[1440px] mx-auto" style={{ background: '#0D0D0F' }}>
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex flex-shrink-0" style={{ width: 280 }}>
        <DesktopSidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <BetaBanner />
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>

    </div>
  )
}
