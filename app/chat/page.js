'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useRouter } from 'next/navigation';

const QUICK_PROMPTS = [
  { label: "What's on the menu?",    send: "What's on the menu?",                                          sub: 'See everything we serve',       accent: '#829460' },
  { label: "Order Beef Suya",         send: "I'd like to order Beef Suya",                                  sub: 'Our most popular cut',          accent: '#623920' },
  { label: "What's the best seller?", send: "What's your best seller?",                                     sub: 'Let Soji recommend',            accent: '#d6b24a' },
  { label: "Order for a group",       send: "I want to place an order for a group of people, help me out",  sub: 'Feeding more than one person',  accent: '#4e7a60' },
]

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
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const router = useRouter();

  async function startVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert('Microphone access denied. Please allow microphone access and try again.');
    }
  }

  async function confirmVoice() {
    const mediaRecorder = mediaRecorderRef.current;
    if (!mediaRecorder) return;
    mediaRecorder.onstop = async () => {
      setIsRecording(false);
      setIsTranscribing(true);
      try {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        const res = await fetch(`${API}/chat/transcribe`, { method: 'POST', body: formData });
        const data = await res.json();
        setInput(data.transcript || '');
      } catch {
        alert('Transcription failed. Please try again.');
      } finally {
        setIsTranscribing(false);
        mediaRecorder.stream.getTracks().forEach(t => t.stop());
      }
    };
    mediaRecorder.stop();
  }

  function cancelVoice() {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder) {
      mediaRecorder.onstop = () => mediaRecorder.stream.getTracks().forEach(t => t.stop());
      mediaRecorder.stop();
    }
    setIsRecording(false);
  }

  const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

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

        .layout { display: flex; height: 100vh; overflow: hidden; background: radial-gradient(ellipse 120% 80% at 60% 0%, #ede8dc 0%, var(--cream) 70%); }

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
        .chat-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; background: var(--cream); min-width: 0; }
        .messages-wrap { flex: 1; overflow-y: auto; display: flex; flex-direction: column; scrollbar-width: thin; scrollbar-color: var(--border) transparent; }

        .chat-header {
          background: linear-gradient(135deg, #8fa668 0%, #829460 55%, #6b7b4e 100%);
          border-bottom: 3px solid var(--brown);
          padding: 14px 24px;
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
          box-shadow: 0 6px 24px rgba(98,57,32,0.22), inset 0 1px 0 rgba(255,255,255,0.18);
        }

        .header-left { display: flex; align-items: center; gap: 10px; }

        .circle-emblem {
          width: 34px; height: 34px; border-radius: 50%;
          background: rgba(0,0,0,0.2);
          border: 1.5px solid rgba(255,255,255,0.35);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .emblem-text {
          font-family: 'Playfair Display', serif;
          font-size: 11px; font-weight: 700; color: #fff;
        }

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

        .online-text { font-size: 10px; color: #fff; font-weight: 500; letter-spacing: 0.04em; }

        .header-titles { margin-left: 4px; }

        .chat-title {
          font-family: 'Playfair Display', serif;
          font-size: 15px; font-weight: 600; color: #fff;
        }

        .chat-subtitle { font-size: 11px; color: rgba(255,255,255,0.65); margin-top: 1px; }

        .cart-btn {
          display: flex; align-items: center; gap: 7px;
          background: linear-gradient(135deg, #6e4028 0%, #623920 100%);
          color: #fff;
          border: none; border-radius: 20px; padding: 8px 18px;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 3px 3px 10px rgba(98,57,32,0.35), -1px -1px 3px rgba(255,255,255,0.1);
        }

        .cart-btn:hover { background: linear-gradient(135deg, #7a4830, #4e2d18); transform: translateY(-1px); box-shadow: 4px 5px 14px rgba(98,57,32,0.4); }

        .cart-badge {
          background: var(--gold); color: var(--brown);
          border-radius: 50%; width: 18px; height: 18px; font-size: 10px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
        }

        /* ── MESSAGES ── */
        .messages-wrap {
          flex: 1; overflow-y: auto; position: relative;
          scrollbar-width: thin; scrollbar-color: var(--border) transparent;
        }

        /* Top fade — cream fades in over messages as you scroll */
        .messages-fade {
          position: sticky; top: 0; left: 0; right: 0; height: 56px; z-index: 2;
          background: linear-gradient(to bottom, var(--cream) 0%, transparent 100%);
          pointer-events: none; margin-bottom: -56px;
        }

        .messages {
          padding: 12px 32px 28px;
          display: flex; flex-direction: column;
          min-height: 100%;
        }

        /* Each row: avatar + bubble side by side */
        .msg-row {
          display: flex; align-items: flex-end; gap: 8px;
          animation: msgPop 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }

        @keyframes msgPop {
          from { opacity: 0; transform: scale(0.88) translateY(6px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }

        .msg-row.user { flex-direction: row-reverse; }

        /* Spacing between message groups */
        .msg-group { display: flex; flex-direction: column; }
        .msg-group.user { align-items: flex-end; }
        .msg-group.assistant { align-items: flex-start; }
        .msg-group + .msg-group { margin-top: 20px; }
        .msg-row + .msg-row { margin-top: 4px; }

        /* Soji avatar */
        .soji-avatar {
          width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, #6e4028 0%, #623920 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 3px 3px 8px rgba(98,57,32,0.3), -1px -1px 3px rgba(255,255,255,0.2);
        }
        .avatar-spacer { width: 30px; flex-shrink: 0; }

        .msg-name {
          font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
          font-weight: 600; margin-bottom: 4px; padding-left: 2px;
        }
        .msg-group.user .msg-name { text-align: right; color: var(--text-soft); padding-left: 0; padding-right: 2px; }
        .msg-group.assistant .msg-name { color: var(--green); }

        .message { max-width: min(340px, 62vw); }
        .bubble { padding: 11px 15px; font-size: 14px; line-height: 1.7; border-radius: 18px; }

        /* First bubble in group: flat on avatar side */
        .msg-group.assistant .msg-row:first-child .bubble { border-bottom-left-radius: 4px; }
        .msg-group.user .msg-row:first-child .bubble      { border-bottom-right-radius: 4px; }

        /* Middle bubbles: flat on both avatar-side corners */
        .msg-group.assistant .msg-row:not(:first-child):not(:last-child) .bubble {
          border-top-left-radius: 4px; border-bottom-left-radius: 4px;
        }
        .msg-group.user .msg-row:not(:first-child):not(:last-child) .bubble {
          border-top-right-radius: 4px; border-bottom-right-radius: 4px;
        }

        /* Last bubble in multi-message group: flat top on avatar side */
        .msg-group.assistant .msg-row:last-child:not(:first-child) .bubble { border-top-left-radius: 4px; }
        .msg-group.user .msg-row:last-child:not(:first-child) .bubble      { border-top-right-radius: 4px; }

        .message.user .bubble {
          background: linear-gradient(135deg, #6e4028 0%, #623920 100%);
          color: #fff;
          box-shadow: 5px 5px 16px rgba(98,57,32,0.35), -1px -1px 4px rgba(255,255,255,0.08);
        }

        .message.assistant .bubble {
          background: linear-gradient(145deg, #eef3e6 0%, #e8eddf 100%);
          color: var(--text);
          border: 1px solid #c8d4b4;
          box-shadow: 4px 4px 14px rgba(98,57,32,0.1), -2px -2px 8px rgba(255,255,255,0.85);
        }

        .message.assistant .bubble p { margin-bottom: 8px; }
        .message.assistant .bubble p:last-child { margin-bottom: 0; }
        .message.assistant .bubble ul, .message.assistant .bubble ol { padding-left: 18px; }
        .message.assistant .bubble li { margin-bottom: 4px; }

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
          border: 1px solid var(--border);
          border-radius: 26px;
          padding: 10px 10px 10px 20px;
          transition: box-shadow 0.2s;
          box-shadow: inset 3px 3px 8px rgba(98,57,32,0.1), inset -2px -2px 6px rgba(255,255,255,0.9);
        }

        .input-row:focus-within {
          box-shadow: inset 3px 3px 8px rgba(98,57,32,0.12), inset -2px -2px 6px rgba(255,255,255,0.9), 0 0 0 2px rgba(98,57,32,0.1);
        }

        .chat-input {
          flex: 1; background: transparent; border: none; outline: none;
          color: var(--text); font-family: 'DM Sans', sans-serif;
          font-size: 14px; resize: none; max-height: 200px; line-height: 1.6; padding: 2px 0;
        }

        .chat-input::placeholder { color: var(--text-soft); }

        .send-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: linear-gradient(135deg, #6e4028 0%, #623920 100%);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; flex-shrink: 0;
          box-shadow: 4px 4px 10px rgba(98,57,32,0.4), -1px -1px 4px rgba(255,255,255,0.15);
        }

        .send-btn:hover { background: linear-gradient(135deg, #7a4830, #4e2d18); transform: scale(1.07) translateY(-1px); box-shadow: 6px 6px 14px rgba(98,57,32,0.45); }
        .send-btn:active { transform: scale(0.96); box-shadow: 2px 2px 6px rgba(98,57,32,0.3); }
        .send-btn:disabled { opacity: 0.35; cursor: not-allowed; transform: none; box-shadow: none; }

        .mic-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: transparent; border: 1.5px solid var(--border);
          color: var(--text-mid); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s; flex-shrink: 0;
        }
        .mic-btn:hover { background: var(--cream-dark); border-color: var(--brown); color: var(--brown); }

        .recording-row {
          display: flex; align-items: center; gap: 10px;
          background: #fff5f5;
          border: 1.5px solid #c0392b;
          border-radius: 26px;
          padding: 10px 14px;
        }

        .waveform { display: flex; align-items: center; gap: 3px; flex-shrink: 0; }

        .wave-bar {
          width: 3px; border-radius: 3px; background: #c0392b;
          animation: wave 1s ease-in-out infinite;
        }
        .wave-bar:nth-child(1) { height: 8px;  animation-delay: 0s; }
        .wave-bar:nth-child(2) { height: 16px; animation-delay: 0.1s; }
        .wave-bar:nth-child(3) { height: 22px; animation-delay: 0.2s; }
        .wave-bar:nth-child(4) { height: 16px; animation-delay: 0.3s; }
        .wave-bar:nth-child(5) { height: 8px;  animation-delay: 0.4s; }

        @keyframes wave {
          0%,100% { transform: scaleY(1); opacity: 0.6; }
          50% { transform: scaleY(1.8); opacity: 1; }
        }

        .live-transcript {
          flex: 1; font-size: 14px; color: #c0392b;
          font-style: italic; line-height: 1.4; min-height: 20px;
        }
        .live-transcript.empty { color: #e08080; }

        .confirm-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: #27ae60; border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.2s;
          box-shadow: 0 2px 8px rgba(39,174,96,0.3);
        }
        .confirm-btn:hover { background: #219a52; transform: scale(1.06); }

        .cancel-voice-btn {
          width: 36px; height: 36px; border-radius: 50%;
          background: transparent; border: 1.5px solid #c0392b;
          color: #c0392b; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: all 0.2s; font-size: 18px; line-height: 1;
        }
        .cancel-voice-btn:hover { background: #c0392b; color: #fff; }

        /* ── CART DRAWER ── */
        .overlay { position: fixed; inset: 0; background: rgba(42,26,8,0.35); z-index: 40; backdrop-filter: blur(4px); }

        .cart-drawer {
          position: fixed; right: 0; top: 0; bottom: 0; width: 340px;
          background: var(--white); border-left: 1px solid var(--border);
          z-index: 50; display: flex; flex-direction: column;
          animation: slideIn 0.22s ease;
          box-shadow: -12px 0 40px rgba(98,57,32,0.18), -2px 0 8px rgba(98,57,32,0.08);
        }

        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

        .drawer-header {
          background: linear-gradient(135deg, #6e4028 0%, #623920 55%, #4e2d18 100%);
          padding: 20px 22px;
          display: flex; justify-content: space-between; align-items: center;
          flex-shrink: 0;
          box-shadow: 0 4px 16px rgba(98,57,32,0.2), inset 0 1px 0 rgba(255,255,255,0.12);
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
          background: linear-gradient(135deg, #8fa668 0%, #829460 60%, #6b7b4e 100%);
          color: #fff; border: none; border-radius: 12px;
          font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
          box-shadow: 4px 4px 14px rgba(107,123,78,0.45), -1px -1px 4px rgba(255,255,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15);
          letter-spacing: 0.02em;
        }

        .checkout-btn:hover { background: linear-gradient(135deg, #8fa668, #6b7b4e); transform: translateY(-2px); box-shadow: 5px 7px 20px rgba(107,123,78,0.5); }

        .empty-cart { text-align: center; padding: 40px 16px; }
        .empty-illustration { width: 110px; height: 110px; margin: 0 auto 18px; display: block; }
        .empty-title { font-family: 'Playfair Display', serif; font-size: 17px; color: var(--text); font-weight: 600; margin-bottom: 6px; }
        .empty-text { color: var(--text-soft); font-size: 13px; line-height: 1.6; }

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
          overflow: hidden; position: relative;
        }

        .modal::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 4px;
          background: linear-gradient(90deg, var(--brown) 40%, var(--gold) 70%, var(--green) 100%);
        }

        .modal-icon {
          width: 48px; height: 48px; background: var(--cream); border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; margin-bottom: 18px; border: 1px solid var(--border-soft);
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

        /* ── MOBILE MENU BUTTON ── */
        .mobile-menu-btn {
          display: none;
          align-items: center; gap: 6px;
          background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3);
          border-radius: 20px; padding: 5px 12px;
          color: #fff; font-family: 'DM Sans', sans-serif; font-size: 12px;
          cursor: pointer; transition: background 0.2s;
        }
        .mobile-menu-btn:hover { background: rgba(255,255,255,0.25); }

        /* ── MOBILE MENU OVERLAY ── */
        .menu-overlay {
          display: none;
          position: fixed; inset: 0; background: rgba(42,26,8,0.5);
          z-index: 45; backdrop-filter: blur(4px);
        }

        .menu-panel.mobile-open {
          position: fixed; top: 0; left: 0; bottom: 0;
          z-index: 50; box-shadow: 8px 0 32px rgba(42,26,8,0.2);
        }

        /* ── QUICK PROMPTS ── */
        .prompts-section {
          margin-top: 8px;
          align-self: stretch;
        }

        .prompts-label {
          font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase;
          color: var(--text-soft); font-weight: 500; margin-bottom: 12px;
        }

        .prompts-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
        }

        .prompt-card {
          background: linear-gradient(145deg, color-mix(in srgb, var(--accent, var(--green)) 85%, white), var(--accent, var(--green)));
          border: none; border-radius: 16px;
          padding: 16px 14px 14px;
          cursor: pointer; text-align: left;
          display: flex; flex-direction: column; gap: 4px;
          position: relative; overflow: hidden;
          transition: transform 0.18s, box-shadow 0.18s;
          box-shadow: 5px 5px 16px rgba(0,0,0,0.2), -2px -2px 6px rgba(255,255,255,0.25), inset 0 1px 0 rgba(255,255,255,0.2);
        }

        .prompt-card:hover { transform: translateY(-3px) scale(1.01); box-shadow: 8px 10px 24px rgba(0,0,0,0.25), -2px -2px 6px rgba(255,255,255,0.2); }

        .prompt-title {
          font-family: 'Playfair Display', serif;
          font-size: 13px; font-weight: 600; color: #fff; line-height: 1.3;
        }

        .prompt-sub {
          font-size: 10px; color: rgba(255,255,255,0.65); line-height: 1.4;
        }

        .prompt-arrow {
          position: absolute; bottom: 12px; right: 14px;
          font-size: 16px; color: rgba(255,255,255,0.5);
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 768px) {
          .menu-panel { display: none; }
          .menu-panel.mobile-open { display: flex; width: 280px; }
          .menu-overlay { display: block; }
          .mobile-menu-btn { display: flex; }
          .bubble { max-width: 75vw; }
          .messages { padding: 12px 16px 20px; }
          .chat-header { padding: 12px 16px; }
          .input-area { padding: 10px 16px; }
          .input-row { padding: 8px 8px 8px 14px; }
          .cart-btn { padding: 7px 12px; font-size: 12px; }
          .cart-drawer { width: 100%; }
          .modal { width: calc(100vw - 32px); padding: 28px 22px; }
          .prompts-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
          .prompt-card { padding: 13px 12px 12px; }
          .prompt-title { font-size: 12px; }
        }
      `}</style>

      <div className="layout">
        {/* ── MOBILE MENU OVERLAY ── */}
        {mobileMenuOpen && (
          <div className="menu-overlay" onClick={() => setMobileMenuOpen(false)} />
        )}

        {/* ── LEFT: MENU ── */}
        <div className={`menu-panel ${mobileMenuOpen ? 'mobile-open' : ''}`}>
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
              <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
                ☰ Menu
              </button>
              <div className="circle-emblem">
                <span className="emblem-text">US</span>
              </div>
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

          <div className="messages-wrap">
            <div className="messages-fade" />
            <div className="messages">

              {/* Group consecutive same-sender messages together */}
              {(() => {
                const groups = [];
                messages.forEach((msg, i) => {
                  const prev = messages[i - 1];
                  if (prev && prev.role === msg.role) {
                    groups[groups.length - 1].push(msg);
                  } else {
                    groups.push([msg]);
                  }
                });

                return groups.map((group, gi) => (
                  <div key={gi} className={`msg-group ${group[0].role}`}>
                    <div className={`msg-name`}>
                      {group[0].role === 'user' ? 'You' : 'Soji'}
                    </div>

                    {group.map((msg, ri) => {
                      const isLast = ri === group.length - 1;
                      const isLastMsg = gi === groups.length - 1 && isLast;
                      const isTyping = msg.role === 'assistant' && loading && isLastMsg && msg.content === '';

                      return (
                        <div key={ri} className={`msg-row ${msg.role}`}>

                          {/* Soji avatar — only on last bubble of assistant group */}
                          {msg.role === 'assistant' && (
                            isLast ? (
                              <div className="soji-avatar">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 2C9 2 7 5 8 8C5 8 3 11 5 14C3 16 4 19 7 19H17C20 19 21 16 19 14C21 11 19 8 16 8C17 5 15 2 12 2Z"
                                    fill="#d6b24a" stroke="#c9a84c" strokeWidth="0.5"/>
                                  <path d="M12 8 L12 19" stroke="#8B4513" strokeWidth="1.5" strokeLinecap="round"/>
                                  <path d="M9 12 L15 12" stroke="#8B4513" strokeWidth="1" strokeLinecap="round"/>
                                </svg>
                              </div>
                            ) : (
                              <div className="avatar-spacer" />
                            )
                          )}

                          <div className={`message ${msg.role}`}>
                            <div className="bubble">
                              {isTyping ? (
                                <div className="typing">
                                  <div className="dot"/><div className="dot"/><div className="dot"/>
                                </div>
                              ) : msg.role === 'assistant' ? (
                                <ReactMarkdown>{msg.content.split('[ORDER_CONFIRMED]')[0].trim()}</ReactMarkdown>
                              ) : msg.content}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </div>
                ));
              })()}

              {/* Quick-start prompt cards */}
              {messages.length <= 1 && !loading && (
                <div className="prompts-section">
                  <div className="prompts-label">Popular orders</div>
                  <div className="prompts-grid">
                    {QUICK_PROMPTS.map((p, i) => (
                      <button key={i} className="prompt-card" onClick={() => sendMessage(p.send)}
                        style={{ '--accent': p.accent }}>
                        <span className="prompt-title">{p.label}</span>
                        <span className="prompt-sub">{p.sub}</span>
                        <span className="prompt-arrow">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="input-area">
            {isTranscribing ? (
              <div className="recording-row">
                <div className="waveform">
                  <div className="wave-bar"/><div className="wave-bar"/><div className="wave-bar"/>
                  <div className="wave-bar"/><div className="wave-bar"/>
                </div>
                <div className="live-transcript empty">Transcribing your order…</div>
              </div>
            ) : isRecording ? (
              <div className="recording-row">
                <div className="waveform">
                  <div className="wave-bar"/><div className="wave-bar"/><div className="wave-bar"/>
                  <div className="wave-bar"/><div className="wave-bar"/>
                </div>
                <div className="live-transcript empty">Listening — speak your order…</div>
                <button className="cancel-voice-btn" onClick={cancelVoice} title="Cancel">×</button>
                <button className="confirm-btn" onClick={confirmVoice} title="Done, transcribe">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div className="input-row">
                <textarea
                  className="chat-input"
                  placeholder="Type your order or ask a question…"
                  value={input}
                  rows={3}
                  suppressHydrationWarning
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                />
                <button className="mic-btn" onClick={startVoice} title="Speak your order">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="2" width="6" height="12" rx="3"/>
                    <path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="22" x2="16" y2="22"/>
                  </svg>
                </button>
                <button className="send-btn" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            )}
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
                  <svg className="empty-illustration" viewBox="0 0 110 110" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="55" cy="55" r="48" fill="#f9f5ef" stroke="#ece8de" strokeWidth="1.5"/>
                    {/* Bag body */}
                    <rect x="28" y="46" width="54" height="38" rx="8" fill="#e8e4d8" stroke="#ddd5c0" strokeWidth="1.5"/>
                    {/* Bag handle */}
                    <path d="M42 46 C42 36 68 36 68 46" stroke="#a08860" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
                    {/* Plus badge */}
                    <circle cx="76" cy="42" r="10" fill="#829460"/>
                    <path d="M76 37 L76 47 M71 42 L81 42" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                    {/* Decorative dots */}
                    <circle cx="30" cy="32" r="3" fill="#d6b24a" opacity="0.5"/>
                    <circle cx="82" cy="28" r="2" fill="#d6b24a" opacity="0.4"/>
                    <circle cx="25" cy="72" r="2" fill="#c9622a" opacity="0.3"/>
                  </svg>
                  <div className="empty-title">Your basket is empty</div>
                  <div className="empty-text">Add items from the menu or<br/>ask Soji to help you order</div>
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