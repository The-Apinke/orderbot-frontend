'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [menu, setMenu] = useState({});
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const messagesEndRef = useRef(null);
  const router = useRouter();

  const API = 'https://orderbot-backend-production-d13d.up.railway.app';

  useEffect(() => { fetchMenu(); fetchWelcome(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function fetchMenu() {
    const res = await fetch(`${API}/menu`);
    const data = await res.json();
    setMenu(data.menu);
  }

  async function fetchWelcome() {
    const res = await fetch(`${API}/chat/welcome`);
    const data = await res.json();
    setMessages([{ role: 'assistant', content: data.message }]);
  }

  function addToCart(item) {
    setCart(prev => {
      const existing = prev.find(i => i.name === item.name);
      if (existing) return prev.map(i => i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  }

  function removeFromCart(name) { setCart(prev => prev.filter(i => i.name !== name)); }

  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

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
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = '';
      let updatedHistory = [];
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
    if (!checkoutStep) { setCheckoutStep('name'); setCartOpen(false); return; }
    if (checkoutStep === 'name') { if (!customerName.trim()) return; setCheckoutStep('phone'); return; }
    if (checkoutStep === 'phone') {
      if (!customerPhone.trim()) return;
      await fetch(`${API}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer_name: customerName, customer_phone: customerPhone, items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })), total_price: cartTotal, notes: '' })
      });
      router.push(`/confirmation?name=${encodeURIComponent(customerName)}&phone=${encodeURIComponent(customerPhone)}&total=${cartTotal}`);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@300;400;500&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --brown:       #623920;
          --brown-hover: #4e2d18;
          --brown-light: #8a5535;
          --gold:        #d6b24a;
          --gold-pale:   #f9f0d4;
          --cream:       #f2f0e9;
          --cream-dark:  #e8e4d8;
          --green:       #829460;
          --green-hover: #6b7b4e;
          --white:       #ffffff;
          --text:        #2a1a08;
          --text-mid:    #6b4c2a;
          --text-soft:   #a08860;
          --border:      #ddd5c0;
          --border-soft: #ece8de;
        }

        body { background: var(--cream); font-family: 'DM Sans', sans-serif; color: var(--text); }

        .layout { display: flex; height: 100vh; overflow: hidden; }

        /* ── LEFT PANEL ── */
        .menu-panel {
          width: 280px; min-width: 280px;
          display: flex; flex-direction: column;
          border-right: 1px solid var(--border);
          overflow: hidden;
        }

        .menu-header {
          background: var(--brown);
          padding: 24px 20px 20px;
          flex-shrink: 0;
        }

        .gold-line { width: 24px; height: 2px; background: var(--gold); border-radius: 2px; margin-bottom: 12px; }

        .restaurant-name {
          font-family: 'Playfair Display', serif;
          font-size: 16px; font-weight: 700; color: #fff; line-height: 1.3;
        }

        .restaurant-sub {
          font-size: 10px; color: rgba(255,255,255,0.45);
          letter-spacing: 0.18em; text-transform: uppercase; margin-top: 6px;
        }

        .menu-scroll {
          flex: 1; overflow-y: auto;
          background: var(--white);
          scrollbar-width: thin; scrollbar-color: var(--border-soft) transparent;
        }

        .category-label {
          font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--text-soft); padding: 16px 20px 6px; font-weight: 500;
          background: var(--white);
        }

        .menu-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 20px; cursor: default;
          border-left: 3px solid transparent;
          transition: all 0.15s;
        }

        .menu-item:hover { background: var(--cream); border-left-color: var(--gold); }

        .item-info { flex: 1; min-width: 0; }

        .item-name {
          font-size: 13px; font-weight: 500; color: var(--text);
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .item-price { font-size: 11px; color: var(--gold); margin-top: 2px; font-weight: 600; }

        .add-btn {
          width: 26px; height: 26px; border-radius: 50%;
          border: 1.5px solid var(--cream-dark); background: var(--white);
          color: var(--brown); font-size: 17px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; flex-shrink: 0; margin-left: 10px; line-height: 1;
        }

        .add-btn:hover { background: var(--brown); color: #fff; border-color: var(--brown); }

        /* ── RIGHT PANEL ── */
        .chat-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--cream); }

        /* ↓ CHANGED: green background, brown bottom border */
        .chat-header {
          background: var(--green);
          border-bottom: 3px solid var(--brown);
          padding: 14px 24px;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }

        .header-left { display: flex; align-items: center; gap: 10px; }

        /* ↓ CHANGED: white pill on green bg */
        .online-pill {
          display: flex; align-items: center; gap: 5px;
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
          border-radius: 20px; padding: 3px 9px;
        }

        .online-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--gold);
          animation: pulse 2s infinite;
        }

        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }

        /* ↓ CHANGED: white text on green bg */
        .online-text { font-size: 10px; color: #fff; font-weight: 500; letter-spacing: 0.04em; }

        .header-titles { margin-left: 4px; }

        /* ↓ CHANGED: white title on green bg */
        .chat-title {
          font-family: 'Playfair Display', serif;
          font-size: 15px; font-weight: 600; color: #fff;
        }

        /* ↓ CHANGED: semi-transparent white subtitle */
        .chat-subtitle { font-size: 11px; color: rgba(255,255,255,0.65); margin-top: 1px; }

        /* Cart button: brown pill — pops on green */
        .cart-btn {
          display: flex; align-items: center; gap: 7px;
          background: var(--brown); color: #fff;
          border: none; border-radius: 20px; padding: 8px 18px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
          cursor: pointer; transition: background 0.2s;
        }

        .cart-btn:hover { background: var(--brown-hover); }

        .cart-badge {
          background: var(--gold); color: var(--brown);
          border-radius: 50%; width: 18px; height: 18px; font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }

        /* ── MESSAGES ── */
        .messages {
          flex: 1; overflow-y: auto; padding: 28px 32px;
          display: flex; flex-direction: column; gap: 16px;
          scrollbar-width: thin; scrollbar-color: var(--border) transparent;
        }

        .message { max-width: 64%; animation: fadeUp 0.3s ease; }

        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .message.user { align-self: flex-end; }
        .message.assistant { align-self: flex-start; }

        .bubble { padding: 13px 17px; border-radius: 18px; font-size: 14px; line-height: 1.7; }

        .message.user .bubble {
          background: var(--brown);
          color: #fff;
          border-bottom-right-radius: 4px;
          box-shadow: 0 2px 10px rgba(98,57,32,0.2);
        }

        /* ↓ CHANGED: pale green tint instead of white */
        .message.assistant .bubble {
          background: #e8eddf;
          color: var(--text);
          border: 1px solid #c8d4b4;
          border-bottom-left-radius: 4px;
          box-shadow: 0 2px 8px rgba(98,57,32,0.06);
        }

        .message.assistant .bubble p { margin-bottom: 8px; }
        .message.assistant .bubble p:last-child { margin-bottom: 0; }
        .message.assistant .bubble ul, .message.assistant .bubble ol { padding-left: 18px; }
        .message.assistant .bubble li { margin-bottom: 4px; }

        .msg-label {
          font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase;
          margin-bottom: 5px; font-weight: 500;
        }

        .message.user .msg-label { text-align: right; color: var(--text-soft); }
        .message.assistant .msg-label { color: var(--green); }

        .typing { display: flex; gap: 5px; align-items: center; padding: 2px 0; }
        .dot { width: 7px; height: 7px; background: var(--gold); border-radius: 50%; animation: bounce 1.3s infinite; opacity: 0.5; }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,80%,100% { transform: translateY(0); opacity:0.4; } 40% { transform: translateY(-6px); opacity:1; } }

        /* ── INPUT BAR ── */
        .input-area {
          flex-shrink: 0;
          background: var(--white);
          border-top: 1px solid var(--border);
          padding: 14px 24px;
        }

        .input-row {
          display: flex; align-items: flex-end; gap: 10px;
          background: var(--cream);
          border: 1.5px solid var(--border);
          border-radius: 26px;
          padding: 10px 10px 10px 20px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .input-row:focus-within {
          border-color: var(--brown);
          box-shadow: 0 0 0 3px rgba(98,57,32,0.08);
        }

        .chat-input {
          flex: 1; background: transparent; border: none; outline: none;
          color: var(--text); font-family: 'DM Sans', sans-serif;
          font-size: 14px; resize: none; max-height: 100px; line-height: 1.5; padding: 2px 0;
        }

        .chat-input::placeholder { color: var(--text-soft); }

        .send-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: var(--brown); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; flex-shrink: 0;
          box-shadow: 0 2px 8px rgba(98,57,32,0.3);
        }

        .send-btn:hover { background: var(--brown-hover); transform: scale(1.06); }
        .send-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }

        /* ── CART DRAWER ── */
        .overlay { position: fixed; inset: 0; background: rgba(42,26,8,0.35); z-index: 40; backdrop-filter: blur(4px); }

        .cart-drawer {
          position: fixed; right: 0; top: 0; bottom: 0; width: 340px;
          background: var(--white); border-left: 1px solid var(--border);
          z-index: 50; display: flex; flex-direction: column;
          animation: slideIn 0.22s ease;
          box-shadow: -16px 0 48px rgba(98,57,32,0.1);
        }

        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .drawer-header {
          background: var(--brown); padding: 20px 22px;
          display: flex; justify-content: space-between; align-items: center;
          flex-shrink: 0;
        }

        .drawer-title { font-family: 'Playfair Display', serif; font-size: 18px; color: #fff; }

        .close-btn { background: none; border: none; color: rgba(255,255,255,0.55); font-size: 24px; cursor: pointer; transition: color 0.15s; line-height: 1; padding: 0; }
        .close-btn:hover { color: #fff; }

        .cart-items { flex: 1; overflow-y: auto; padding: 16px 22px; }

        .cart-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 0; border-bottom: 1px solid var(--border-soft);
        }

        .cart-item-name { font-size: 14px; color: var(--text); font-weight: 500; }
        .cart-item-price { font-size: 12px; color: var(--gold); margin-top: 2px; font-weight: 600; }

        .remove-btn { background: none; border: none; color: var(--text-soft); cursor: pointer; font-size: 20px; transition: color 0.15s; line-height: 1; }
        .remove-btn:hover { color: var(--brown); }

        .cart-footer {
          padding: 18px 22px; border-top: 1px solid var(--border); flex-shrink: 0;
          background: var(--cream);
        }

        .cart-total { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 14px; }
        .total-label { font-size: 12px; color: var(--text-soft); text-transform: uppercase; letter-spacing: 0.08em; }
        .total-amount { font-family: 'Playfair Display', serif; color: var(--gold); font-size: 24px; font-weight: 700; }

        .checkout-btn {
          width: 100%; padding: 13px;
          background: var(--green); color: #fff; border: none; border-radius: 12px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 0 3px 12px rgba(130,148,96,0.3);
          letter-spacing: 0.02em;
        }

        .checkout-btn:hover { background: var(--green-hover); transform: translateY(-1px); }

        .empty-cart { text-align: center; padding: 48px 0; }
        .empty-icon { font-size: 36px; display: block; margin-bottom: 10px; }
        .empty-text { color: var(--text-soft); font-size: 13px; }

        /* ── MODAL ── */
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(42,26,8,0.45);
          z-index: 60; display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(6px);
        }

        .modal {
          background: var(--white); border-radius: 22px; padding: 36px; width: 380px;
          animation: fadeUp 0.28s ease;
          box-shadow: 0 28px 70px rgba(98,57,32,0.18);
          border: 1px solid var(--border);
          overflow: hidden;
          position: relative;
        }

        .modal::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, var(--brown) 40%, var(--gold) 70%, var(--green) 100%);
        }

        .modal-icon {
          width: 48px; height: 48px; background: var(--cream); border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; margin-bottom: 18px;
          border: 1px solid var(--border-soft);
        }

        .modal-title { font-family: 'Playfair Display', serif; font-size: 22px; color: var(--text); margin-bottom: 6px; }
        .modal-sub { font-size: 13px; color: var(--text-soft); margin-bottom: 22px; line-height: 1.5; }

        .modal-input {
          width: 100%; background: var(--cream);
          border: 1.5px solid var(--border); border-radius: 10px;
          padding: 13px 16px; color: var(--text);
          font-family: 'DM Sans', sans-serif; font-size: 14px;
          outline: none; transition: all 0.2s; margin-bottom: 10px;
        }

        .modal-input:focus { border-color: var(--brown); box-shadow: 0 0 0 3px rgba(98,57,32,0.08); }
        .modal-input::placeholder { color: var(--text-soft); }

        .modal-btn {
          width: 100%; padding: 13px;
          background: var(--brown); color: #fff; border: none; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          cursor: pointer; margin-top: 8px; transition: all 0.2s;
          box-shadow: 0 4px 14px rgba(98,57,32,0.22);
          letter-spacing: 0.02em;
        }

        .modal-btn:hover { background: var(--brown-hover); transform: translateY(-1px); }
      `}</style>

      <div className="layout">
        {/* ── LEFT: MENU ── */}
        <div className="menu-panel">
          <div className="menu-header">
            <div className="gold-line" />
            <div className="restaurant-name">Uncle Soji's Suya Spot</div>
            <div className="restaurant-sub">Lagos · Est. 2010</div>
          </div>

          <div className="menu-scroll">
            {Object.entries(menu).map(([category, items]) => (
              <div key={category}>
                <div className="category-label">{category}</div>
                {items.map(item => (
                  <div key={item.id} className="menu-item">
                    <div className="item-info">
                      <div className="item-name">{item.name}</div>
                      <div className="item-price">₦{item.price.toLocaleString()}</div>
                    </div>
                    <button className="add-btn" onClick={() => addToCart(item)}>+</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: CHAT ── */}
        <div className="chat-panel">
          <div className="chat-header">
            <div className="header-left">
              <div className="online-pill">
                <div className="online-dot" />
                <span className="online-text">Online</span>
              </div>
              <div className="header-titles">
                <div className="chat-title">Soji Assistant</div>
                <div className="chat-subtitle">Ask me anything or just order</div>
              </div>
            </div>
            <button className="cart-btn" onClick={() => setCartOpen(true)}>
              🛒 Cart
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </div>

          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                <div className="msg-label">{msg.role === 'user' ? 'You' : 'Soji'}</div>
                {msg.role === 'assistant' && loading && i === messages.length - 1 && msg.content === '' ? (
                  <div className="bubble">
                    <div className="typing"><div className="dot"/><div className="dot"/><div className="dot"/></div>
                  </div>
                ) : (
                  <div className="bubble">
                    {msg.role === 'assistant'
                      ? <ReactMarkdown>{msg.content.replace(/\[ORDER_CONFIRMED\][\s\S]*?\[\/ORDER_CONFIRMED\]/, '')}</ReactMarkdown>
                      : msg.content}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <div className="input-row">
              <textarea
                className="chat-input"
                placeholder="Type your order or ask a question…"
                value={input}
                rows={1}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              />
              <button className="send-btn" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CART DRAWER ── */}
      {cartOpen && (
        <>
          <div className="overlay" onClick={() => setCartOpen(false)} />
          <div className="cart-drawer">
            <div className="drawer-header">
              <div className="drawer-title">Your Order</div>
              <button className="close-btn" onClick={() => setCartOpen(false)}>×</button>
            </div>
            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <span className="empty-icon">🔥</span>
                  <div className="empty-text">Nothing added yet</div>
                </div>
              ) : cart.map(item => (
                <div key={item.name} className="cart-item">
                  <div>
                    <div className="cart-item-name">{item.name} × {item.quantity}</div>
                    <div className="cart-item-price">₦{(item.price * item.quantity).toLocaleString()}</div>
                  </div>
                  <button className="remove-btn" onClick={() => removeFromCart(item.name)}>×</button>
                </div>
              ))}
            </div>
            {cart.length > 0 && (
              <div className="cart-footer">
                <div className="cart-total">
                  <span className="total-label">Total</span>
                  <span className="total-amount">₦{cartTotal.toLocaleString()}</span>
                </div>
                <button className="checkout-btn" onClick={handleCartCheckout}>Proceed to Checkout →</button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── CHECKOUT MODAL ── */}
      {checkoutStep && (
        <div className="modal-overlay">
          <div className="modal">
            {checkoutStep === 'name' && (
              <>
                <div className="modal-icon">👤</div>
                <div className="modal-title">Almost there</div>
                <div className="modal-sub">What name should we put on your order?</div>
                <input className="modal-input" placeholder="Your full name" value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCartCheckout()} autoFocus />
                <button className="modal-btn" onClick={handleCartCheckout}>Continue →</button>
              </>
            )}
            {checkoutStep === 'phone' && (
              <>
                <div className="modal-icon">📱</div>
                <div className="modal-title">One last thing</div>
                <div className="modal-sub">We'll send you updates on this number.</div>
                <input className="modal-input" placeholder="08XXXXXXXXX" value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCartCheckout()} autoFocus />
                <button className="modal-btn" onClick={handleCartCheckout}>Place Order →</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}