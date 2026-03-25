'use client'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────

const LINE_1 = "Uncle Soji's"
const LINE_2 = 'Suya Spot'
const ALL_CHARS = LINE_1.length + LINE_2.length

// Fire streak starts at t=0.5s and finishes sweeping at t=3.8s
const FIRE_START  = 0.5
const FIRE_DUR    = 3.3
const FIRE_END    = FIRE_START + FIRE_DUR   // 3.8s
const UI_DELAY    = FIRE_END + 1.0          // subtitle + button appear at 4.8s

// ── Per-character reveal timing ───────────────────────────────────────────────
// Characters are revealed proportionally as the fire diagonal sweeps across.
// Line 1 occupies the first 55% of the sweep; Line 2 the last 45%.

function charDelay(lineIndex, charIndex, lineLength, lineStart, lineEnd) {
  const t = lineStart + (charIndex / (lineLength - 1)) * (lineEnd - lineStart)
  return FIRE_START + t * FIRE_DUR
}

const line1Delays = [...LINE_1].map((_, i) =>
  charDelay(0, i, LINE_1.length, 0, 0.55)
)
const line2Delays = [...LINE_2].map((_, i) =>
  charDelay(1, i, LINE_2.length, 0.52, 1.0)
)

// ── Fire SVG paths ────────────────────────────────────────────────────────────
// The fire slashes diagonally from bottom-left to top-right across the text.
// Drawn inside a viewBox that maps to the text block's bounding area.
// Two passes: a wide glow layer (blurred) + a razor-thin bright core.

const SLASH = 'M -60 340 Q 200 220 400 160 Q 600 95 860 -40'

const slashVariants = (delay, dur) => ({
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity:    1,
    transition: {
      pathLength: { delay, duration: dur, ease: [0.22, 0.1, 0.36, 1] },
      opacity:    { delay, duration: 0.05 },
    },
  },
})

const fadeOutVariants = {
  hidden:  { opacity: 1 },
  visible: {
    opacity: 0,
    transition: { delay: FIRE_END + 0.2, duration: 0.9, ease: 'easeOut' },
  },
}

// ── Single character ──────────────────────────────────────────────────────────

function Char({ ch, delay }) {
  return (
    <motion.span
      style={{ display: 'inline-block', whiteSpace: 'pre' }}
      initial={{ opacity: 0, filter: 'brightness(12) blur(3px)' }}
      animate={{ opacity: 1, filter: 'brightness(1) blur(0px)' }}
      transition={{
        delay,
        opacity: { duration: 0.25 },
        filter:  { duration: 0.65, ease: 'easeOut' },
      }}
    >
      {ch}
    </motion.span>
  )
}

// ── Order button ──────────────────────────────────────────────────────────────

