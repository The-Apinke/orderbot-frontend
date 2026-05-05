'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

// THEMES.ajeboplus — exact values from ajebo-plus (2).jsx
const t = {
  bg:          '#f0e6d0',
  bgAlt:       '#e8dcc0',
  surface:     '#faf4e4',
  surfaceAlt:  '#f0e6d0',
  ink:         '#1a0c04',
  inkDim:      'rgba(26,12,4,0.7)',
  inkMuted:    'rgba(26,12,4,0.5)',
  accent:      '#c25a1c',
  accentSoft:  '#e08246',
  border:      'rgba(26,12,4,0.18)',
  displayFont: "'Big Shoulders Stencil Display', 'Anton', sans-serif",
  serifFont:   "'Fraunces', 'Playfair Display', serif",
  bodyFont:    "'Inter', 'DM Sans', system-ui, sans-serif",
  monoFont:    "'JetBrains Mono', 'DM Mono', monospace",
};

const QUICK_PROMPTS = ["What's on the menu?", "Order Beef Suya", "Best seller?"];

export default function ChatPage() {
  const [messages, setMessages]                   = useState([]);
  const [input, setInput]                         = useState('');
  const [loading, setLoading]                     = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [menu, setMenu]                           = useState(null);
  const menuRailRef = useRef(null);
  const [cart, setCart]                           = useState([]);
  const [checkoutStep, setCheckoutStep]           = useState(null);
  const [customerName, setCustomerName]           = useState('');
  const [customerPhone, setCustomerPhone]         = useState('');
  const [isRecording, setIsRecording]             = useState(false);
  const [isTranscribing, setIsTranscribing]       = useState(false);
  const endRef            = useRef(null);
  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const router            = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => { fetchMenu(); fetchWelcome(); }, []);
  useEffect(() => {
    endRef.current?.parentElement?.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [messages]);

  async function fetchMenu() {
    try {
      const res  = await fetch(`${API}/menu`);
      const data = await res.json();
      setMenu(data.menu ?? {});
    } catch {
      setMenu({});
    }
  }

  async function fetchWelcome() {
    try {
      const res  = await fetch(`${API}/chat/welcome`);
      const data = await res.json();
      setMessages([{ role: 'assistant', content: data.message }]);
    } catch {
      setMessages([{ role: 'assistant', content: "Welcome — I'm Soji. Tell me what you want and how you want it. Or tap anything from the menu below to get started." }]);
    }
  }

  function addToCart(item) {
    setCart(prev => {
      const ex = prev.find(i => i.name === item.name);
      if (ex) return prev.map(i => i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  }
  function removeFromCart(name) { setCart(prev => prev.filter(i => i.name !== name)); }

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: 'user-1', message: text, conversation_history: conversationHistory }),
      });
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = '', updatedHistory = [];
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n').filter(l => l.startsWith('data: '));
        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.token) {
              fullReply += json.token;
              setMessages(prev => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: fullReply }; return u; });
            }
            if (json.done) updatedHistory = json.conversation_history;
          } catch {}
        }
      }
      const match = fullReply.match(/\[ORDER_CONFIRMED\]([\s\S]*?)\[\/ORDER_CONFIRMED\]/);
      if (match) {
        const orderData = JSON.parse(match[1]);
        await fetch(`${API}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData) });
        router.push(`/confirmation?name=${encodeURIComponent(orderData.customer_name)}&phone=${encodeURIComponent(orderData.customer_phone)}&total=${orderData.total_price}`);
        return;
      }
      setConversationHistory(updatedHistory);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally { setLoading(false); }
  }

  async function handleCartCheckout() {
    if (cart.length === 0) return;
    if (!checkoutStep) { setCheckoutStep('name'); return; }
    if (checkoutStep === 'name') { if (!customerName.trim()) return; setCheckoutStep('phone'); return; }
    if (checkoutStep === 'phone') {
      if (!customerPhone.trim()) return;
      await fetch(`${API}/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName, customer_phone: customerPhone,
          items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
          total_price: cartTotal, notes: '',
        }),
      });
      router.push(`/confirmation?name=${encodeURIComponent(customerName)}&phone=${encodeURIComponent(customerPhone)}&total=${cartTotal}`);
    }
  }

  async function startVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr     = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorderRef.current = mr;
      mr.start(); setIsRecording(true);
    } catch { alert('Microphone access denied.'); }
  }

  async function confirmVoice() {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    mr.onstop = async () => {
      setIsRecording(false); setIsTranscribing(true);
      try {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const fd   = new FormData();
        fd.append('audio', blob, 'audio.webm');
        const res  = await fetch(`${API}/chat/transcribe`, { method: 'POST', body: fd });
        const data = await res.json();
        setInput(data.transcript || '');
      } catch { alert('Transcription failed.'); }
      finally { setIsTranscribing(false); mr.stream.getTracks().forEach(t => t.stop()); }
    };
    mr.stop();
  }

  function cancelVoice() {
    const mr = mediaRecorderRef.current;
    if (mr) { mr.onstop = () => mr.stream.getTracks().forEach(t => t.stop()); mr.stop(); }
    setIsRecording(false);
  }

  const allItems = menu ? Object.values(menu).flat() : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Stencil+Display:wght@700;900&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes wave { 0%,100%{transform:scaleY(1);opacity:.5} 50%{transform:scaleY(1.8);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        *::-webkit-scrollbar { width: 4px; height: 4px; }
        *::-webkit-scrollbar-thumb { background: rgba(26,12,4,0.15); border-radius: 2px; }
        *::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div style={{
        width: '100%', height: '100%',
        background: `radial-gradient(ellipse 100% 70% at 50% 0%, ${t.surface} 0%, ${t.bg} 60%, ${t.bgAlt} 100%)`,
        color: t.ink, fontFamily: t.bodyFont,
        display: 'grid', gridTemplateRows: 'auto 1fr auto auto',
        gridTemplateColumns: 'minmax(0, 1fr)', overflow: 'hidden',
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      }}>

        {/* ── HEADER ── */}
        <div style={{
          padding: '14px 28px', borderBottom: '1.5px solid rgba(255,255,255,0.2)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: t.accent,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/')} style={{
              background: 'transparent', border: '1.5px solid rgba(255,255,255,0.6)', color: '#fff',
              width: 32, height: 32, cursor: 'pointer', borderRadius: '50%', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>←</button>
            <div>
              <div style={{ fontFamily: t.displayFont, fontSize: 17, fontWeight: 700, letterSpacing: '0.02em', whiteSpace: 'nowrap', color: '#fff' }}>
                UNCLE SOJI'S
              </div>
              <div style={{ fontFamily: t.monoFont, fontSize: 9, letterSpacing: '0.24em', color: 'rgba(255,255,255,0.85)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'pulseDot 1.6s infinite' }}/>
                SOJI IS LIVE
              </div>
            </div>
          </div>

          <button onClick={handleCartCheckout} disabled={!cartCount} style={{
            padding: '9px 18px', fontFamily: t.monoFont, fontSize: 10, letterSpacing: '0.2em',
            background: cartCount ? '#fff' : 'transparent',
            color: cartCount ? t.accent : 'rgba(255,255,255,0.6)',
            border: `1.5px solid ${cartCount ? '#fff' : 'rgba(255,255,255,0.5)'}`,
            cursor: cartCount ? 'pointer' : 'not-allowed', fontWeight: 700,
            borderRadius: 100, whiteSpace: 'nowrap',
          }}>
            {cartCount > 0 ? `CHECKOUT · ${cartCount} · ₦${cartTotal.toLocaleString()}` : 'CART · EMPTY'}
          </button>
        </div>

        {/* ── MESSAGES ── */}
        <div style={{ overflowY: 'auto', padding: '28px 40px' }}>
          {messages.map((m, i) => {
            const isLast   = i === messages.length - 1;
            const isTyping = m.role === 'assistant' && loading && isLast && m.content === '';
            return (
              <div key={i} style={{
                display: 'flex', marginBottom: 18,
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                {m.role === 'assistant' && (
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: t.accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: t.displayFont, color: '#fff', fontSize: 14,
                    marginRight: 10, flexShrink: 0, fontWeight: 700, alignSelf: 'flex-end',
                  }}>S</div>
                )}
                <div style={{ maxWidth: '70%' }}>
                  <div style={{
                    fontFamily: t.monoFont, fontSize: 9, letterSpacing: '0.24em',
                    color: m.role === 'user' ? t.inkMuted : t.accent, marginBottom: 4,
                    textAlign: m.role === 'user' ? 'right' : 'left',
                  }}>
                    {m.role === 'user' ? '→ YOU' : '→ SOJI'}
                  </div>
                  <div style={{
                    background: m.role === 'user' ? t.ink : t.surface,
                    color: m.role === 'user' ? t.bg : t.ink,
                    padding: '14px 18px', fontSize: 15, lineHeight: 1.55,
                    border: m.role === 'assistant' ? `1.5px solid ${t.border}` : 'none',
                    borderRadius: m.role === 'user' ? '20px 20px 6px 20px' : '6px 20px 20px 20px',
                    fontFamily: m.role === 'assistant' ? t.serifFont : t.bodyFont,
                    fontStyle: m.role === 'assistant' ? 'italic' : 'normal',
                  }}>
                    {isTyping ? (
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
                        {[0, 0.18, 0.36].map((delay, d) => (
                          <div key={d} style={{ width: 6, height: 6, background: t.accent, borderRadius: '50%', animation: `bounce 1.2s ${delay}s infinite` }}/>
                        ))}
                      </div>
                    ) : m.role === 'assistant' ? (
                      <ReactMarkdown>{m.content.split('[ORDER_CONFIRMED]')[0].trim()}</ReactMarkdown>
                    ) : m.content}
                  </div>
                </div>
              </div>
            );
          })}

          {messages.length <= 1 && !loading && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontFamily: t.monoFont, fontSize: 9, letterSpacing: '0.24em', color: t.inkMuted, marginBottom: 10 }}>
                → START WITH
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => sendMessage(p)} style={{
                    background: t.surface, color: t.ink, border: `1.5px solid ${t.border}`,
                    padding: '10px 18px', fontFamily: t.serifFont, fontStyle: 'italic',
                    fontSize: 13.5, cursor: 'pointer', borderRadius: 100,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.accent; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = t.accent; }}
                  onMouseLeave={e => { e.currentTarget.style.background = t.surface; e.currentTarget.style.color = t.ink; e.currentTarget.style.borderColor = t.border; }}
                  >{p}</button>
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* ── MENU RAIL — horizontal, alternating accent cards every 4th (idx % 4 === 0) ── */}
        <div style={{
          borderTop: '1.5px solid rgba(255,255,255,0.2)', padding: '16px 28px 18px',
          background: t.accent,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: t.monoFont, fontSize: 10, letterSpacing: '0.24em', color: '#fff' }}>
              → THE MENU · TAP TO ADD TO CART
            </div>
            {cartCount > 0 && (
              <div style={{ display: 'flex', gap: 6, fontFamily: t.monoFont, fontSize: 10, letterSpacing: '0.1em', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {cart.map(i => (
                  <span key={i.name} style={{
                    padding: '3px 10px', background: '#fff', color: t.ink, borderRadius: 100,
                    display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600,
                  }}>
                    {i.name.split(' ')[0].toUpperCase()}×{i.quantity}
                    <button onClick={() => removeFromCart(i.name)} style={{
                      background: 'none', border: 'none', color: t.accent, cursor: 'pointer', fontSize: 12, padding: 0, fontWeight: 700,
                    }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {allItems === null ? (
            <div style={{ fontFamily: t.serifFont, fontStyle: 'italic', fontSize: 14, color: 'rgba(255,255,255,0.85)', padding: '10px 0', lineHeight: 1.5 }}>
              Just a minute — we're pulling up the menu for you. It'll appear here shortly.
            </div>
          ) : allItems.length === 0 ? (
            <div style={{ fontFamily: t.serifFont, fontStyle: 'italic', fontSize: 14, color: 'rgba(255,255,255,0.85)', padding: '10px 0' }}>
              No menu items found. Check back soon.
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div
                ref={menuRailRef}
                style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, minWidth: 0, scrollbarWidth: 'thin', scrollbarColor: `rgba(255,255,255,0.4) transparent` }}
              >
                {allItems.map((item, idx) => (
                  <button key={item.id} onClick={() => addToCart(item)} style={{
                    flexShrink: 0, width: 158,
                    background: t.surface, color: t.ink,
                    border: `1.5px solid ${t.ink}`,
                    padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                    borderRadius: 14,
                    display: 'flex', flexDirection: 'column', gap: 4,
                    transition: 'transform 0.15s, box-shadow 0.15s, background 0.15s, color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = t.accent;
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = t.accent;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(26,12,4,0.12)';
                    e.currentTarget.querySelector('.item-num').style.color = 'rgba(255,255,255,0.7)';
                    e.currentTarget.querySelector('.item-price').style.color = '#fff';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = t.surface;
                    e.currentTarget.style.color = t.ink;
                    e.currentTarget.style.borderColor = t.ink;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.querySelector('.item-num').style.color = t.accent;
                    e.currentTarget.querySelector('.item-price').style.color = t.ink;
                  }}
                  >
                    <div className="item-num" style={{ fontFamily: t.monoFont, fontSize: 9, color: t.accent, letterSpacing: '0.18em' }}>
                      → {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div style={{ fontFamily: t.serifFont, fontSize: 16, fontWeight: 700, lineHeight: 1.1 }}>
                      {item.name}
                    </div>
                    <div className="item-price" style={{ fontFamily: t.monoFont, fontSize: 12, fontWeight: 700, marginTop: 2, color: t.ink }}>
                      ₦{item.price.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
              {/* Scroll arrow — clickable */}
              <div style={{
                position: 'absolute', right: 0, top: 0, bottom: 4,
                width: 52, pointerEvents: 'none',
                background: `linear-gradient(to right, transparent, ${t.accent})`,
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              }}>
                <button
                  onClick={() => menuRailRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                  style={{
                    pointerEvents: 'auto',
                    width: 30, height: 30, borderRadius: '50%',
                    background: '#fff', color: t.accent,
                    border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, marginRight: 2, flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(26,12,4,0.2)',
                  }}
                >›</button>
              </div>
            </div>
          )}
        </div>

        {/* ── INPUT — pill style with voice ── */}
        <div style={{
          padding: '14px 28px', borderTop: `1.5px solid ${t.ink}`, background: t.surface,
          display: 'flex', gap: 10, alignItems: 'center',
        }}>
          {isTranscribing || isRecording ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, background: '#fff5f5', border: '1.5px solid #c0392b', padding: '10px 16px', borderRadius: 100 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                {[0, 0.1, 0.2, 0.3, 0.4].map((d, i) => (
                  <div key={i} style={{ width: 3, borderRadius: 2, background: '#c0392b', animation: `wave 1s ${d}s ease-in-out infinite`, height: [7, 14, 20, 14, 7][i] }}/>
                ))}
              </div>
              <div style={{ flex: 1, fontSize: 13, color: '#c0392b', fontStyle: 'italic' }}>
                {isTranscribing ? 'Transcribing your order…' : 'Listening — speak your order…'}
              </div>
              {isRecording && <>
                <button onClick={cancelVoice} style={{ width: 34, height: 34, borderRadius: '50%', background: 'transparent', border: '1.5px solid #c0392b', color: '#c0392b', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
                <button onClick={confirmVoice} style={{ width: 34, height: 34, borderRadius: '50%', background: '#27ae60', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </button>
              </>}
            </div>
          ) : (
            <>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') sendMessage(input); }}
                placeholder="Say what you want, or just 'menu'…"
                style={{
                  flex: 1, background: t.bg, border: `1.5px solid ${t.border}`,
                  padding: '12px 22px', fontFamily: t.bodyFont, fontSize: 14, outline: 'none',
                  color: t.ink, borderRadius: 100,
                }}
                onFocus={e => e.currentTarget.style.borderColor = t.accent}
                onBlur={e => e.currentTarget.style.borderColor = t.border}
              />
              <button onClick={startVoice} title="Speak your order" style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: t.bg, border: `1.5px solid ${t.border}`, color: t.ink,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="12" rx="3"/>
                  <path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
                </svg>
              </button>
              <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{
                background: (!loading && input.trim()) ? t.accent : t.border,
                color: (!loading && input.trim()) ? '#fff' : t.inkMuted,
                border: 'none', width: 44, height: 44, borderRadius: '50%',
                cursor: (!loading && input.trim()) ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── CHECKOUT MODAL ── */}
      {checkoutStep && (
        <div onClick={e => { if (e.target === e.currentTarget) setCheckoutStep(null); }} style={{
          position: 'fixed', inset: 0, background: 'rgba(26,12,4,0.5)',
          zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: t.surface, border: `1.5px solid ${t.ink}`,
            width: 340, padding: '32px 28px', borderRadius: 20,
            boxShadow: '0 24px 64px rgba(26,12,4,0.2)',
            animation: 'fadeUp 0.25s ease',
          }}>
            {checkoutStep === 'name' && <>
              <div style={{ fontSize: 22, marginBottom: 14 }}>👤</div>
              <div style={{ fontFamily: t.displayFont, fontSize: 28, fontWeight: 700, color: t.ink, marginBottom: 4 }}>ALMOST THERE</div>
              <div style={{ fontSize: 13, color: t.inkMuted, marginBottom: 20, lineHeight: 1.5 }}>What name should we put on your order?</div>
              <input placeholder="Your full name" value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCartCheckout()} autoFocus
                style={{ width: '100%', background: t.bg, border: `1.5px solid ${t.border}`, padding: '12px 18px', color: t.ink, borderRadius: 100, fontFamily: t.bodyFont, fontSize: 14, outline: 'none', marginBottom: 10 }}
                onFocus={e => e.currentTarget.style.borderColor = t.accent}
                onBlur={e => e.currentTarget.style.borderColor = t.border}
              />
              <button onClick={handleCartCheckout} style={{ width: '100%', padding: 13, background: t.accent, color: '#fff', border: 'none', borderRadius: 100, fontFamily: t.monoFont, fontSize: 12, letterSpacing: '0.18em', fontWeight: 700, cursor: 'pointer' }}>
                CONTINUE →
              </button>
            </>}
            {checkoutStep === 'phone' && <>
              <div style={{ fontSize: 22, marginBottom: 14 }}>📱</div>
              <div style={{ fontFamily: t.displayFont, fontSize: 28, fontWeight: 700, color: t.ink, marginBottom: 4 }}>ONE LAST THING</div>
              <div style={{ fontSize: 13, color: t.inkMuted, marginBottom: 20, lineHeight: 1.5 }}>We'll reach you on this number once payment clears.</div>
              <input placeholder="08XXXXXXXXX" value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCartCheckout()} autoFocus
                style={{ width: '100%', background: t.bg, border: `1.5px solid ${t.border}`, padding: '12px 18px', color: t.ink, borderRadius: 100, fontFamily: t.bodyFont, fontSize: 14, outline: 'none', marginBottom: 10 }}
                onFocus={e => e.currentTarget.style.borderColor = t.accent}
                onBlur={e => e.currentTarget.style.borderColor = t.border}
              />
              <button onClick={handleCartCheckout} style={{ width: '100%', padding: 13, background: t.accent, color: '#fff', border: 'none', borderRadius: 100, fontFamily: t.monoFont, fontSize: 12, letterSpacing: '0.18em', fontWeight: 700, cursor: 'pointer' }}>
                PLACE ORDER →
              </button>
            </>}
          </div>
        </div>
      )}
    </>
  );
}
