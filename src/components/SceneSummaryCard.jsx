import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Clapperboard, Share, Plus, X } from 'lucide-react'

export default function SceneSummaryCard({ title, summary, characters, onNewScene, onClose }) {
  const cardRef = useRef(null)
  const [sharing, setSharing] = useState(false)
  const [shared, setShared] = useState(false)

  const handleShare = async () => {
    setSharing(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0D1022',
        scale: 2,
      })
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      } else {
        // Fallback: download
        const url = canvas.toDataURL('image/png')
        const a = document.createElement('a')
        a.href = url
        a.download = `dweebs-scene-${Date.now()}.png`
        a.click()
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
    } catch (err) {
      console.error('Share failed:', err)
    } finally {
      setSharing(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{ background: 'rgba(8,10,20,0.85)' }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-[360px]"
      >
        {/* Close button */}
        <div className="flex justify-end mb-2">
          <button onClick={onClose} className="p-1">
            <X size={20} color="#71717A" />
          </button>
        </div>

        {/* Card — inline styles for html2canvas */}
        <div
          ref={cardRef}
          style={{
            background: '#0D1022',
            borderRadius: 16,
            border: '1px solid #27272A',
            overflow: 'hidden',
            fontFamily: 'Inter, system-ui, sans-serif',
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(180deg, #1A0B2E 0%, #0D1022 100%)',
            padding: '24px 24px 20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3Z" />
                <path d="m6.2 5.3 3.1 3.9" /><path d="m12.4 3.4 3.1 4" />
                <path d="M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
              </svg>
              <span style={{ color: '#A855F7', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                SCENE COMPLETE
              </span>
            </div>
            <div style={{ color: '#FFFFFF', fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
              {title}
            </div>
          </div>

          {/* Body */}
          <div style={{ padding: '0 24px 20px' }}>
            <p style={{ color: '#94A3B8', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px' }}>
              {summary}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ color: '#52525B', fontSize: 11, fontWeight: 500 }}>Featuring</span>
              <div style={{ display: 'flex' }}>
                {characters.map((char, i) => (
                  <div
                    key={char.id}
                    style={{
                      width: 26, height: 26, borderRadius: 13,
                      background: char.color || '#7C3AED',
                      border: '2px solid #0D1022',
                      marginLeft: i > 0 ? -8 : 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    {char.avatar
                      ? <img src={char.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 10, color: '#fff' }}>{char.emoji || char.name[0]}</span>
                    }
                  </div>
                ))}
              </div>
            </div>
            <div style={{ color: '#3F3F46', fontSize: 11, fontWeight: 500 }}>
              dweebs.lol
            </div>
          </div>
        </div>

        {/* Actions — outside the card ref so they don't appear in screenshot */}
        <div className="flex gap-2.5 mt-3">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold text-white transition-opacity"
            style={{ background: '#7C3AED', opacity: sharing ? 0.6 : 1 }}
          >
            <Share size={16} />
            {shared ? 'Copied!' : sharing ? 'Sharing...' : 'Share'}
          </button>
          <button
            onClick={onNewScene}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold transition-opacity"
            style={{ background: '#161B30', color: '#94A3B8', border: '1px solid #3F3F46' }}
          >
            <Plus size={16} />
            New Scene
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