function OrderButton({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:   hovered ? 'rgba(201,168,76,0.10)' : 'transparent',
        border:       `1px solid ${hovered ? '#c9a84c' : 'rgba(201,168,76,0.42)'}`,
        borderRadius: '40px',
        padding:      '12px 36px',
        cursor:       'pointer',
        display:      'flex',
        alignItems:   'center',
        gap:          '10px',
        transition:   'all 0.3s ease',
        boxShadow:    hovered ? '0 0 30px rgba(255,90,0,0.20)' : 'none',
      }}
    >
      <span style={{
        color:         '#c9a84c',
        fontSize:      '10px',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        fontFamily:    "'DM Sans', sans-serif",
        fontWeight:    400,
      }}>
        Order Now
      </span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12"/>
        <polyline points="12 5 19 12 12 19"/>
      </svg>
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function FireReveal({ onEnter }) {
  const [uiReady, setUiReady]   = useState(false)
  const [leaving, setLeaving]   = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setUiReady(true), UI_DELAY * 1000)
    return () => clearTimeout(t)
  }, [])

  function handleEnter() {
    setLeaving(true)
    setTimeout(onEnter, 700)
  }

  return (
    <div style={{
      position:   'fixed',
      inset:       0,
      background: '#120800',
      display:    'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow:   'hidden',
      transition: 'opacity 0.7s ease',
      opacity:     leaving ? 0 : 1,
      zIndex:      100,
    }}>

      {/* ── Ambient background warmth ───────────────────────────────────── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 60% 40% at 50% 70%, rgba(120,30,0,0.18) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      {/* ── 3D text stage ───────────────────────────────────────────────── */}
      {/* perspective + slight rotateX gives depth, as if reading a sign    */}
      <div style={{ perspective: '1100px', perspectiveOrigin: '50% 60%' }}>
        <div style={{
          transform:      'rotateX(5deg)',
          transformStyle: 'preserve-3d',
          position:       'relative',
          padding:        '48px 64px',
        }}>

          {/* ── Fire SVG overlay ──────────────────────────────────────── */}
          {/* Positioned to cover the full text block exactly             */}
          <motion.svg
            initial="hidden"
            animate="visible"
            viewBox="0 0 800 300"
            preserveAspectRatio="none"
            style={{
              position:      'absolute',
              inset:          0,
              width:          '100%',
              height:         '100%',
              pointerEvents: 'none',
              overflow:      'visible',
            }}
          >
            <defs>
              {/* Wide glow — warm bloom behind the slash */}
              <linearGradient id="fr-glow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#ff2200" stopOpacity="0"/>
                <stop offset="55%"  stopColor="#ff7700" stopOpacity="0.55"/>
                <stop offset="85%"  stopColor="#ffcc00" stopOpacity="0.85"/>
                <stop offset="100%" stopColor="#fff5e0" stopOpacity="1"/>
              </linearGradient>

              {/* Tight core — almost white-hot at the tip */}
              <linearGradient id="fr-core" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#ff3300" stopOpacity="0"/>
                <stop offset="60%"  stopColor="#ffaa00" stopOpacity="0.9"/>
                <stop offset="100%" stopColor="#ffffff"  stopOpacity="1"/>
              </linearGradient>

              {/* Ember sparks filter */}
              <filter id="fr-blur">
                <feGaussianBlur stdDeviation="10"/>
              </filter>
              <filter id="fr-glow-filter">
                <feGaussianBlur stdDeviation="5"/>
              </filter>
            </defs>

            {/* Wide diffuse bloom (outer glow) */}
            <motion.path
              d={SLASH}
              fill="none"
              stroke="url(#fr-glow)"
              strokeWidth="36"
              strokeLinecap="round"
              filter="url(#fr-blur)"
              variants={slashVariants(FIRE_START, FIRE_DUR)}
            />

            {/* Mid glow */}
            <motion.path
              d={SLASH}
              fill="none"
              stroke="url(#fr-glow)"
              strokeWidth="14"
              strokeLinecap="round"
              filter="url(#fr-glow-filter)"
              variants={slashVariants(FIRE_START, FIRE_DUR)}
            />

            {/* Razor-thin bright core */}
            <motion.path
              d={SLASH}
              fill="none"
              stroke="url(#fr-core)"
              strokeWidth="2.5"
              strokeLinecap="round"
              variants={slashVariants(FIRE_START, FIRE_DUR)}
            />

            {/* Fade the whole SVG out once fire finishes */}
            <motion.rect
              x="-100" y="-100" width="1100" height="600"
              fill="#120800"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: FIRE_END + 0.2, duration: 1.0, ease: 'easeInOut' }}
            />
          </motion.svg>

          {/* ── Text block ────────────────────────────────────────────── */}
          <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            {/* Line 1: "Uncle Soji's" */}
            <div style={{
              fontFamily:  "'Playfair Display', Georgia, serif",
              fontWeight:   400,
              fontSize:    'clamp(38px, 6.5vw, 70px)',
              color:       '#f5f0e8',
              letterSpacing: '0.01em',
              lineHeight:   1.15,
              textShadow:  '0 0 50px rgba(255,110,0,0.35)',
            }}>
              {[...LINE_1].map((ch, i) => (
                <Char key={i} ch={ch} delay={line1Delays[i]} />
              ))}
            </div>

            {/* Line 2: "Suya Spot" — amber/gold, slightly bolder */}
            <div style={{
              fontFamily:  "'Playfair Display', Georgia, serif",
              fontWeight:   400,
              fontSize:    'clamp(38px, 6.5vw, 70px)',
              color:       '#c9a84c',
              letterSpacing: '0.04em',
              lineHeight:   1.15,
              textShadow:  '0 0 50px rgba(255,130,0,0.45)',
            }}>
              {[...LINE_2].map((ch, i) => (
                <Char key={i} ch={ch} delay={line2Delays[i]} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sub-text + CTA — fades in after fire finishes ───────────── */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={uiReady ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1.1, ease: 'easeOut' }}
        style={{
          marginTop: '36px',
          display:   'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap:        '16px',
        }}
      >
        <p style={{
          color:         '#c9a84c',
          fontSize:      '9px',
          letterSpacing: '0.42em',
          textTransform: 'uppercase',
          fontFamily:    "'DM Sans', sans-serif",
          fontWeight:     400,
        }}>
          Lagos&nbsp;·&nbsp;Est.&nbsp;2010
        </p>

        <div style={{
          width:      '40px',
          height:     '1px',
          background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
        }} />

        <OrderButton onClick={handleEnter} />
      </motion.div>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=DM+Sans:wght@300;400&display=swap');
      `}</style>
    </div>
  )
}
