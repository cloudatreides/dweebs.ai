import { motion } from 'framer-motion'
import { Clapperboard } from 'lucide-react'

export default function ChoiceCard({ choices, onChoose, loading }) {
  if (!choices || choices.length !== 2) return null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-full rounded-xl p-4 flex flex-col gap-3.5"
      style={{
        background: 'linear-gradient(180deg, #1A0B2E 0%, #0D1022 100%)',
        border: '1px solid #7C3AED',
      }}
    >
      <div className="flex items-center gap-1.5">
        <Clapperboard size={14} color="#A855F7" />
        <span className="text-[11px] font-bold tracking-wider" style={{ color: '#A855F7' }}>
          DIRECTOR'S CHOICE
        </span>
      </div>
      <p className="text-sm" style={{ color: '#D1D5DB', fontFamily: 'Manrope', lineHeight: 1.4 }}>
        The tension is rising. What happens next?
      </p>
      <div className="flex gap-2.5">
        {choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => onChoose(choice)}
            disabled={loading}
            className="flex-1 py-2.5 px-3 rounded-full text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={i === 0
              ? { background: '#7C3AED', color: '#FFFFFF' }
              : { background: '#161B30', color: '#A855F7', border: '1px solid #7C3AED' }
            }
          >
            {choice}
          </button>
        ))}
      </div>
    </motion.div>
  )
}
