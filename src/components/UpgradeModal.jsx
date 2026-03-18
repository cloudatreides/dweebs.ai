import { Check, X, Zap } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { useTier } from '../context/TierContext'

const FREE_FEATURES = [
  '1 active chat',
  'Up to 2 characters',
  'No chat history',
  '1 custom character',
]

const PRO_FEATURES = [
  'Unlimited chats',
  'Up to 5 characters',
  'Unlimited history',
  'Unlimited custom characters',
]

export default function UpgradeModal({ isOpen, onClose, trigger }) {
  const { setIsPro } = useTier()

  const handleUpgrade = () => {
    setIsPro(true)
    onClose()
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="px-5 pb-8 pt-2">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}>
            <Zap size={22} color="white" fill="white" />
          </div>
          <h2 className="text-xl font-bold text-white">Upgrade to Pro</h2>
          {trigger && (
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>{trigger}</p>
          )}
          {!trigger && (
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Unlock more characters, more worlds, more chaos.</p>
          )}
        </div>

        {/* Tier comparison */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Free */}
          <div className="p-4 rounded-2xl" style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#6B7280' }}>Free</p>
            <div className="flex flex-col gap-2">
              {FREE_FEATURES.map(f => (
                <div key={f} className="flex items-center gap-2">
                  <X size={12} color="#4B5563" />
                  <span className="text-xs" style={{ color: '#6B7280' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro */}
          <div className="p-4 rounded-2xl" style={{ background: '#1A1020', border: '1.5px solid #7C3AED88' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#A78BFA' }}>Pro</p>
            <div className="flex flex-col gap-2">
              {PRO_FEATURES.map(f => (
                <div key={f} className="flex items-center gap-2">
                  <Check size={12} color="#A78BFA" />
                  <span className="text-xs text-white">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="text-center mb-5">
          <span className="text-3xl font-bold text-white">$7.99</span>
          <span className="text-sm ml-1" style={{ color: '#6B7280' }}>/ month</span>
          <p className="text-xs mt-1" style={{ color: '#4B5563' }}>Cancel anytime · No commitment</p>
        </div>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          className="w-full py-4 rounded-full font-semibold text-white text-[15px]"
          style={{ background: 'linear-gradient(135deg, #7C3AED, #A855F7)' }}
        >
          Upgrade to Pro →
        </button>
        <button
          onClick={onClose}
          className="w-full py-3 text-sm mt-2"
          style={{ color: '#4B5563' }}
        >
          Maybe later
        </button>
      </div>
    </BottomSheet>
  )
}
