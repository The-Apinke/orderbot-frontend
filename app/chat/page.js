'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

// Palette pulled from landing page.js — dark brown + cream + gold + ember
const t = {
  bgGradient:  'linear-gradient(160deg, #3a1600 0%, #5c2400 40%, #3a1200 100%)',
  bgDeep:      '#3a1200',
  bgMid:       '#5c2400',
  surface:     '#4a1d08',
  surfaceHi:   'rgba(245,240,230,0.08)',
  cream:       '#f5f0e6',
  creamDim:    'rgba(245,240,230,0.58)',
  creamMuted:  'rgba(245,240,230,0.38)',
  creamFaint:  'rgba(245,240,230,0.18)',
  border:      'rgba(245,240,230,0.18)',
  borderStrong:'rgba(245,240,230,0.35)',
  gold:        '#d6b24a',
  goldDim:     'rgba(214,178,74,0.6)',
  ember:       '#ff7a1f',
  emberDim:    'rgba(255,122,31,0.3)',
  displayFont: "'Bebas Neue', sans-serif",
  serifFont:   "'Syne', 'DM Sans', sans-serif",
  bodyFont:    "'DM Sans', system-ui, sans-serif",
  monoFont:    "'JetBrains Mono', 'DM Mono', monospace",
};

const QUICK_PROMPTS = ["What's on the menu?", "Order Beef Suya", "Best seller?"];

