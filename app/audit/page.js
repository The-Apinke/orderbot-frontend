'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PLACEHOLDER = `You are the friendly ordering assistant for Uncle Soji's Suya Spot.

YOUR RULES:
- Only discuss items on the menu — never make up items or prices
- Always confirm the customer's full order before checkout
- Never discuss anything unrelated to the restaurant
- Keep every response under 30 words unless reading back a full order
- Nigerian phone numbers must be exactly 11 digits`;

const STEPS = [
  { number: '01', label: 'Rules extracted from your prompt' },
  { number: '02', label: 'Each rule attacked with a realistic message' },
  { number: '03', label: 'AI response streamed live, word by word' },
  { number: '04', label: 'Independent PASS / FAIL verdict + score' },
];

export default function AuditPage() {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  function handleRun() {
    const trimmed = prompt.trim();
    if (trimmed.length < 20) { setError('Paste a system prompt to begin.'); return; }
    sessionStorage.setItem('auditPrompt', trimmed);
    router.push('/audit/results');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleRun();
  }

  return (
    <main style={{
      height: '100vh',
      overflow: 'hidden',
      background: '#ffffff',
      color: '#0a0a0a',
      fontFamily: "'Inter', system-ui, sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes float1 { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-14px) rotate(3deg)} }
        @keyframes float2 { 0%,100%{transform:translateY(0) rotate(2deg)} 50%{transform:translateY(-10px) rotate(-4deg)} }
        @keyframes float3 { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-8px) rotate(5deg)} }
        @keyframes float4 { 0%,100%{transform:translateY(0) rotate(4deg)} 50%{transform:translateY(-12px) rotate(-2deg)} }
        @keyframes float5 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes wiggle { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0.2} }

        .nav-anim   { animation: fadeIn 0.4s ease both; }
        .left-anim  { animation: fadeUp 0.6s 0.1s ease both; }
        .right-anim { animation: fadeUp 0.6s 0.2s ease both; }

        .d1 { animation: float1 4s ease-in-out infinite; }
        .d2 { animation: float2 5s ease-in-out infinite; }
        .d3 { animation: float3 3.5s ease-in-out infinite; }
        .d4 { animation: float4 4.5s ease-in-out infinite; }
        .d5 { animation: float5 3s ease-in-out infinite; }
        .d6 { animation: wiggle 2.5s ease-in-out infinite; }

        .step-row {
          display: flex; align-items: center; gap: 14px;
          padding: 10px 0; border-bottom: 1px solid #f0f0f0;
        }
        .step-row:last-child { border-bottom: none; }
        .step-row:hover .step-label { color: #0a0a0a; }

        .textarea-box {
          width: 100%;
          border: 2px solid #0a0a0a;
          border-radius: 16px;
          background: #fafafa;
          overflow: hidden;
          transition: box-shadow 0.2s;
        }
        .textarea-box.focused { box-shadow: 5px 5px 0 #0a0a0a; }

        .prompt-textarea {
          width: 100%; background: transparent; border: none;
          padding: 16px 18px; color: #0a0a0a;
          font-size: 12.5px; line-height: 1.75;
          font-family: 'Fira Code','Courier New',monospace;
          resize: none; outline: none;
        }
        .prompt-textarea::placeholder { color: #c0c0c0; }

        .run-btn {
          background: #0a0a0a; color: #fff; border: none;
          border-radius: 8px; padding: 9px 20px;
          font-size: 13px; font-weight: 700; cursor: pointer;
          transition: background 0.15s;
          white-space: nowrap;
        }
        .run-btn:hover { background: #333; }

        .traffic-dot { width: 11px; height: 11px; border-radius: 50%; }

        @media (max-width: 860px) {
          .two-col { grid-template-columns: 1fr !important; }
          .right-panel { border-left: none !important; border-top: 1px solid #f0f0f0; }
        }
      `}</style>

      {/* NAV */}
      <nav className="nav-anim" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 48px', borderBottom: '1px solid #f0f0f0', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', border: '2px solid #0a0a0a',
            borderRadius: '7px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '13px', fontWeight: '900',
          }}>R</div>
          <span style={{ fontWeight: '800', fontSize: '15px', letterSpacing: '-0.02em' }}>RuleCheck</span>
        </div>
        <div />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0a0a0a', animation: 'blink 2s infinite' }} />
          <span style={{ fontSize: '11px', color: '#aaa', letterSpacing: '0.08em', fontWeight: '600' }}>AUTOMATED RED-TEAMING</span>
        </div>
      </nav>

      {/* BODY */}
      <div className="two-col" style={{
        flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden',
      }}>

        {/* LEFT PANEL */}
        <div className="left-anim" style={{
          padding: '52px 56px',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          borderRight: '1px solid #f0f0f0',
          position: 'relative', overflow: 'hidden',
        }}>

          {/* Doodle: Robot bottom-left */}
          <div className="d1" style={{ position: 'absolute', bottom: '60px', right: '32px', opacity: 0.18 }}>
            <svg width="100" height="120" viewBox="0 0 90 110" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="22" y="8" width="46" height="38" rx="8" />
              <line x1="45" y1="8" x2="45" y2="0" /><circle cx="45" cy="0" r="3" fill="#0a0a0a" />
              <circle cx="35" cy="24" r="5" /><circle cx="35" cy="24" r="2" fill="#0a0a0a" />
              <circle cx="55" cy="24" r="5" /><circle cx="55" cy="24" r="2" fill="#0a0a0a" />
              <path d="M35 35 Q45 40 55 35" />
              <rect x="18" y="50" width="54" height="36" rx="6" />
              <rect x="30" y="58" width="30" height="18" rx="4" />
              <line x1="36" y1="64" x2="54" y2="64" /><line x1="36" y1="70" x2="54" y2="70" />
              <line x1="18" y1="56" x2="6" y2="72" /><circle cx="4" cy="74" r="4" />
              <line x1="72" y1="56" x2="84" y2="72" /><circle cx="86" cy="74" r="4" />
              <line x1="33" y1="86" x2="30" y2="106" /><line x1="57" y1="86" x2="60" y2="106" />
            </svg>
          </div>

          {/* Doodle: small squiggle top right of left panel */}
          <div className="d5" style={{ position: 'absolute', top: '32px', right: '48px', opacity: 0.5 }}>
            <svg width="60" height="20" viewBox="0 0 60 20" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
              <path d="M0 10 Q8 0 16 10 Q24 20 32 10 Q40 0 48 10 Q56 20 60 10" />
            </svg>
          </div>

          {/* Doodle: circle top left */}
          <div className="d3" style={{ position: 'absolute', top: '40px', left: '36px', opacity: 0.5 }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#22c55e" strokeWidth="2">
              <circle cx="16" cy="16" r="14" />
            </svg>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#bbb', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '20px' }}>
              PROMPT SECURITY TOOL
            </div>

            <h1 style={{
              fontSize: 'clamp(34px, 3.8vw, 56px)',
              fontWeight: '900', lineHeight: 1.06,
              letterSpacing: '-0.04em', marginBottom: '28px',
            }}>
              Your AI follows<br />
              its rules.<br />
              <span style={{
                display: 'inline-block',
                background: '#0a0a0a', color: '#fff',
                padding: '2px 16px', borderRadius: '5px', marginTop: '4px',
              }}>
                Until it doesn't.
              </span>
            </h1>

            <p style={{ fontSize: '15px', color: '#777', lineHeight: '1.65', maxWidth: '360px', marginBottom: '0' }}>
              Paste any system prompt. RuleCheck extracts every rule, attacks each one, and scores what survives.
            </p>
          </div>

          <div>
            {STEPS.map(({ number, label }) => (
              <div key={number} className="step-row">
                <span style={{ fontSize: '10px', fontWeight: '700', color: '#ccc', letterSpacing: '0.1em', minWidth: '20px' }}>
                  {number}
                </span>
                <div style={{ width: '16px', height: '1px', background: '#e5e5e5', flexShrink: 0 }} />
                <span className="step-label" style={{ fontSize: '13px', color: '#888', fontWeight: '500', transition: 'color 0.15s' }}>
                  {label}
                </span>
              </div>
            ))}
            <p style={{ marginTop: '18px', fontSize: '11px', color: '#ccc' }}>
              Works with ChatGPT, Claude, Gemini — any LLM
            </p>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="right-anim right-panel" style={{
          padding: '52px 56px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center',
          position: 'relative', overflow: 'hidden',
          background: '#fefefe',
        }}>

          {/* Doodle: Shield top-right */}
          <div className="d2" style={{ position: 'absolute', top: '28px', right: '44px', opacity: 0.35 }}>
            <svg width="56" height="66" viewBox="0 0 80 96" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M40 4 L72 16 L72 48 C72 68 40 88 40 88 C40 88 8 68 8 48 L8 16 Z" />
              <polyline points="26,46 36,58 56,36" />
            </svg>
          </div>

          {/* Doodle: Bug bottom-left */}
          <div className="d4" style={{ position: 'absolute', bottom: '48px', left: '36px', opacity: 0.3 }}>
            <svg width="64" height="64" viewBox="0 0 60 60" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="30" cy="32" rx="14" ry="18" />
              <ellipse cx="30" cy="20" rx="10" ry="8" />
              <line x1="24" y1="14" x2="16" y2="4" /><circle cx="15" cy="3" r="2" fill="#0a0a0a" />
              <line x1="36" y1="14" x2="44" y2="4" /><circle cx="45" cy="3" r="2" fill="#0a0a0a" />
              <line x1="16" y1="30" x2="4" y2="24" /><line x1="16" y1="36" x2="4" y2="36" /><line x1="16" y1="42" x2="4" y2="48" />
              <line x1="44" y1="30" x2="56" y2="24" /><line x1="44" y1="36" x2="56" y2="36" /><line x1="44" y1="42" x2="56" y2="48" />
              <line x1="17" y1="32" x2="43" y2="32" /><line x1="17" y1="40" x2="43" y2="40" />
            </svg>
          </div>

          {/* Doodle: curl arrow bottom-right */}
          <div className="d6" style={{ position: 'absolute', bottom: '44px', right: '40px', opacity: 0.4 }}>
            <svg width="56" height="48" viewBox="0 0 56 48" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
              <path d="M4 8 Q28 -4 48 24 Q56 36 44 44" />
              <polyline points="38,36 44,44 36,46" />
            </svg>
          </div>

          {/* Doodle: magnifier top-left of right panel */}
          <div className="d3" style={{ position: 'absolute', top: '36px', left: '40px', opacity: 0.3 }}>
            <svg width="48" height="48" viewBox="0 0 52 60" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round">
              <circle cx="22" cy="22" r="18" />
              <line x1="35" y1="36" x2="50" y2="56" />
              <line x1="16" y1="22" x2="28" y2="22" />
              <line x1="22" y1="16" x2="22" y2="28" />
            </svg>
          </div>

          <div style={{ position: 'relative', zIndex: 2 }}>
            <div style={{ fontSize: '11px', color: '#bbb', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '14px' }}>
              PASTE YOUR SYSTEM PROMPT
            </div>

            <div className={`textarea-box${focused ? ' focused' : ''}`}>
              {/* Traffic lights */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', padding: '11px 14px 0' }}>
                <div className="traffic-dot" style={{ background: '#FF5F57' }} />
                <div className="traffic-dot" style={{ background: '#FEBC2E' }} />
                <div className="traffic-dot" style={{ background: '#28C840' }} />
                <span style={{ marginLeft: '8px', fontSize: '10px', color: '#ccc', fontFamily: 'monospace' }}>
                  system_prompt.txt
                </span>
              </div>

              <textarea
                className="prompt-textarea"
                value={prompt}
                onChange={e => { setPrompt(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={PLACEHOLDER}
                rows={11}
              />

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderTop: '1px solid #eee', background: '#f5f5f5',
              }}>
                <span style={{ fontSize: '11px', color: error ? '#c0392b' : '#bbb' }}>
                  {error || (prompt.length > 0 ? `${prompt.length} chars · ⌘↵ to run` : 'Any system prompt works')}
                </span>
                <button className="run-btn" onClick={handleRun}>Run Audit →</button>
              </div>
            </div>

            <p style={{ marginTop: '14px', textAlign: 'center', fontSize: '12px', color: '#ccc' }}>
              No login · No setup · Results in ~60 seconds
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{
        borderTop: '1px solid #f0f0f0', padding: '12px 48px', flexShrink: 0,
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '11px', color: '#ccc' }}>© 2026 RuleCheck</span>
        <span style={{ fontSize: '11px', color: '#ccc' }}>Powered by GPT-4o mini</span>
      </div>
    </main>
  );
}
