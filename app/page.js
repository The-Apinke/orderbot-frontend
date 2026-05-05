'use client'
import { useRouter } from 'next/navigation'
import { CircularRevealHeading } from '@/components/ui/circular-reveal-heading'

const ITEMS = [
  { text: 'RAM SUYA',     image: '/ram%20suya.jpg' },
  { text: 'BEEF SUYA',   image: '/beef%20suya.jpg' },
  { text: 'CHICKEN SUYA',image: '/chicken.jpg' },
  { text: 'GIZZARD',     image: '/gizzard%20suya.png' },
]

const MENU_TAGS = ['#01 BEEF SUYA', '#02 RAM SUYA', '#03 CHICKEN', '#04 GIZZARD', '#05 KILISHI']

export default function Home() {
  const router = useRouter()

  return (
    <main style={{
      height: '100vh', overflow: 'hidden',
      background: 'linear-gradient(160deg, #3a1600 0%, #5c2400 40%, #3a1200 100%)',
      display: 'grid', gridTemplateRows: 'auto 1fr auto',
      fontFamily: "'DM Sans', sans-serif", color: '#f5f0e6',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .start-btn {
          margin-top: 22px;
          background: #f5f0e6; color: #1a0c04; border: none;
          padding: 13px 26px; font-family: monospace; font-size: 11px;
          letter-spacing: 0.14em; cursor: pointer; font-weight: 700;
          display: inline-flex; align-items: center; gap: 10px;
          transition: background 0.15s, color 0.15s;
        }
        .start-btn:hover { background: #d6b24a; }

        .menu-tag {
          font-family: monospace; font-size: 10px; letter-spacing: 0.12em;
          padding: 4px 10px; transition: opacity 0.15s;
        }

        @media (max-width: 860px) {
          .splash-left, .splash-right { display: none !important; }
          .splash-center { justify-self: center; }
        }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 70% 55% at 50% 40%, rgba(255,110,0,0.45) 0%, rgba(200,60,0,0.2) 60%, transparent 100%)',
      }} />

      {/* TOP BAR */}
      <div style={{
        padding: '15px 48px', display: 'flex', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(245,240,230,0.12)',
        fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.24em',
        color: 'rgba(245,240,230,0.45)', position: 'relative', zIndex: 1,
      }}>
        <span>UNCLE SOJI'S / LAGOS</span>
        <span>EST. 2010</span>
        <span>VOL.01</span>
      </div>

      {/* HERO: 3 columns */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center', gap: 20, padding: '0 52px',
        position: 'relative', zIndex: 1, overflow: 'hidden',
      }}>

        {/* LEFT */}
        <div className="splash-left">
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(48px, 6.5vw, 104px)',
            lineHeight: 0.88, color: '#f5f0e6', letterSpacing: '0.01em',
          }}>
            SUYA.<br/>
            <span style={{ color: '#d6b24a' }}>PEPPER.</span><br/>
            FIRE.
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 15, fontStyle: 'italic',
            color: 'rgba(245,240,230,0.58)',
            marginTop: 18, maxWidth: 300, lineHeight: 1.55,
          }}>
            A Lagos suya house. Hand-rubbed with yaji. Charred over open flame. Delivered sharp-sharp.
          </div>
          <button className="start-btn" onClick={() => router.push('/chat')}>
            START ORDER →
          </button>
        </div>

        {/* CENTER — plate (unchanged) */}
        <div className="splash-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularRevealHeading
            items={ITEMS}
            centerText={
              <div style={{ textAlign: 'center', userSelect: 'none' }}>
                <p style={{
                  color: '#f5f0e8', fontSize: 'clamp(15px, 4vw, 20px)',
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 700, lineHeight: 1.2,
                  textShadow: '0 0 30px rgba(255,100,0,0.3)', margin: 0,
                }}>Uncle Soji's</p>
                <p style={{
                  color: '#c9a84c', fontSize: 'clamp(8px, 2.5vw, 11px)',
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  marginTop: '5px', marginBottom: '8px',
                  fontFamily: "'DM Sans', sans-serif",
                }}>Suya Spot</p>
                <p style={{
                  color: 'rgba(201,168,76,0.6)', fontSize: 'clamp(6px, 1.5vw, 7px)',
                  letterSpacing: '0.35em', textTransform: 'uppercase', margin: 0,
                }}>Lagos · Est. 2010</p>
              </div>
            }
          />
        </div>

        {/* RIGHT */}
        <div className="splash-right" style={{ textAlign: 'right' }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic', fontSize: 'clamp(16px, 1.9vw, 28px)',
            lineHeight: 1.2, color: '#f5f0e6', marginBottom: 14,
          }}>
            "The best suya in Lagos. No debate."
          </div>
          <div style={{
            fontFamily: 'monospace', fontSize: 10,
            letterSpacing: '0.24em', color: 'rgba(245,240,230,0.38)',
          }}>
            — EVERY REGULAR, EVER
          </div>
          <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
            {MENU_TAGS.map((tag, i) => (
              <div key={i} className="menu-tag" style={{
                border: `1px solid ${i === 0 ? '#d6b24a' : 'rgba(245,240,230,0.18)'}`,
                background: i === 0 ? '#d6b24a' : 'transparent',
                color: i === 0 ? '#1a0c04' : 'rgba(245,240,230,0.55)',
              }}>{tag}</div>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div style={{
        padding: '13px 48px', borderTop: '1px solid rgba(245,240,230,0.12)',
        display: 'flex', justifyContent: 'space-between',
        fontFamily: 'monospace', fontSize: 10,
        letterSpacing: '0.24em', color: 'rgba(245,240,230,0.38)',
        position: 'relative', zIndex: 1,
      }}>
        <span>● 6PM – 1AM</span>
        <span>SURULERE · LAGOS · NG</span>
        <span>CHAT TO ORDER →</span>
      </div>
    </main>
  )
}
