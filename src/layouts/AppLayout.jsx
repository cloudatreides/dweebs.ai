import DesktopSidebar from '../components/DesktopSidebar'

export default function AppLayout({ children }) {
  return (
    <div className="flex h-dvh overflow-hidden max-w-[1440px] mx-auto" style={{ background: '#0D0D0F' }}>
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex flex-shrink-0" style={{ width: 280 }}>
        <DesktopSidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden min-w-0">
        {children}
      </div>
    </div>
  )
}
