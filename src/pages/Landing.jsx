import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { characters } from '../data/mockData'
import { useEffect, useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

// --- Live preview chat loop ---
const PREVIEW_LOOP = [
  { type: 'char', id: 'miku',   text: "Should we open with the acoustic set? Something more intimate 🎵" },
  { type: 'user',               text: "omg yes — vulnerability first, then drop the banger" },
  { type: 'char', id: 'ariana', text: "YESSS. Acoustic first, then we blow the roof off 🌹" },
  { type: 'char', id: 'miku',   text: "J-Hope might be free that weekend too 👀" },
  { type: 'user',               text: "this collab is actually happening?? I need tickets 🔥" },
]

function LiveChatPreview() {
  const [visibleMessages, setVisibleMessages] = useState([])
  const [typingChar, setTypingChar] = useState(null)
  const indexRef = useRef(0)

  useEffect(() => {
    let cancelled = false

    const playNext = async () => {
      if (cancelled) return
      const msg = PREVIEW_LOOP[indexRef.current % PREVIEW_LOOP.length]

      if (msg.type === 'char') {
        const char = characters.find(c => c.id === msg.id)
        setTypingChar(char)
        await delay(1600)
        if (cancelled) return
        setTypingChar(null)
        setVisibleMessages(prev => [...prev.slice(-4), { ...msg, key: Date.now() }])
      } else {
        await delay(800)
        if (cancelled) return
        setVisibleMessages(prev => [...prev.slice(-4), { ...msg, key: Date.now() }])
      }

      indexRef.current += 1
      await delay(1000)
      if (!cancelled) playNext()
    }

    // seed 2 messages immediately
    setVisibleMessages([
      { ...PREVIEW_LOOP[0], key: 0 },
      { ...PREVIEW_LOOP[1], key: 1 },
    ])
    indexRef.current = 2
    const t = setTimeout(playNext, 1200)
    return () => { cancelled = true; clearTimeout(t) }
  }, [])

  return (
    <div className="rounded-2xl p-4" style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.06)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex -space-x-2">
          {['miku', 'ariana', 'jungkook'].map((id, i) => {
            const c = characters.find(x => x.id === id)
            return (
              <div key={id} className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0"
                style={{ background: c.color + '33', border: `1.5px solid ${c.color}55`, zIndex: 3 - i }}>
                {c.avatar ? <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" /> : c.emoji}
              </div>
            )
          })}
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white leading-tight">The Collab</span>
          <span className="text-[10px]" style={{ color: '#6B7280' }}>3 characters · group chat</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: '#22C55E' }}
            animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
          <span className="text-xs font-semibold" style={{ color: '#22C55E' }}>LIVE</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex flex-col gap-2 min-h-[80px]">
        {visibleMessages.map((msg) => {
          if (msg.type === 'char') {
            const c = characters.find(x => x.id === msg.id)
            return (
              <motion.div key={msg.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 items-end">
                <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0" style={{ background: c.color + '33' }}>
                  {c.avatar ? <img src={c.avatar} alt={c.name} className="w-full h-full object-cover" /> : c.emoji}
                </div>
                <div className="text-xs px-3 py-2 rounded-2xl rounded-tl-none max-w-[75%]" style={{ background: '#242429', color: '#E5E7EB' }}>
                  {msg.text}
                </div>
              </motion.div>
            )
          }
          return (
            <motion.div key={msg.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
              <div className="text-xs px-3 py-2 rounded-2xl rounded-tr-none max-w-[75%]" style={{ background: '#7C3AED', color: 'white' }}>
                {msg.text}
              </div>
            </motion.div>
          )
        })}

        {typingChar && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0" style={{ background: typingChar.color + '33' }}>
              {typingChar.avatar ? <img src={typingChar.avatar} alt={typingChar.name} className="w-full h-full object-cover" /> : typingChar.emoji}
            </div>
            <div className="flex items-center gap-1 px-3 py-2 rounded-2xl rounded-tl-none" style={{ background: '#242429' }}>
              <span className="text-xs mr-1" style={{ color: '#6B7280' }}>{typingChar.name.split(' ')[0]} is typing</span>
              {[0,1,2].map(i => (
                <motion.span key={i} className="inline-block w-1 h-1 rounded-full" style={{ background: '#6B7280' }}
                  animate={{ opacity: [0.3,1,0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// --- How it works steps ---
const HOW_IT_WORKS = [
  { num: '01', title: 'Pick 2–5 characters', desc: 'Mix K-pop stars, anime legends, pop icons — any combo across fandoms. The weirder the mix, the better the energy.' },
  { num: '02', title: 'Set the scene', desc: 'Drop them in a world. A recording studio. A midnight rooftop. A tournament finals. The more specific, the better.' },
  { num: '03', title: 'Watch them go', desc: 'They talk to each other first — building drama, clashing opinions, forming bonds. Jump in whenever you\'re ready.' },
]

// --- Carousel rows (split into two rows, each scrolling opposite directions) ---
const ROW_1_IDS = ['gojo', 'ariana', 'taehyung', 'jungkook', 'lisa', 'billie', 'weeknd', 'miku', 'eren', 'sukuna']
const ROW_2_IDS = ['naruto', 'jennie', 'levi', 'dua', 'elon', 'sabrina', 'zenitsu', 'toji', 'jimin', 'taylor']

function CharCard({ char }) {
  return (
    <div
      className="flex flex-col items-center gap-2 p-3 rounded-2xl flex-shrink-0"
      style={{
        width: 110,
        background: '#1A1A1F',
        border: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div
        className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
        style={{ background: char.color + '33', border: `1.5px solid ${char.color}55` }}
      >
        {char.avatar
          ? <img src={char.avatar} alt={char.name} className="w-full h-full object-cover" />
          : <span className="text-2xl">{char.emoji}</span>}
      </div>
      <p className="text-xs font-semibold text-white text-center leading-tight truncate w-full text-center">
        {char.name.split(' ')[0]}
      </p>
      <span
        className="text-[10px] px-2 py-0.5 rounded-full text-center truncate w-full text-center"
        style={{ background: char.color + '18', color: char.color }}
      >
        {char.fandom.split(' · ')[0]}
      </span>
    </div>
  )
}

function CharacterCarousel() {
  const allChars = [...characters]
  const row1 = ROW_1_IDS.map(id => allChars.find(c => c.id === id)).filter(Boolean)
  const row2 = ROW_2_IDS.map(id => allChars.find(c => c.id === id)).filter(Boolean)
  // Duplicate each row for seamless infinite loop
  const row1d = [...row1, ...row1]
  const row2d = [...row2, ...row2]

  return (
    <div className="relative overflow-hidden marquee-pause" style={{ WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)', maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
      {/* Row 1 — scrolls left */}
      <div className="flex gap-3 mb-3 animate-marquee-left" style={{ width: 'max-content' }}>
        {row1d.map((char, i) => <CharCard key={i} char={char} />)}
      </div>
      {/* Row 2 — scrolls right */}
      <div className="flex gap-3 animate-marquee-right" style={{ width: 'max-content' }}>
        {row2d.map((char, i) => <CharCard key={i} char={char} />)}
      </div>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  // If user lands here with auth tokens (OAuth callback) or already logged in, go to /home
  useEffect(() => {
    if (!loading && user) {
      navigate('/home', { replace: true })
    }
  }, [user, loading])

  const handleCTA = () => navigate(user ? '/home' : '/login')

  return (
    <div style={{ background: '#0D0D0F', minHeight: '100dvh' }} className="max-w-[1440px] mx-auto">

      {/* ── HERO ── */}
      <section className="px-5 md:px-16 pt-12 pb-10">
        {/* Desktop: two-column. Mobile: single column */}
        <motion.div variants={stagger} initial="hidden" animate="show"
          className="flex flex-col md:flex-row md:items-center md:gap-16 gap-5">

          {/* Left — copy + CTAs */}
          <div className="flex flex-col gap-5 md:flex-1">
            <motion.div variants={fadeUp} className="flex items-center gap-3 md:justify-start justify-center">
              <img src="/logo.png" alt="dweebs.lol" className="w-24 h-24 -mr-4 object-contain" />
              <span className="text-lg font-bold text-white">dweebs<span style={{ color: '#7C3AED' }}>.lol</span></span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.15)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.3)' }}>BETA</span>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-[30px] md:text-[48px] font-bold leading-tight text-white md:text-left text-center">
              Come back to a world that missed you.
            </motion.h1>

            <motion.p variants={fadeUp} className="text-[14px] md:text-[16px] leading-relaxed md:text-left text-center" style={{ color: '#9CA3AF' }}>
              Drop your favourite characters in a room. They talk to each other — and to you. Bond, argue, evolve. It's a group chat, not a chatbot.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-2 md:justify-start justify-center">
              {['💬 Characters That Talk to Each Other', '🌐 Mix Any Fandom', '⚡ Always Live'].map(label => (
                <span key={label} className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(124,58,237,0.12)', color: '#A78BFA', border: '1px solid rgba(124,58,237,0.25)' }}>
                  {label}
                </span>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-col gap-3 md:flex-row md:gap-4">
              <button onClick={handleCTA}
                className="md:flex-1 py-4 rounded-full font-semibold text-white text-[15px]"
                style={{ background: '#7C3AED' }}>
                Build Your World →
              </button>
              <button onClick={() => document.getElementById('characters').scrollIntoView({ behavior: 'smooth' })}
                className="md:flex-1 py-3 rounded-full font-medium text-sm"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#9CA3AF', background: 'transparent' }}>
                Browse characters ↓
              </button>
            </motion.div>

            <motion.p variants={fadeUp} className="md:text-left text-center text-xs" style={{ color: '#4B5563' }}>
              ✓ Free to start &nbsp;&nbsp; ✓ No credit card
            </motion.p>
          </div>

          {/* Right — live chat preview */}
          <motion.div variants={fadeUp} className="md:flex-1 md:max-w-[460px]">
            <LiveChatPreview />
          </motion.div>
        </motion.div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="mx-5 md:mx-16 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* ── HOW IT WORKS ── */}
      <section className="px-5 md:px-16 py-10">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
          variants={stagger} className="flex flex-col gap-6">
          <motion.div variants={fadeUp} className="text-center">
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: '#7C3AED' }}>How it works</p>
            <h2 className="text-xl font-bold text-white">Three steps into the world</h2>
          </motion.div>
          <div className="flex flex-col md:flex-row gap-4">
            {HOW_IT_WORKS.map((step) => (
              <motion.div key={step.num} variants={fadeUp}
                className="flex gap-4 p-4 rounded-2xl md:flex-col md:flex-1"
                style={{ background: '#1A1A1F', border: '1px solid rgba(255,255,255,0.04)' }}>
                <span className="text-2xl font-bold flex-shrink-0 w-8" style={{ color: '#7C3AED22', WebkitTextStroke: '1px #7C3AED66' }}>
                  {step.num}
                </span>
                <div>
                  <p className="font-semibold text-sm text-white mb-1">{step.title}</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="mx-5 md:mx-16 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* ── CHARACTER ROSTER ── */}
      <section id="characters" className="px-5 md:px-16 py-10">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
          variants={stagger} className="flex flex-col gap-6">
          <motion.div variants={fadeUp} className="text-center">
            <p className="text-[11px] font-semibold tracking-widest uppercase mb-2" style={{ color: '#7C3AED' }}>The cast</p>
            <h2 className="text-xl font-bold text-white">Who's waiting for you</h2>
            <p className="text-sm mt-2" style={{ color: '#6B7280' }}>Mix and match across fandoms. Every combo creates a different world.</p>
          </motion.div>
          <motion.div variants={fadeUp}>
            <CharacterCarousel />
          </motion.div>
          <motion.p variants={fadeUp} className="text-center text-xs" style={{ color: '#4B5563' }}>
            + more characters added every week
          </motion.p>
        </motion.div>
      </section>

      {/* ── DIVIDER ── */}
      <div className="mx-5 md:mx-16 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

      {/* ── SOCIAL PROOF / QUOTE ── */}
      <section className="px-5 md:px-16 py-10">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
          variants={stagger} className="flex flex-col md:flex-row gap-5">
          <motion.div variants={fadeUp}
            className="p-5 rounded-2xl md:flex-1"
            style={{ background: 'linear-gradient(135deg, #7C3AED18, #1A1A1F)', border: '1px solid #7C3AED33' }}>
            <p className="text-[15px] font-medium leading-relaxed text-white mb-5">
              "I stayed up until 3am watching Miku and Ariana plan a concert together. I forgot it wasn't real."
            </p>
            <div className="flex items-center gap-3">
              <img
                src="https://api.dicebear.com/9.x/lorelei/png?seed=kpopfan-yuna&size=80"
                alt="User"
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-white">Yuna K.</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>Early tester · K-pop fan</p>
              </div>
            </div>
          </motion.div>
          <motion.div variants={fadeUp}
            className="p-5 rounded-2xl md:flex-1"
            style={{ background: 'linear-gradient(135deg, #1A1A1F, #7C3AED11)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[15px] font-medium leading-relaxed text-white mb-5">
              "Naruto gave me actual life advice and I cried. I'm not okay."
            </p>
            <div className="flex items-center gap-3">
              <img
                src="/avatars/aryakoda.jpg"
                alt="User"
                className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              />
              <div>
                <p className="text-sm font-semibold text-white">@aryakoda</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>Anime fan</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="px-5 md:px-16 pt-4 pb-16">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
          variants={stagger} className="flex flex-col gap-4 text-center md:max-w-[480px] md:mx-auto">
          <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-bold text-white">
            Your world is one tap away.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-sm" style={{ color: '#9CA3AF' }}>
            Free to start. No credit card. Just pick your characters.
          </motion.p>
          <motion.button variants={fadeUp}
            onClick={handleCTA}
            className="w-full py-4 rounded-full font-semibold text-white text-[15px]"
            style={{ background: '#7C3AED' }}>
            Build Your World →
          </motion.button>
        </motion.div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-5 md:px-16 py-6" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-center md:text-left">
          <span className="text-xs" style={{ color: '#4B5563' }}>
            © 2026 dweebs.lol · Made by{' '}
            <span style={{ color: '#7C3AED' }}>Cloud Labs</span>
          </span>
          <div className="flex items-center justify-center gap-4">
            <a href="https://x.com/Dweebslol" target="_blank" rel="noopener noreferrer" aria-label="Follow us on X">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#4B5563" className="hover:fill-white transition-colors duration-200" style={{ cursor: 'pointer' }}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href="https://discord.gg/vNdQRbP3" target="_blank" rel="noopener noreferrer" aria-label="Join our Discord">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#4B5563" className="hover:fill-white transition-colors duration-200" style={{ cursor: 'pointer' }}>
                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286z" />
              </svg>
            </a>
            <span className="text-xs" style={{ color: '#374151' }}>
              For entertainment purposes only
            </span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
