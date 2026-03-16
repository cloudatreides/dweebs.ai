import DesktopSidebar from '../components/DesktopSidebar'

export default function AppLayout({ children }) {
  return (
    <div className="flex h-dvh overflow-hidden" style={{ background: '#0D0D0F' }}>
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex flex-shrink-0" style={{ width: 280 }}>
        <DesktopSidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden min-w-0">
        <div className="h-full max-w-[1100px]">
          {children}
        </div>
      </div>
    </div>
  )
}
