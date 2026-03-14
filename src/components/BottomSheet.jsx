import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export default function BottomSheet({ isOpen, onClose, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Full-viewport backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          />
          {/* Sheet — bottom sheet on mobile, centered modal on desktop */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 md:bottom-auto md:top-1/2 left-1/2 -translate-x-1/2 md:-translate-y-1/2 w-full max-w-[480px] z-50 rounded-t-3xl md:rounded-3xl overflow-y-auto"
            style={{ background: '#13131A', maxHeight: '90dvh' }}
          >
            <div className="relative flex items-center justify-center mt-3 mb-1">
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
              <button
                onClick={onClose}
                className="absolute right-4 flex items-center justify-center w-7 h-7 rounded-full transition-colors"
                style={{ background: 'rgba(255,255,255,0.08)' }}
              >
                <X size={14} color="#9CA3AF" />
              </button>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
