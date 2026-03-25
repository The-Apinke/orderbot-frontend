'use client'
import { useRouter } from 'next/navigation'
import { CircularRevealHeading } from '@/components/ui/circular-reveal-heading'
import { useState } from 'react'

const ITEMS = [
  {
    text: 'RAM SUYA',
    image: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=400&q=80',
  },
  {
    text: 'BEEF SUYA',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80',
  },
  {
    text: 'CHICKEN SUYA',
    image: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=400&q=80',
  },
  {
    text: 'GIZZARD',
    image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=400&q=80',
  },
]

export default function Home() {
  const router = useRouter()
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #3a1600 0%, #5c2400 40%, #3a1200 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 'clamp(24px, 5vw, 40px)',
      fontFamily: "'DM Sans', sans-serif",
      paddingLeft: '20px',
      paddingRight: '20px',
      paddingBottom: '20px',
      paddingTop: 'max(48px, 7vh)',
    }}>

      {/* Ambient glow behind the circle */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'radial-gradient(ellipse 70% 55% at 50% 40%, rgba(255,110,0,0.45) 0%, rgba(200,60,0,0.2) 60%, transparent 100%)',
        pointerEvents: 'none',
      }} />

      <CircularRevealHeading
        items={ITEMS}
        centerText={
          <div style={{ textAlign: 'center', userSelect: 'none' }}>
            <p style={{
              color: '#f5f0e8',
              fontSize: 'clamp(15px, 4vw, 20px)',
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 700,
              lineHeight: 1.2,
              textShadow: '0 0 30px rgba(255,100,0,0.3)',
              margin: 0,
            }}>
              Uncle Soji's
            </p>
            <p style={{
              color: '#c9a84c',
              fontSize: 'clamp(8px, 2.5vw, 11px)',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              marginTop: '5px',
              marginBottom: '8px',
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Suya Spot
            </p>
            <p style={{
              color: 'rgba(201,168,76,0.6)',
              fontSize: 'clamp(6px, 1.5vw, 7px)',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              margin: 0,
            }}>
              Lagos · Est. 2010
            </p>
          </div>
        }
      />

      {/* CTA */}
      <button
        onClick={() => router.push('/chat')}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: hovered ? 'rgba(201,168,76,0.10)' : 'transparent',
          border: `1px solid ${hovered ? '#c9a84c' : 'rgba(201,168,76,0.4)'}`,
          borderRadius: '40px',
          padding: '12px 36px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          transition: 'all 0.3s ease',
          boxShadow: hovered ? '0 0 28px rgba(255,90,0,0.18)' : 'none',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span style={{
          color: '#c9a84c',
          fontSize: '10px',
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
        }}>
          Place Your Order
        </span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="#c9a84c" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/>
          <polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400&family=DM+Sans:wght@300;400;500&display=swap');
      `}</style>
    </div>
  )
}
