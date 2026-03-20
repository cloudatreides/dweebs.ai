import { useState } from 'react'
import { X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { submitFeedback } from '../lib/db'

const TYPES = [
  { id: 'bug',  label: '🐛 Bug',    desc: 'Something broke' },
  { id: 'idea', label: '💡 Idea',   desc: 'I have a suggestion' },
  { id: 'love', label: '❤️ Love',   desc: 'Just vibing' },
]

export default function FeedbackModal({ isOpen, onClose }) {
  const { user } = useAuth()
  const [type, setType] = useState('idea')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | done | error

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!message.trim() || status === 'loading') return
    setStatus('loading')
    try {
      await submitFeedback({ userId: user.id, type, message: message.trim() })
      setStatus('done')
      setMessage('')
    } catch {
      setStatus('error')
    }
  }

  const handleClose = () => {
    setStatus('idle')
    setMessage('')
    setType('idea')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={handleClose}
    >
      <div
        className="w-full md:max-w-md rounded-t-3xl md:rounded-2xl flex flex-col gap-5 p-6"
        style={{ background: '#141418', border: '1px solid rgba(255,255,255,0.08)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Share feedback</h2>
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Help us make dweebs better</p>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg transition-opacity hover:opacity-70">
            <X size={18} color="#6B7280" />
          </button>
        </div>

        {status === 'done' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="text-4xl">🎉</span>
            <p className="text-white font-semibold">Thanks, we got it!</p>
            <p className="text-sm" style={{ color: '#6B7280' }}>Your feedback actually gets read — for real.</p>
            <button
              onClick={handleClose}
              className="mt-2 px-6 py-2.5 rounded-full text-sm font-semibold text-white"
              style={{ background: '#7C3AED' }}
            >
              Back to dweebs
            </button>
          </div>
        ) : (
          <>
            {/* Type selector */}
            <div className="flex gap-2">
              {TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-semibold transition-all"
                  style={type === t.id
                    ? { background: 'rgba(124,58,237,0.2)', border: '1.5px solid rgba(124,58,237,0.5)', color: '#C4B5FD' }
                    : { background: '#1E1E24', border: '1.5px solid rgba(255,255,255,0.06)', color: '#6B7280' }
                  }
                >
                  <span className="text-lg">{t.label.split(' ')[0]}</span>
                  <span>{t.label.split(' ')[1]}</span>
                </button>
              ))}
            </div>

            {/* Text area */}
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 500))}
              rows={4}
              placeholder={
                type === 'bug'  ? "What happened? What did you expect instead?" :
                type === 'idea' ? "What would make dweebs way better?" :
                                  "What's your favourite thing about dweebs?"
              }
              className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none resize-none placeholder:text-[#374151]"
              style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.07)' }}
              autoFocus
            />

            {status === 'error' && (
              <p className="text-xs text-center" style={{ color: '#F87171' }}>Something went wrong. Try again?</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!message.trim() || status === 'loading'}
              className="w-full py-3.5 rounded-full font-semibold text-sm text-white transition-opacity"
              style={{ background: '#7C3AED', opacity: message.trim() && status !== 'loading' ? 1 : 0.4 }}
            >
              {status === 'loading' ? 'Sending...' : 'Send feedback'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
