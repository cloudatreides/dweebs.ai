import { useState } from 'react'
import { motion } from 'framer-motion'
import { Zap, X, Send } from 'lucide-react'

export default function PlotTwistPanel({ onSubmit, onClose }) {
  const [text, setText] = useState('')

  const handleSubmit = () => {
    if (!text.trim()) return
    onSubmit(text.trim())
    setText('')
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="rounded-xl p-3.5 flex flex-col gap-3"
      style={{ background: '#161B30', border: '1px solid rgba(251,191,36,0.38)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap size={14} color="#FBBF24" />
          <span className="text-[11px] font-bold tracking-wider" style={{ color: '#FBBF24' }}>
            PLOT TWIST
          </span>
        </div>
        <button onClick={onClose}>
          <X size={16} color="#52525B" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="A raven arrives with bad news..."
          className="flex-1 h-10 rounded-full px-3.5 text-[13px] text-white outline-none placeholder:text-gray-600"
          style={{ background: '#080A14', border: '1px solid #27272A' }}
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity"
          style={{ background: '#FBBF24', opacity: text.trim() ? 1 : 0.4 }}
        >
          <Send size={16} color="#080A14" />
        </button>
      </div>
    </motion.div>
  )
}
