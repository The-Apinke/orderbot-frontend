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

export default function AuditPage() {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  function handleRun() {
    const trimmed = prompt.trim();
    if (trimmed.length < 20) {
      setError('Please paste a system prompt (at least 20 characters).');
      return;
    }
    sessionStorage.setItem('auditPrompt', trimmed);
    router.push('/audit/results');
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0d0d0d 0%, #1a1a2e 60%, #0d0d0d 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Inter', 'Geist', sans-serif",
    }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '100px', padding: '6px 16px', marginBottom: '20px',
        }}>
          <span style={{ fontSize: '13px', color: '#a5b4fc', letterSpacing: '0.05em' }}>
            PROMPT AUDIT TOOL
          </span>
        </div>
        <h1 style={{
          fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: '700',
          color: '#ffffff', margin: '0 0 12px',
          letterSpacing: '-0.02em', lineHeight: 1.15,
        }}>
          Stress-test your system prompt
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0, maxWidth: '480px' }}>
          Paste any LLM system prompt. We extract every rule inside it,
          attack each one, and tell you what holds.
        </p>
      </div>

      {/* Input card */}
      <div style={{
        width: '100%', maxWidth: '680px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px', padding: '24px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
      }}>
        <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '10px', letterSpacing: '0.05em' }}>
          SYSTEM PROMPT
        </label>
        <textarea
          value={prompt}
          onChange={e => { setPrompt(e.target.value); setError(''); }}
          placeholder={PLACEHOLDER}
          rows={12}
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', padding: '16px',
            color: '#e2e8f0', fontSize: '14px', lineHeight: '1.6',
            fontFamily: "'Fira Code', 'Courier New', monospace",
            resize: 'vertical', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
          <span style={{ color: error ? '#f87171' : '#475569', fontSize: '13px' }}>
            {error || `${prompt.length} characters`}
          </span>
          <button
            onClick={handleRun}
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: '#fff', border: 'none', borderRadius: '10px',
              padding: '12px 28px', fontSize: '15px', fontWeight: '600',
              cursor: 'pointer', letterSpacing: '0.01em',
              boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.target.style.opacity = '0.85'}
            onMouseLeave={e => e.target.style.opacity = '1'}
          >
            Run Audit →
          </button>
        </div>
      </div>

      {/* How it works */}
      <div style={{
        display: 'flex', gap: '12px', marginTop: '32px', flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {[
          { step: '01', label: 'Rules extracted' },
          { step: '02', label: 'Each rule attacked' },
          { step: '03', label: 'AI response streamed' },
          { step: '04', label: 'PASS / FAIL verdict' },
        ].map(({ step, label }) => (
          <div key={step} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '100px', padding: '6px 14px',
          }}>
            <span style={{ color: '#6366f1', fontSize: '11px', fontWeight: '700' }}>{step}</span>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>{label}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