export default function ChatPage() {
  const [messages, setMessages]                       = useState([]);
  const [input, setInput]                             = useState('');
  const [loading, setLoading]                         = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [menu, setMenu]                               = useState(null);
  const menuRailRef                                   = useRef(null);
  const [cart, setCart]                               = useState([]);
  const [checkoutStep, setCheckoutStep]               = useState(null);
  const [customerName, setCustomerName]               = useState('');
  const [customerPhone, setCustomerPhone]             = useState('');
  const [isRecording, setIsRecording]                 = useState(false);
  const [isTranscribing, setIsTranscribing]           = useState(false);
  const endRef            = useRef(null);
  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const router            = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL || 'https://orderbot-backend-production-d13d.up.railway.app';

  useEffect(() => { fetchMenu(); fetchWelcome(); }, []);
  useEffect(() => {
    endRef.current?.parentElement?.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [messages]);

  async function fetchMenu() {
    try {
      const res  = await fetch(`${API}/menu`);
      const data = await res.json();
      setMenu(data.menu ?? {});
    } catch { setMenu({}); }
  }

  async function fetchWelcome() {
    try {
      const res  = await fetch(`${API}/chat/welcome`);
      const data = await res.json();
      setMessages([{ role: 'assistant', content: data.message }]);
    } catch {
      setMessages([{ role: 'assistant', content: "Welcome — I'm Soji. Tell me what you want and how you want it. Or tap something from the menu below to get started." }]);
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
      finally { setIsTranscribing(false); mr.stream.getTracks().forEach(tr => tr.stop()); }
    };
    mr.stop();
  }

  function cancelVoice() {
    const mr = mediaRecorderRef.current;
    if (mr) { mr.onstop = () => mr.stream.getTracks().forEach(tr => tr.stop()); mr.stop(); }
    setIsRecording(false);
  }

  const allItems = menu ? Object.values(menu).flat() : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        @keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-5px);opacity:1} }
        @keyframes wave { 0%,100%{transform:scaleY(1);opacity:.5} 50%{transform:scaleY(1.8);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        *::-webkit-scrollbar { width: 4px; height: 4px; }
        *::-webkit-scrollbar-thumb { background: rgba(245,240,230,0.18); border-radius: 2px; }
        *::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      {/* Ambient ember glow — matches landing page */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 70% 55% at 50% 30%, rgba(255,110,0,0.32) 0%, rgba(200,60,0,0.14) 55%, transparent 100%)',
      }} />

      <div style={{
        width: '100%', height: '100%',
        background: t.bgGradient,
        color: t.cream, fontFamily: t.bodyFont,
        display: 'grid', gridTemplateRows: 'auto 1fr auto auto',
        gridTemplateColumns: 'minmax(0, 1fr)', overflow: 'hidden',
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1,
      }}>

        {/* ── HEADER ── */}
        <div style={{
          padding: '14px 28px', borderBottom: `1px solid ${t.creamFaint}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'transparent', position: 'relative', zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => router.push('/')} style={{
              background: 'transparent', border: `1px solid ${t.creamFaint}`, color: t.cream,
              width: 32, height: 32, cursor: 'pointer', borderRadius: '50%', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = t.surfaceHi; e.currentTarget.style.borderColor = t.gold; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = t.creamFaint; }}
            >←</button>
            <div>
              <div style={{ fontFamily: t.displayFont, fontSize: 19, letterSpacing: '0.04em', whiteSpace: 'nowrap', color: t.cream, lineHeight: 1 }}>
                UNCLE SOJI'S
              </div>
              <div style={{ fontFamily: t.monoFont, fontSize: 9, letterSpacing: '0.28em', color: t.gold, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.gold, display: 'inline-block', animation: 'pulseDot 1.6s infinite', boxShadow: `0 0 8px ${t.gold}` }}/>
                SOJI IS LIVE
              </div>
            </div>
          </div>

          <button onClick={handleCartCheckout} disabled={!cartCount} style={{
            padding: '9px 18px', fontFamily: t.monoFont, fontSize: 10, letterSpacing: '0.2em',
            background: cartCount ? t.gold : 'transparent',
            color: cartCount ? '#1a0c04' : t.cream,
            border: `1px solid ${cartCount ? t.gold : t.borderStrong}`,
            cursor: cartCount ? 'pointer' : 'not-allowed', fontWeight: 700,
            borderRadius: 100, whiteSpace: 'nowrap', transition: 'all 0.15s',
            boxShadow: cartCount ? '0 0 20px rgba(214,178,74,0.25)' : 'none',
          }}>
            {cartCount > 0 ? `CHECKOUT · ${cartCount} · ₦${cartTotal.toLocaleString()}` : 'CART · EMPTY'}
          </button>
        </div>

        {/* ── MESSAGES ── */}
        <div style={{ overflowY: 'auto', padding: '32px 40px', position: 'relative', zIndex: 1 }}>
          {messages.map((m, i) => {
            const isLast   = i === messages.length - 1;
            const isTyping = m.role === 'assistant' && loading && isLast && m.content === '';
            return (
              <div key={i} style={{
                display: 'flex', marginBottom: 20,
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                animation: 'fadeUp 0.3s ease',
              }}>
                {m.role === 'assistant' && (
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%',
                    background: `radial-gradient(circle at 30% 30%, ${t.ember} 0%, #c25a1c 80%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: t.displayFont, color: t.cream, fontSize: 15,
                    marginRight: 12, flexShrink: 0, alignSelf: 'flex-end',
                    boxShadow: `0 0 16px ${t.emberDim}`,
                    border: `1px solid ${t.goldDim}`,
                  }}>S</div>
                )}
                <div style={{ maxWidth: '70%' }}>
                  <div style={{
                    fontFamily: t.monoFont, fontSize: 9, letterSpacing: '0.28em',
                    color: m.role === 'user' ? t.creamMuted : t.gold, marginBottom: 5,
                    textAlign: m.role === 'user' ? 'right' : 'left',
                  }}>
                    {m.role === 'user' ? '→ YOU' : '→ SOJI'}
                  </div>
                  <div style={{
                    background: m.role === 'user'
                      ? 'linear-gradient(135deg, #d6b24a 0%, #c9a84c 100%)'
                      : '#f5f0e6',
                    color: '#1a0c04',
                    padding: '13px 18px', fontSize: 15, lineHeight: 1.6,
                    border: 'none',
                    borderRadius: m.role === 'user' ? '20px 20px 6px 20px' : '6px 20px 20px 20px',
                    fontFamily: m.role === 'assistant' ? t.serifFont : t.bodyFont,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
                  }}>
                    {isTyping ? (
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '4px 0' }}>
                        {[0, 0.18, 0.36].map((delay, d) => (
                          <div key={d} style={{ width: 7, height: 7, background: t.gold, borderRadius: '50%', animation: `bounce 1.2s ${delay}s infinite` }}/>
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
              <div style={{ fontFamily: t.monoFont, fontSize: 10, letterSpacing: '0.28em', color: t.creamMuted, marginBottom: 12 }}>
                → START WITH
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {QUICK_PROMPTS.map((p, i) => (
                  <button key={i} onClick={() => sendMessage(p)} style={{
                    background: 'rgba(245,240,230,0.04)', color: t.cream, border: `1px solid ${t.creamFaint}`,
                    padding: '10px 20px', fontFamily: t.serifFont,
                    fontSize: 14, cursor: 'pointer', borderRadius: 100, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = t.gold; e.currentTarget.style.color = '#1a0c04'; e.currentTarget.style.borderColor = t.gold; e.currentTarget.style.boxShadow = '0 0 18px rgba(214,178,74,0.3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,240,230,0.04)'; e.currentTarget.style.color = t.cream; e.currentTarget.style.borderColor = t.creamFaint; e.currentTarget.style.boxShadow = 'none'; }}
                  >{p}</button>
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* ── MENU RAIL ── */}
        <div style={{
          borderTop: `1px solid ${t.creamFaint}`, padding: '18px 28px 20px',
          background: 'rgba(26,8,2,0.4)', position: 'relative', zIndex: 1,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: t.monoFont, fontSize: 10, letterSpacing: '0.28em', color: t.gold }}>
              → THE MENU · TAP TO ADD TO CART
            </div>
            {cartCount > 0 && (
              <div style={{ display: 'flex', gap: 6, fontFamily: t.monoFont, fontSize: 10, letterSpacing: '0.1em', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {cart.map(i => (
                  <span key={i.name} style={{
                    padding: '3px 10px', background: t.gold, color: '#1a0c04', borderRadius: 100,
                    display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700,
                  }}>
                    {i.name.split(' ')[0].toUpperCase()}×{i.quantity}
                    <button onClick={() => removeFromCart(i.name)} style={{
                      background: 'none', border: 'none', color: '#5c2400', cursor: 'pointer', fontSize: 13, padding: 0, fontWeight: 700, lineHeight: 1,
                    }}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {allItems === null ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 0.15, 0.3].map((d, i) => (
                  <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: t.gold, animation: `bounce 1.2s ${d}s infinite` }}/>
                ))}
              </div>
              <div style={{ fontFamily: t.serifFont, fontSize: 14, color: t.creamDim }}>
                Give us a moment — we're getting the menu ready…
              </div>
            </div>
          ) : allItems.length === 0 ? (
            <div style={{ fontFamily: t.serifFont, fontSize: 14, color: t.creamDim, padding: '10px 0' }}>
              The menu isn't showing right now — try refreshing in a moment.
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div ref={menuRailRef} style={{
                display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, minWidth: 0,
                scrollbarWidth: 'thin', scrollbarColor: `rgba(245,240,230,0.25) transparent`,
              }}>
                {allItems.map((item, idx) => (
                  <button key={item.id} onClick={() => addToCart(item)} style={{
                    flexShrink: 0, width: 162,
                    background: '#f5f0e6', color: '#1a0c04',
                    border: '1px solid rgba(245,240,230,0.4)',
                    padding: '12px 14px', cursor: 'pointer', textAlign: 'left',
                    borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 5,
                    transition: 'all 0.18s', backdropFilter: 'blur(4px)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = t.gold;
                    e.currentTarget.style.color = '#1a0c04';
                    e.currentTarget.style.borderColor = t.gold;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 22px rgba(214,178,74,0.3)';
                    e.currentTarget.querySelector('.item-num').style.color = 'rgba(26,12,4,0.6)';
                    e.currentTarget.querySelector('.item-price').style.color = '#1a0c04';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#f5f0e6';
                    e.currentTarget.style.color = '#1a0c04';
                    e.currentTarget.style.borderColor = 'rgba(245,240,230,0.4)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.querySelector('.item-num').style.color = t.bgMid;
                    e.currentTarget.querySelector('.item-price').style.color = '#1a0c04';
                  }}
                  >
                    <div className="item-num" style={{ fontFamily: t.monoFont, fontSize: 9, color: t.bgMid, letterSpacing: '0.2em' }}>
                      → {String(idx + 1).padStart(2, '0')}
                    </div>
                    <div style={{ fontFamily: t.serifFont, fontSize: 15, fontWeight: 700, lineHeight: 1.15 }}>
                      {item.name}
                    </div>
                    <div className="item-price" style={{ fontFamily: t.monoFont, fontSize: 12, fontWeight: 700, marginTop: 2, color: '#1a0c04' }}>
                      ₦{item.price.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
              <div style={{
                position: 'absolute', right: 0, top: 0, bottom: 4, width: 52, pointerEvents: 'none',
                background: 'linear-gradient(to right, transparent, rgba(26,8,2,0.85))',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              }}>
                <button onClick={() => menuRailRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} style={{
                  pointerEvents: 'auto', width: 30, height: 30, borderRadius: '50%',
                  background: t.gold, color: '#1a0c04', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 700, marginRight: 2, flexShrink: 0,
                  boxShadow: '0 2px 10px rgba(214,178,74,0.4)',
                }}>›</button>
              </div>
            </div>
          )}
        </div>

        {/* ── INPUT ── */}
        <div style={{
          padding: '14px 28px', borderTop: `1px solid ${t.creamFaint}`,
          background: 'rgba(26,8,2,0.55)', backdropFilter: 'blur(8px)',
          display: 'flex', gap: 10, alignItems: 'center', position: 'relative', zIndex: 1,
        }}>
          {isTranscribing || isRecording ? (
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,122,31,0.12)', border: `1px solid ${t.ember}`,
              padding: '10px 16px', borderRadius: 100,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                {[0, 0.1, 0.2, 0.3, 0.4].map((d, i) => (
                  <div key={i} style={{ width: 3, borderRadius: 2, background: t.ember, animation: `wave 1s ${d}s ease-in-out infinite`, height: [7, 14, 20, 14, 7][i] }}/>
                ))}
              </div>
              <div style={{ flex: 1, fontSize: 13, color: t.ember, fontFamily: t.serifFont }}>
                {isTranscribing ? 'Transcribing your order…' : 'Listening — speak your order…'}
              </div>
              {isRecording && <>
                <button onClick={cancelVoice} style={{
                  width: 34, height: 34, borderRadius: '50%', background: 'transparent',
                  border: `1px solid ${t.ember}`, color: t.ember, cursor: 'pointer',
                  fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>×</button>
                <button onClick={confirmVoice} style={{
                  width: 34, height: 34, borderRadius: '50%', background: t.gold,
                  border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1a0c04" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
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
                  flex: 1, background: 'rgba(245,240,230,0.06)', border: `1px solid ${t.creamFaint}`,
                  padding: '12px 22px', fontFamily: t.bodyFont, fontSize: 14, outline: 'none',
                  color: t.cream, borderRadius: 100, transition: 'border-color 0.15s, background 0.15s',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = t.gold; e.currentTarget.style.background = 'rgba(245,240,230,0.08)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = t.creamFaint; e.currentTarget.style.background = 'rgba(245,240,230,0.06)'; }}
              />
              <button onClick={startVoice} title="Speak your order" style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(245,240,230,0.06)', border: `1px solid ${t.creamFaint}`, color: t.cream,
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.gold; e.currentTarget.style.color = t.gold; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.creamFaint; e.currentTarget.style.color = t.cream; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="12" rx="3"/>
                  <path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
                </svg>
              </button>
              <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{
                background: (!loading && input.trim()) ? t.gold : 'rgba(245,240,230,0.08)',
                color: (!loading && input.trim()) ? '#1a0c04' : t.creamMuted,
                border: 'none', width: 44, height: 44, borderRadius: '50%',
                cursor: (!loading && input.trim()) ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: (!loading && input.trim()) ? '0 0 18px rgba(214,178,74,0.35)' : 'none',
                transition: 'all 0.15s',
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
          position: 'fixed', inset: 0, background: 'rgba(26,8,2,0.7)',
          zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: `linear-gradient(160deg, ${t.bgMid} 0%, ${t.bgDeep} 100%)`,
            border: `1px solid ${t.borderStrong}`,
            width: 360, padding: '32px 28px', borderRadius: 20,
            boxShadow: '0 24px 64px rgba(0,0,0,0.4), 0 0 40px rgba(255,122,31,0.15)',
            animation: 'fadeUp 0.25s ease', color: t.cream,
          }}>
            {checkoutStep === 'name' && <>
              <div style={{ fontFamily: t.monoFont, fontSize: 9, letterSpacing: '0.28em', color: t.gold, marginBottom: 10 }}>→ STEP 01 OF 02</div>
              <div style={{ fontFamily: t.displayFont, fontSize: 30, color: t.cream, marginBottom: 6, letterSpacing: '0.02em' }}>ALMOST THERE</div>
              <div style={{ fontFamily: t.serifFont, fontSize: 14, color: t.creamDim, marginBottom: 22, lineHeight: 1.5 }}>
                What name should we put on your order?
              </div>
              <input placeholder="Your full name" value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCartCheckout()} autoFocus
                style={{
                  width: '100%', background: 'rgba(245,240,230,0.06)', border: `1px solid ${t.creamFaint}`,
                  padding: '12px 18px', color: t.cream, borderRadius: 100,
                  fontFamily: t.bodyFont, fontSize: 14, outline: 'none', marginBottom: 12,
                }}
                onFocus={e => e.currentTarget.style.borderColor = t.gold}
                onBlur={e => e.currentTarget.style.borderColor = t.creamFaint}
              />
              <button onClick={handleCartCheckout} style={{
                width: '100%', padding: 13, background: t.gold, color: '#1a0c04', border: 'none',
                borderRadius: 100, fontFamily: t.monoFont, fontSize: 11, letterSpacing: '0.22em',
                fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 24px rgba(214,178,74,0.3)',
              }}>CONTINUE →</button>
            </>}
            {checkoutStep === 'phone' && <>
              <div style={{ fontFamily: t.monoFont, fontSize: 9, letterSpacing: '0.28em', color: t.gold, marginBottom: 10 }}>→ STEP 02 OF 02</div>
              <div style={{ fontFamily: t.displayFont, fontSize: 30, color: t.cream, marginBottom: 6, letterSpacing: '0.02em' }}>ONE LAST THING</div>
              <div style={{ fontFamily: t.serifFont, fontSize: 14, color: t.creamDim, marginBottom: 22, lineHeight: 1.5 }}>
                We'll reach you on this number once payment clears.
              </div>
              <input placeholder="08XXXXXXXXX" value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCartCheckout()} autoFocus
                style={{
                  width: '100%', background: 'rgba(245,240,230,0.06)', border: `1px solid ${t.creamFaint}`,
                  padding: '12px 18px', color: t.cream, borderRadius: 100,
                  fontFamily: t.bodyFont, fontSize: 14, outline: 'none', marginBottom: 12,
                }}
                onFocus={e => e.currentTarget.style.borderColor = t.gold}
                onBlur={e => e.currentTarget.style.borderColor = t.creamFaint}
              />
              <button onClick={handleCartCheckout} style={{
                width: '100%', padding: 13, background: t.gold, color: '#1a0c04', border: 'none',
                borderRadius: 100, fontFamily: t.monoFont, fontSize: 11, letterSpacing: '0.22em',
                fontWeight: 700, cursor: 'pointer', boxShadow: '0 0 24px rgba(214,178,74,0.3)',
              }}>PLACE ORDER →</button>
            </>}
          </div>
        </div>
      )}
    </>
  );
}
