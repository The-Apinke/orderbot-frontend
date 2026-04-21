'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

const QUICK_PROMPTS = [
  "What's on the menu?",
  "I'd like to order Beef Suya",
  "What's your best seller?",
  "I want to order for a group",
]

// Splash-derived palette — 3 colors, light arrangement
const BG  = '#f5f0e6';              // ivory — the splash's own text/button color, now the page bg
const CHR = '#1a0c04';              // deep dark brown — header bar (mirrors splash's dark backdrop)
const INK = '#1a0c04';              // all text
const ACC = '#d6b24a';              // gold — the splash's signature accent (PEPPER., button hover)
const SRF = '#ede7d8';              // slightly deeper ivory — assistant bubbles / surfaces
const BDR = 'rgba(26,12,4,0.12)';  // very subtle warm border

export default function ChatPage() {
  const [messages, setMessages]               = useState([]);
  const [input, setInput]                     = useState('');
  const [loading, setLoading]                 = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [menu, setMenu]                       = useState({});
  const [cart, setCart]                       = useState([]);
  const [checkoutStep, setCheckoutStep]       = useState(null);
  const [customerName, setCustomerName]       = useState('');
  const [customerPhone, setCustomerPhone]     = useState('');
  const [isRecording, setIsRecording]         = useState(false);
  const [isTranscribing, setIsTranscribing]   = useState(false);
  const messagesEndRef   = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef   = useRef([]);
  const router           = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

  useEffect(() => { fetchMenu(); fetchWelcome(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function fetchMenu() {
    try {
      const res  = await fetch(`${API}/menu`);
      const data = await res.json();
      setMenu(data.menu);
    } catch {}
  }

  async function fetchWelcome() {
    try {
      const res  = await fetch(`${API}/chat/welcome`);
      const data = await res.json();
      setMessages([{ role: 'assistant', content: data.message }]);
    } catch {}
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
              setMessages(prev => { const u = [...prev]; u[u.length-1] = { role: 'assistant', content: fullReply }; return u; });
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

  const allMenuItems = Object.values(menu).flat();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* Lock viewport — nothing should ever scroll at page level */
        html, body { height: 100%; overflow: hidden; background: ${BG}; }

        /* The entire chat UI is a fixed overlay filling the screen */
        .chat-layout {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          display: flex;
          flex-direction: column;
          background: ${BG};
          color: ${INK};
          font-family: 'DM Sans', sans-serif;
        }

        /* ── HEADER ── */
        .chat-hdr {
          flex-shrink: 0;
          padding: 13px 24px;
          background: ${CHR};
          display: flex; justify-content: space-between; align-items: center;
        }
        .hdr-brand { font-family: 'Bebas Neue', sans-serif; font-size: 22px; letter-spacing: 0.06em; color: #fff; }
        .hdr-sub   { font-family: 'Bebas Neue', sans-serif; font-size: 10px; letter-spacing: 0.22em; color: rgba(255,255,255,0.65); margin-top: 1px; }
        .hdr-back  {
          background: rgba(255,255,255,0.12); border: 1.5px solid rgba(255,255,255,0.3);
          color: #fff; width: 30px; height: 30px; cursor: pointer; font-size: 13px;
          display: flex; align-items: center; justify-content: center; margin-right: 12px;
          transition: background 0.15s;
        }
        .hdr-back:hover { background: rgba(255,255,255,0.22); }
        .hdr-right { display: flex; }
        .hdr-count {
          padding: 7px 14px;
          font-family: 'Bebas Neue', sans-serif; font-size: 13px; letter-spacing: 0.14em;
          border: 1.5px solid rgba(255,255,255,0.35); border-right: none;
          color: #fff; background: rgba(255,255,255,0.1);
        }
        .hdr-checkout {
          padding: 7px 16px;
          font-family: 'Bebas Neue', sans-serif; font-size: 13px; letter-spacing: 0.14em;
          border: 1.5px solid rgba(255,255,255,0.35);
          cursor: pointer; transition: background 0.15s, border-color 0.15s;
        }
        .hdr-checkout.active   { background: ${ACC}; color: ${INK}; border-color: ${ACC}; font-weight: 700; }
        .hdr-checkout.inactive { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.35); cursor: not-allowed; }

        /* ── MESSAGES — flex-grow fills remaining space, scrolls internally ── */
        .msgs-wrap {
          flex: 1 1 0;
          min-height: 0;
          overflow-y: auto;
          padding: 24px 32px 16px;
          display: flex;
          flex-direction: column;
          scrollbar-width: thin;
          scrollbar-color: ${BDR} transparent;
        }

        .msg-group   { display: flex; flex-direction: column; margin-bottom: 18px; }
        .msg-group.user      { align-items: flex-end; }
        .msg-group.assistant { align-items: flex-start; }

        .msg-label {
          font-family: 'Bebas Neue', sans-serif; font-size: 11px; letter-spacing: 0.2em; margin-bottom: 5px;
        }
        .msg-group.user .msg-label      { color: rgba(26,8,0,0.35); }
        .msg-group.assistant .msg-label { color: ${ACC}; }

        .bubble {
          max-width: min(420px, 70vw);
          padding: 12px 16px; font-size: 14px; line-height: 1.65;
          border: 2px solid ${BDR};
        }
        .bubble.user      { background: ${INK}; color: ${BG}; border-color: ${INK}; }
        .bubble.assistant { background: ${SRF}; color: ${INK}; font-family: 'Playfair Display', serif; }
        .bubble.assistant p { margin-bottom: 6px; }
        .bubble.assistant p:last-child { margin-bottom: 0; }
        .bubble.assistant ul, .bubble.assistant ol { padding-left: 18px; }
        .bubble.assistant li { margin-bottom: 3px; }

        .typing { display: flex; gap: 5px; align-items: center; padding: 4px 0; }
        .dot { width: 6px; height: 6px; background: ${ACC}; border-radius: 50%; animation: bounce 1.2s infinite; }
        .dot:nth-child(2) { animation-delay: 0.18s; }
        .dot:nth-child(3) { animation-delay: 0.36s; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:0.4} 40%{transform:translateY(-5px);opacity:1} }

        /* ── QUICK PROMPTS ── */
        .prompts-wrap { margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap; }
        .prompt-btn {
          background: ${SRF}; color: ${INK};
          border: 2px solid ${BDR}; padding: 8px 14px;
          font-family: 'Bebas Neue', sans-serif; font-size: 13px; letter-spacing: 0.1em;
          cursor: pointer; text-transform: uppercase; transition: all 0.15s;
        }
        .prompt-btn:hover { border-color: ${ACC}; background: ${BG}; color: ${ACC}; }

        /* ── MENU RAIL (gold — from splash) ── */
        .menu-rail {
          flex-shrink: 0;
          background: ${ACC};
          padding: 10px 20px 12px;
          border-top: 3px solid ${INK};
        }
        .rail-hdr   { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .rail-label { font-family: 'Bebas Neue', sans-serif; font-size: 11px; letter-spacing: 0.22em; color: rgba(26,12,4,0.6); }

        .cart-chips { display: flex; gap: 5px; max-width: 55%; overflow-x: auto; scrollbar-width: none; }
        .cart-chips::-webkit-scrollbar { display: none; }
        .cart-chip {
          flex-shrink: 0;
          padding: 2px 8px; background: ${INK}; color: ${BG};
          font-family: 'Bebas Neue', sans-serif; font-size: 11px; letter-spacing: 0.06em;
          display: flex; align-items: center; gap: 4px;
        }
        .chip-rm { background: none; border: none; color: ${BG}; cursor: pointer; font-size: 13px; padding: 0; line-height: 1; opacity: 0.55; }
        .chip-rm:hover { opacity: 1; }

        /* The scrollable row of menu cards */
        .rail-scroll-wrap {
          overflow-x: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(26,12,4,0.25) transparent;
          padding-bottom: 4px;
        }
        .rail-scroll-wrap::-webkit-scrollbar { height: 4px; }
        .rail-scroll-wrap::-webkit-scrollbar-thumb { background: rgba(26,12,4,0.25); border-radius: 4px; }
        .rail-scroll-inner {
          display: flex; gap: 8px;
          width: max-content;
        }

        .menu-card {
          width: 120px; height: 72px;
          background: rgba(26,12,4,0.08); border: 1.5px solid rgba(26,12,4,0.2);
          padding: 7px 10px; cursor: pointer; text-align: left;
          display: flex; flex-direction: column; justify-content: space-between;
          transition: background 0.12s, border-color 0.12s; flex-shrink: 0;
        }
        .menu-card:hover { background: rgba(26,12,4,0.15); border-color: rgba(26,12,4,0.4); }
        .card-num   { font-family: 'Bebas Neue', sans-serif; font-size: 9px; color: rgba(26,12,4,0.5); letter-spacing: 0.14em; }
        .card-name  { font-family: 'Playfair Display', serif; font-size: 12px; font-weight: 600; line-height: 1.2; color: ${INK}; }
        .card-price { font-family: 'Bebas Neue', sans-serif; font-size: 12px; color: rgba(26,12,4,0.75); }

        /* ── INPUT BAR ── */
        .input-area {
          flex-shrink: 0;
          background: ${SRF};
          border-top: 2px solid ${BDR};
          padding: 11px 22px;
          display: flex; gap: 0; align-items: stretch;
        }
        .chat-input {
          flex: 1; background: ${BG}; border: 2px solid ${BDR}; border-right: none;
          padding: 10px 15px; font-family: 'DM Sans', sans-serif; font-size: 14px;
          color: ${INK}; outline: none; resize: none;
          max-height: 76px; line-height: 1.5; transition: border-color 0.15s;
        }
        .chat-input:focus { border-color: ${ACC}; }
        .chat-input::placeholder { color: rgba(26,8,0,0.3); }

        .mic-btn {
          background: ${BG}; border: 2px solid ${BDR}; border-right: none;
          color: ${INK}; width: 42px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background 0.15s;
        }
        .mic-btn:hover { background: ${SRF}; }

        .send-btn {
          background: ${ACC}; color: #fff; border: 2px solid ${ACC};
          padding: 0 22px; font-family: 'Bebas Neue', sans-serif; font-size: 15px;
          letter-spacing: 0.14em; cursor: pointer; transition: background 0.15s;
          white-space: nowrap;
        }
        .send-btn:disabled { background: rgba(26,12,4,0.1); border-color: rgba(26,12,4,0.1); color: rgba(26,12,4,0.3); cursor: not-allowed; }
        .send-btn:not(:disabled):hover { background: #b8941e; border-color: #b8941e; }

        /* ── RECORDING ── */
        .recording-wrap {
          flex: 1; display: flex; align-items: center; gap: 10px;
          border: 2px solid #c0392b; background: #fff5f5; padding: 10px 14px;
        }
        .waveform { display: flex; align-items: center; gap: 3px; flex-shrink: 0; }
        .wave-bar { width: 3px; border-radius: 2px; background: #c0392b; animation: wave 1s ease-in-out infinite; }
        .wave-bar:nth-child(1){height:7px;animation-delay:0s}
        .wave-bar:nth-child(2){height:14px;animation-delay:.1s}
        .wave-bar:nth-child(3){height:20px;animation-delay:.2s}
        .wave-bar:nth-child(4){height:14px;animation-delay:.3s}
        .wave-bar:nth-child(5){height:7px;animation-delay:.4s}
        @keyframes wave{0%,100%{transform:scaleY(1);opacity:.5}50%{transform:scaleY(1.8);opacity:1}}
        .rec-label { flex: 1; font-size: 13px; color: #c0392b; font-style: italic; }
        .confirm-btn { width: 34px; height: 34px; border-radius: 50%; background: #27ae60; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .cancel-btn  { width: 34px; height: 34px; border-radius: 50%; background: transparent; border: 1.5px solid #c0392b; color: #c0392b; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; flex-shrink: 0; }
        .cancel-btn:hover { background: #c0392b; color: #fff; }

        /* ── MODAL ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(26,8,0,0.5);
          z-index: 60; display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(5px);
        }
        .modal {
          background: ${BG}; border: 2px solid ${INK};
          width: 340px; padding: 32px 28px;
          box-shadow: 6px 6px 0 ${INK};
          animation: fadeUp 0.25s ease;
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .modal-icon  { font-size: 22px; margin-bottom: 14px; }
        .modal-title { font-family: 'Bebas Neue', sans-serif; font-size: 28px; letter-spacing: 0.04em; color: ${INK}; margin-bottom: 4px; }
        .modal-sub   { font-size: 13px; color: rgba(26,8,0,0.5); margin-bottom: 20px; line-height: 1.5; }
        .modal-input {
          width: 100%; background: ${SRF}; border: 2px solid ${BDR};
          padding: 12px 14px; color: ${INK};
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          outline: none; margin-bottom: 10px; transition: border-color 0.15s;
        }
        .modal-input:focus { border-color: ${ACC}; }
        .modal-input::placeholder { color: rgba(26,8,0,0.3); }
        .modal-btn {
          width: 100%; padding: 12px; background: ${ACC}; color: #fff;
          border: none; font-family: 'Bebas Neue', sans-serif; font-size: 15px;
          letter-spacing: 0.14em; cursor: pointer; transition: background 0.15s;
        }
        .modal-btn:hover { background: #b8941e; }

        @media (max-width: 600px) {
          .msgs-wrap  { padding: 14px 14px 10px; }
          .input-area { padding: 8px 12px; }
          .bubble     { max-width: 84vw; }
          .chat-hdr   { padding: 11px 14px; }
          .menu-rail  { padding: 8px 14px 10px; }
        }
      `}</style>

      <div className="chat-layout">

        {/* HEADER */}
        <div className="chat-hdr">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="hdr-back" onClick={() => router.push('/')}>←</button>
            <div>
              <div className="hdr-brand">UNCLE SOJI'S</div>
              <div className="hdr-sub">● CHAT · SOJI IS LIVE</div>
            </div>
          </div>
          <div className="hdr-right">
            <div className="hdr-count">{cartCount} {cartCount === 1 ? 'ITEM' : 'ITEMS'}</div>
            <button
              className={`hdr-checkout ${cartCount > 0 ? 'active' : 'inactive'}`}
              onClick={handleCartCheckout} disabled={cartCount === 0}
            >
              CHECKOUT · ₦{cartTotal.toLocaleString()}
            </button>
          </div>
        </div>

        {/* MESSAGES */}
        <div className="msgs-wrap">
          {(() => {
            const groups = [];
            messages.forEach((msg, i) => {
              const prev = messages[i - 1];
              if (prev && prev.role === msg.role) groups[groups.length - 1].push(msg);
              else groups.push([msg]);
            });
            return groups.map((group, gi) => {
              const isLast = gi === groups.length - 1;
              return (
                <div key={gi} className={`msg-group ${group[0].role}`}>
                  <div className="msg-label">{group[0].role === 'user' ? '→ YOU' : '→ SOJI'}</div>
                  {group.map((msg, ri) => {
                    const isLastMsg = ri === group.length - 1;
                    const isTyping  = msg.role === 'assistant' && loading && isLast && isLastMsg && msg.content === '';
                    return (
                      <div key={ri} style={{ marginBottom: ri < group.length - 1 ? 4 : 0 }}>
                        <div className={`bubble ${msg.role}`}>
                          {isTyping ? (
                            <div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div>
                          ) : msg.role === 'assistant' ? (
                            <ReactMarkdown>{msg.content.split('[ORDER_CONFIRMED]')[0].trim()}</ReactMarkdown>
                          ) : msg.content}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()}

          {messages.length <= 1 && !loading && (
            <div className="prompts-wrap">
              {QUICK_PROMPTS.map((p, i) => (
                <button key={i} className="prompt-btn" onClick={() => sendMessage(p)}>{p} →</button>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* MENU RAIL */}
        <div className="menu-rail">
          <div className="rail-hdr">
            <div className="rail-label">→ THE MENU · TAP TO ADD</div>
            {cartCount > 0 && (
              <div className="cart-chips">
                {cart.map(i => (
                  <span key={i.name} className="cart-chip">
                    {i.name.split(' ')[0].toUpperCase()}×{i.quantity}
                    <button className="chip-rm" onClick={() => removeFromCart(i.name)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="rail-scroll-wrap">
            <div className="rail-scroll-inner">
              {allMenuItems.map((item, idx) => (
                <button key={item.id} className="menu-card" onClick={() => addToCart(item)}>
                  <div className="card-num">→ {String(idx + 1).padStart(2, '0')}</div>
                  <div className="card-name">{item.name}</div>
                  <div className="card-price">₦{item.price.toLocaleString()}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* INPUT */}
        <div className="input-area">
          {isTranscribing ? (
            <div className="recording-wrap">
              <div className="waveform"><div className="wave-bar"/><div className="wave-bar"/><div className="wave-bar"/><div className="wave-bar"/><div className="wave-bar"/></div>
              <div className="rec-label">Transcribing your order…</div>
            </div>
          ) : isRecording ? (
            <div className="recording-wrap">
              <div className="waveform"><div className="wave-bar"/><div className="wave-bar"/><div className="wave-bar"/><div className="wave-bar"/><div className="wave-bar"/></div>
              <div className="rec-label">Listening — speak your order…</div>
              <button className="cancel-btn" onClick={cancelVoice}>×</button>
              <button className="confirm-btn" onClick={confirmVoice}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </button>
            </div>
          ) : (
            <>
              <textarea
                className="chat-input"
                placeholder="Type your order or ask a question…"
                value={input} rows={1}
                suppressHydrationWarning
                onChange={e => {
                  setInput(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 76) + 'px';
                }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              />
              <button className="mic-btn" onClick={startVoice} title="Speak your order">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="2" width="6" height="12" rx="3"/>
                  <path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
                </svg>
              </button>
              <button className="send-btn" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>SEND →</button>
            </>
          )}
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {checkoutStep && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setCheckoutStep(null); }}>
          <div className="modal">
            {checkoutStep === 'name' && <>
              <div className="modal-icon">👤</div>
              <div className="modal-title">ALMOST THERE</div>
              <div className="modal-sub">What name should we put on your order?</div>
              <input className="modal-input" placeholder="Your full name" value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCartCheckout()} autoFocus />
              <button className="modal-btn" onClick={handleCartCheckout}>CONTINUE →</button>
            </>}
            {checkoutStep === 'phone' && <>
              <div className="modal-icon">📱</div>
              <div className="modal-title">ONE LAST THING</div>
              <div className="modal-sub">We'll reach you on this number once payment clears.</div>
              <input className="modal-input" placeholder="08XXXXXXXXX" value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCartCheckout()} autoFocus />
              <button className="modal-btn" onClick={handleCartCheckout}>PLACE ORDER →</button>
            </>}
          </div>
        </div>
      )}
    </>
  );
}
