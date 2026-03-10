'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const getMenu = async () => {
      try {
        const res = await fetch('https://orderbot-backend-production-d13d.up.railway.app/menu');
        const data = await res.json();
        setMenu(data.menu);
      } catch (error) {
        console.error('Failed to fetch menu:', error);
      }
    };
    getMenu();
  }, []);

  useEffect(() => {
    const getWelcome = async () => {
      setLoading(true);
      try {
        const res = await fetch('https://orderbot-backend-production-d13d.up.railway.app/chat/welcome');
        const data = await res.json();
        setMessages([{ role: 'assistant', content: data.message }]);
      } catch (error) {
        setMessages([{ role: 'assistant', content: "Welcome to Uncle Soji's Suya Spot! What can I get for you?" }]);
      }
      setLoading(false);
    };
    getWelcome();
  }, []);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const sendMessage = async (overrideMessage) => {
    const messageToSend = overrideMessage || input.trim();
    if (!messageToSend || loading) return;

    if (!overrideMessage) setInput('');
    setLoading(true);

    setMessages(prev => [...prev, { role: 'user', content: messageToSend }]);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch('https://orderbot-backend-production-d13d.up.railway.app/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: 'session_1',
          message: messageToSend,
          conversation_history: conversationHistory
        })
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));

            if (data.token) {
              fullReply += data.token;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: (updated[updated.length - 1].content + data.token).replace(/\[ORDER_CONFIRMED\].*?\[\/ORDER_CONFIRMED\]/s, '').trim()
                };
                return updated;
              });
            }

            if (data.done) {
              setConversationHistory(data.conversation_history);

              // Check if Claude confirmed an order
              const orderMatch = fullReply.match(/\[ORDER_CONFIRMED\](.*?)\[\/ORDER_CONFIRMED\]/s);
              if (orderMatch) {
                try {
                  const orderData = JSON.parse(orderMatch[1]);
                  const orderRes = await fetch('https://orderbot-backend-production-d13d.up.railway.app/orders', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderData)
                  });
                  const savedOrder = await orderRes.json();
                  if (savedOrder.order_id) {
                    setCart([]);
                    window.location.href = `/confirmation?name=${encodeURIComponent(orderData.customer_name)}&phone=${encodeURIComponent(orderData.customer_phone)}&total=${orderData.total_price}`;
                  }
                } catch (err) {
                  console.error('Failed to save chat order:', err);
                }
              }
            }
          }
        }
      }

    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    }

    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    setCartOpen(false);
    setCheckoutStep('name');
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Great! Your order comes to **₦${cartTotal.toLocaleString()}**. To complete your order, what is your name?`
    }]);
  };

  const handleCheckoutInput = async () => {
    if (checkoutStep === 'name') {
      if (!customerName.trim()) return;
      setCheckoutStep('phone');
      setMessages(prev => [
        ...prev,
        { role: 'user', content: customerName },
        { role: 'assistant', content: `Nice to meet you, ${customerName}! What is your phone number?` }
      ]);
    } else if (checkoutStep === 'phone') {
      if (!customerPhone.trim()) return;
      setCheckoutStep('confirm');
      const itemsList = cart.map(i => `• ${i.name} x${i.quantity} — ₦${(i.price * i.quantity).toLocaleString()}`).join('\n');
      setMessages(prev => [
        ...prev,
        { role: 'user', content: customerPhone },
        { role: 'assistant', content: `Perfect! Here is your order summary:\n\n${itemsList}\n\n**Total: ₦${cartTotal.toLocaleString()}**\n\nShall I confirm this order?` }
      ]);
    } else if (checkoutStep === 'confirm') {
      try {
        const res = await fetch('https://orderbot-backend-production-d13d.up.railway.app/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: customerName,
            customer_phone: customerPhone,
            items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity })),
            total_price: cartTotal,
            notes: ''
          })
        });
        const data = await res.json();
        if (data.order_id) {
          setCart([]);
          setCheckoutStep(null);
          setCustomerName('');
          setCustomerPhone('');
          window.location.href = `/confirmation?name=${encodeURIComponent(customerName)}&phone=${encodeURIComponent(customerPhone)}&total=${cartTotal}`;
        }
      } catch (error) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, there was an error placing your order. Please try again.' }]);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-500 text-white p-4 shadow z-10 flex items-center justify-between">
        <div className="flex-1 text-center">
          <h1 className="text-xl font-bold">Uncle Soji's Suya Spot 🔥</h1>
          <p className="text-sm opacity-80">Order fresh suya delivered to you</p>
        </div>
        <button
          onClick={() => setCartOpen(true)}
          className="relative bg-white text-orange-500 rounded-full p-2 ml-4"
        >
          🛒
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Menu Panel */}
        <div className="hidden md:flex flex-col w-72 bg-white border-r overflow-y-auto p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Our Menu</h2>
          {Object.entries(menu).map(([category, items]) => (
            <div key={category} className="mb-5">
              <h3 className="text-sm font-semibold text-orange-500 uppercase tracking-wide mb-2">
                {category}
              </h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <span className="text-sm font-medium text-gray-800">{item.name}</span>
                      <span className="text-sm font-bold text-orange-500 ml-2 whitespace-nowrap">
                        ₦{item.price.toLocaleString()}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    )}
                    <button
                      onClick={() => {
                        setCart(prev => {
                          const existing = prev.findIndex(i => i.name === item.name);
                          if (existing >= 0) {
                            const updated = [...prev];
                            updated[existing] = { ...updated[existing], quantity: updated[existing].quantity + 1 };
                            return updated;
                          }
                          return [...prev, { ...item, quantity: 1 }];
                        });
                      }}
                      className="mt-2 w-full bg-orange-500 text-white text-xs py-1 rounded-full hover:bg-orange-600 transition"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT — Chat */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-orange-500 text-white rounded-br-none'
                    : 'bg-white text-gray-800 shadow rounded-bl-none'
                }`}>
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-400 px-4 py-2 rounded-2xl shadow text-sm">
                  Typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t">
            {checkoutStep === 'name' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckoutInput()}
                  placeholder="Enter your name..."
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-orange-400"
                />
                <button onClick={handleCheckoutInput} className="bg-orange-500 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-orange-600 transition">
                  Next
                </button>
              </div>
            )}
            {checkoutStep === 'phone' && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCheckoutInput()}
                  placeholder="Enter your phone number..."
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-orange-400"
                />
                <button onClick={handleCheckoutInput} className="bg-orange-500 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-orange-600 transition">
                  Next
                </button>
              </div>
            )}
            {checkoutStep === 'confirm' && (
              <div className="flex gap-2">
                <button onClick={handleCheckoutInput} className="flex-1 bg-orange-500 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-orange-600 transition">
                  ✅ Confirm Order
                </button>
                <button onClick={() => setCheckoutStep(null)} className="px-5 py-2 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            )}
            {!checkoutStep && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Type your order here..."
                  className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-orange-400"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  className="bg-orange-500 text-white px-5 py-2 rounded-full text-sm font-medium disabled:opacity-50 hover:bg-orange-600 transition"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black opacity-30" onClick={() => setCartOpen(false)} />
          <div className="relative bg-white w-80 h-full shadow-xl flex flex-col">
            <div className="p-4 bg-orange-500 text-white flex justify-between items-center">
              <h2 className="text-lg font-bold">Your Cart 🛒</h2>
              <button onClick={() => setCartOpen(false)} className="text-white text-xl font-bold">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <p className="text-gray-400 text-sm text-center mt-8">Your cart is empty. Start chatting to add items!</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item, index) => (
                    <div key={index} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">x{item.quantity}</p>
                      </div>
                      <p className="text-sm font-bold text-orange-500">
                        ₦{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cart.length > 0 && (
              <div className="p-4 border-t">
                <div className="flex justify-between mb-4">
                  <span className="font-bold text-gray-800">Total</span>
                  <span className="font-bold text-orange-500">₦{cartTotal.toLocaleString()}</span>
                </div>
                <button
                  onClick={handleCheckout}
                  className="w-full bg-orange-500 text-white py-3 rounded-full font-medium hover:bg-orange-600 transition"
                >
                  Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
