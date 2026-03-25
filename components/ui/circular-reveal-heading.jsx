'use client'
import { useState, useEffect, useCallback, useRef, memo } from 'react'

const RADIUS = 160
const GAP    = 38

// ── Memoized spinner — rAF drives rotation, React never touches this div ──────
const SpinnerRing = memo(function SpinnerRing({ items, onEnter, onLeave }) {
  const ringRef  = useRef(null)
  const angleRef = useRef(0)
  const rafRef   = useRef(null)

  useEffect(() => {
    // 360 degrees / (30s * 60fps) = 0.2 degrees per frame
    const tick = () => {
      angleRef.current = (angleRef.current + 0.2) % 360
      if (ringRef.current) {
        ringRef.current.style.transform = `rotate(${angleRef.current}deg)`
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const totalGap  = GAP * items.length
  const available = 360 - totalGap
  const segDeg    = available / items.length

  return (
    <div
      ref={ringRef}
      style={{ position: 'absolute', top: '-30px', left: '-30px', right: '-30px', bottom: '-30px', willChange: 'transform' }}
    >
      <svg viewBox="-30 -30 460 460" width="100%" height="100%" overflow="visible">
        <defs>
          <linearGradient id="sg-amber" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#c9a84c" />
            <stop offset="100%" stopColor="#ff8c00" />
          </linearGradient>
          <filter id="sg-glow">
            <feGaussianBlur stdDeviation="1.5" result="b" />
            <feMerge>
              <feMergeNode in="b"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        <path
          id="sg-path"
          fill="none"
          d={`M200,200 m-${RADIUS},0 a${RADIUS},${RADIUS} 0 1,1 ${RADIUS*2},0 a${RADIUS},${RADIUS} 0 1,1 -${RADIUS*2},0`}
        />

        <g filter="url(#sg-glow)">
          {items.map((item, i) => {
            const offset = `${((i * (segDeg + GAP)) / 360) * 100}%`
            return (
              <g key={i} style={{ cursor: 'pointer' }}
                onMouseEnter={() => onEnter(item.image)}
                onMouseLeave={onLeave}
              >
                <text>
                  <textPath
                    href="#sg-path"
                    startOffset={offset}
                    textLength={`${segDeg * 1.8}`}
                    lengthAdjust="spacingAndGlyphs"
                    fill="url(#sg-amber)"
                    style={{
                      fontSize:      '13px',
                      fontFamily:    "'DM Sans', sans-serif",
                      fontWeight:    '500',
                      letterSpacing: '0.3em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {item.text}
                  </textPath>
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
})

// ── Main component ────────────────────────────────────────────────────────────
export function CircularRevealHeading({ items, centerText }) {
  const [activeImage, setActiveImage] = useState(null)
  const floatRef = useRef(null)
  const floatAngle = useRef(0)
  const floatRaf   = useRef(null)

  // Preload images
  useEffect(() => {
    items.forEach(({ image }) => { const i = new window.Image(); i.src = image })
  }, []) // eslint-disable-line

  // Float animation via rAF — same pattern, no CSS needed
  useEffect(() => {
    const tick = () => {
      floatAngle.current += 0.01
      const y = Math.sin(floatAngle.current) * 10
      if (floatRef.current) {
        floatRef.current.style.transform = `translateY(${y}px)`
      }
      floatRaf.current = requestAnimationFrame(tick)
    }
    floatRaf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(floatRaf.current)
  }, [])

  const handleEnter = useCallback((img) => setActiveImage(img), [])
  const handleLeave = useCallback(() => setActiveImage(null), [])

  return (
    <div ref={floatRef} style={{
      position:     'relative',
      width:        'min(420px, 88vw)',
      height:       'min(420px, 88vw)',
      borderRadius: '50%',
      background:   '#331500',
      boxShadow:    '24px 24px 48px #1a0800, -12px -12px 36px #4a1e00',
      flexShrink:    0,
      willChange:   'transform',
      overflow:     'visible',
    }}>

      {/* Inset shadow */}
      <div style={{
        position: 'absolute', inset: 8, borderRadius: '50%', pointerEvents: 'none',
        boxShadow: 'inset 6px 6px 14px #1a0800, inset -4px -4px 12px #4a1e00',
      }} />

      {/* Hover food image */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden',
        zIndex: 20, pointerEvents: 'none',
        opacity: activeImage ? 1 : 0, transition: 'opacity 0.3s ease',
      }}>
        {activeImage && (
          <img src={activeImage} alt="" style={{
            width: '75%', height: '75%', objectFit: 'cover', borderRadius: '50%',
            position: 'absolute', top: '12.5%', left: '12.5%', filter: 'brightness(0.85)',
          }} />
        )}
      </div>

      {/* Center text */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: activeImage ? 0 : 1, transition: 'opacity 0.2s ease',
        pointerEvents: 'none',
      }}>
        {centerText}
      </div>

      {/* Spinner — driven by rAF, invisible to React and bundler */}
      <SpinnerRing items={items} onEnter={handleEnter} onLeave={handleLeave} />
    </div>
  )
}
