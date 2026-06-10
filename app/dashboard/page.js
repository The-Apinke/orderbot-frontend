'use client';

import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://orderbot-backend.onrender.com';

const STATUS_STYLES = {
  pending:   { bg: '#fef9ec', text: '#92630a', border: '#f0d888' },
  confirmed: { bg: '#eef4ff', text: '#1a5fb4', border: '#9dc0f0' },
  fulfilled: { bg: '#edf5e8', text: '#2e6b2e', border: '#9dd49d' },
};

export default function DashboardPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [adminKey, setAdminKey] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin_key');
    if (saved) setAdminKey(saved);
  }, []);

  async function fetchOrders(key) {
    try {
      const res = await fetch(`${API}/orders`, {
        headers: { 'X-Admin-Key': key || adminKey },
      });
      if (res.status === 401) { setAdminKey(''); sessionStorage.removeItem('admin_key'); return; }
      const data = await res.json();
      setOrders(data.orders);
      setLastUpdated(new Date());
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => {
    if (!adminKey) return;
    fetchOrders(adminKey);
    const interval = setInterval(() => fetchOrders(adminKey), 30000);
    return () => clearInterval(interval);
  }, [adminKey]);

  function handleLogin(e) {
    e.preventDefault();
    if (!keyInput.trim()) return;
    sessionStorage.setItem('admin_key', keyInput.trim());
    setAdminKey(keyInput.trim());
    setAuthError(false);
    setLoading(true);
    fetchOrders(keyInput.trim()).then(() => {
      if (!orders.length) setAuthError(false);
    });
  }

  async function updateStatus(orderId, status) {
    await fetch(`${API}/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Key': adminKey },
      body: JSON.stringify({ status }),
    });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  }

  const counts = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    fulfilled: orders.filter(o => o.status === 'fulfilled').length,
  };

  const revenue = orders.filter(o => o.status === 'fulfilled').reduce((s, o) => s + Number(o.total_price), 0);

  if (!adminKey) return (
    <div style={{
      minHeight: '100vh', background: '#f2f0e9',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <form onSubmit={handleLogin} style={{
        background: '#fff', border: '1px solid #ddd8c8', borderTop: '4px solid #623920',
        padding: '40px 36px', width: '100%', maxWidth: 360, textAlign: 'center',
      }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>🔥</div>
        <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: '#2a1a08', marginBottom: 4 }}>
          Uncle Soji's Dashboard
        </div>
        <div style={{ fontSize: 12, color: '#a89070', marginBottom: 24 }}>Enter your admin password to continue</div>
        {authError && <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 12 }}>Incorrect password</div>}
        <input
          type="password" placeholder="Admin password" value={keyInput}
          onChange={e => setKeyInput(e.target.value)} autoFocus
          style={{
            width: '100%', padding: '11px 14px', border: '1px solid #ddd8c8',
            fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: '#2a1a08',
            outline: 'none', marginBottom: 12, background: '#f2f0e9',
          }}
        />
        <button type="submit" style={{
          width: '100%', padding: '12px', background: '#623920', color: '#fff',
          border: 'none', fontFamily: "'DM Sans', sans-serif", fontSize: 13,
          fontWeight: 600, letterSpacing: '0.08em', cursor: 'pointer',
        }}>
          ENTER →
        </button>
      </form>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --brown:      #623920;
          --brown-dark: #4a2a14;
          --gold:       #d6b24a;
          --gold-pale:  #f7edcc;
          --cream:      #f2f0e9;
          --green:      #829460;
          --green-dark: #637248;
          --white:      #ffffff;
          --text-dark:  #2a1a08;
          --text-mid:   #7a5c3a;
          --text-light: #a89070;
          --border:     #ddd8c8;
        }

        body { background: var(--cream); font-family: 'DM Sans', sans-serif; color: var(--text-dark); }
        .page { min-height: 100vh; background: var(--cream); }

        /* Brown topbar */
        .topbar {
          background: var(--brown); padding: 18px 40px;
          display: flex; align-items: center; justify-content: space-between;
        }

        .brand-area { display: flex; align-items: center; gap: 14px; }

        .brand-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: var(--gold);
          display: flex; align-items: center; justify-content: center; font-size: 18px;
        }

        .brand { font-family: 'Playfair Display', serif; font-size: 18px; color: #fff; font-weight: 700; }
        .brand-sub { font-size: 11px; color: rgba(255,255,255,0.55); letter-spacing: 0.1em; text-transform: uppercase; margin-top: 2px; }

        .topbar-right { display: flex; align-items: center; gap: 12px; }
        .last-updated { font-size: 12px; color: rgba(255,255,255,0.55); }

        .refresh-btn {
          background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);
          color: #fff; padding: 7px 16px; border-radius: 16px;
          font-family: 'DM Sans', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.2s;
        }

        .refresh-btn:hover { background: rgba(255,255,255,0.2); }

        /* Green sub-bar */
        .subbar {
          background: var(--green); padding: 10px 40px;
          display: flex; align-items: center; gap: 8px;
        }

        .subbar-dot { width: 6px; height: 6px; background: var(--gold); border-radius: 50%; }
        .subbar-text { font-size: 12px; color: rgba(255,255,255,0.8); letter-spacing: 0.04em; }

        .content { padding: 28px 40px; max-width: 1100px; margin: 0 auto; }

        .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }

        .stat-card {
          background: var(--white); border: 1px solid var(--border);
          border-radius: 16px; padding: 18px 22px; transition: box-shadow 0.2s;
        }

        .stat-card:hover { box-shadow: 0 4px 16px rgba(98,57,32,0.08); }
        .stat-card.revenue { border-top: 3px solid var(--gold); }
        .stat-card.pending-card { border-top: 3px solid var(--brown); }

        .stat-label { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-light); margin-bottom: 8px; }
        .stat-value { font-family: 'Playfair Display', serif; font-size: 28px; color: var(--text-dark); font-weight: 700; }
        .stat-value.gold { color: var(--gold); }
        .stat-value.brown { color: var(--brown); }
        .stat-value.small { font-size: 20px; }

        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .section-title { font-family: 'Playfair Display', serif; font-size: 18px; color: var(--text-dark); }
        .order-count { font-size: 12px; color: var(--text-light); }

        .orders-list { display: flex; flex-direction: column; gap: 10px; }

        .order-card {
          background: var(--white); border: 1px solid var(--border);
          border-radius: 16px; padding: 18px 22px; transition: box-shadow 0.2s;
          border-left: 4px solid var(--border);
        }

        .order-card:hover { box-shadow: 0 4px 18px rgba(98,57,32,0.07); }
        .order-card.status-pending { border-left-color: var(--brown); }
        .order-card.status-confirmed { border-left-color: #5b8dd9; }
        .order-card.status-fulfilled { border-left-color: var(--green); }

        .order-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
        .order-id { font-size: 10px; color: var(--text-light); letter-spacing: 0.1em; margin-bottom: 3px; text-transform: uppercase; }
        .customer-name { font-family: 'Playfair Display', serif; font-size: 15px; color: var(--text-dark); font-weight: 600; }
        .customer-phone { font-size: 12px; color: var(--text-light); margin-top: 2px; }

        .order-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }

        .status-badge {
          padding: 3px 12px; border-radius: 20px; font-size: 10px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase; border: 1px solid;
        }

        .status-select {
          background: var(--cream); border: 1px solid var(--border); border-radius: 8px;
          padding: 5px 10px; font-family: 'DM Sans', sans-serif; font-size: 12px;
          color: var(--text-dark); cursor: pointer; outline: none; transition: border-color 0.2s;
        }

        .status-select:focus { border-color: var(--green); }

        .order-items { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }

        .item-chip {
          background: var(--cream); border: 1px solid var(--border);
          border-radius: 10px; padding: 5px 11px; font-size: 12px; color: var(--text-dark);
        }

        .item-chip-name { font-weight: 500; }
        .item-chip-pack { font-size: 10px; color: var(--text-light); margin-top: 2px; }

        .order-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 10px; border-top: 1px solid var(--border);
        }

        .order-time { font-size: 11px; color: var(--text-light); }
        .order-total { font-family: 'Playfair Display', serif; font-size: 17px; color: var(--gold); font-weight: 600; }
        .notes { font-size: 12px; color: var(--text-light); font-style: italic; margin-bottom: 10px; }

        .empty { text-align: center; padding: 60px 0; color: var(--text-light); }
        .empty-icon { font-size: 40px; display: block; margin-bottom: 12px; }
        .empty-text { font-family: 'Playfair Display', serif; font-size: 18px; color: var(--text-dark); margin-bottom: 6px; }
        .loading { text-align: center; padding: 60px 0; color: var(--text-light); font-size: 14px; }
      `}</style>

      <div className="page">
        <div className="topbar">
          <div className="brand-area">
            <div className="brand-icon">🔥</div>
            <div>
              <div className="brand">Uncle Soji's Suya Spot</div>
              <div className="brand-sub">Order Dashboard</div>
            </div>
          </div>
          <div className="topbar-right">
            {lastUpdated && <span className="last-updated">Updated {lastUpdated.toLocaleTimeString()}</span>}
            <button className="refresh-btn" onClick={fetchOrders}>↻ Refresh</button>
          </div>
        </div>

        <div className="subbar">
          <div className="subbar-dot" />
          <span className="subbar-text">Live orders — auto-refreshes every 30 seconds</span>
        </div>

        <div className="content">
          <div className="stats">
            <div className="stat-card">
              <div className="stat-label">Total Orders</div>
              <div className="stat-value">{counts.total}</div>
            </div>
            <div className="stat-card pending-card">
              <div className="stat-label">Pending</div>
              <div className="stat-value brown">{counts.pending}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Confirmed</div>
              <div className="stat-value">{counts.confirmed}</div>
            </div>
            <div className="stat-card revenue">
              <div className="stat-label">Revenue (Fulfilled)</div>
              <div className="stat-value gold small">₦{revenue.toLocaleString()}</div>
            </div>
          </div>

          <div className="section-header">
            <div className="section-title">All Orders</div>
            <div className="order-count">{orders.length} order{orders.length !== 1 ? 's' : ''}</div>
          </div>

          {loading ? (
            <div className="loading">Loading orders...</div>
          ) : orders.length === 0 ? (
            <div className="empty">
              <span className="empty-icon">🔥</span>
              <div className="empty-text">No orders yet</div>
              <div>Orders will appear here in real time</div>
            </div>
          ) : (
            <div className="orders-list">
              {orders.map(order => {
                const ss = STATUS_STYLES[order.status] || STATUS_STYLES.pending;
                return (
                  <div key={order.id} className={`order-card status-${order.status}`}>
                    <div className="order-top">
                      <div>
                        <div className="order-id">#{order.id.slice(0,8)}</div>
                        <div className="customer-name">{order.customer_name}</div>
                        <div className="customer-phone">{order.customer_phone}</div>
                      </div>
                      <div className="order-right">
                        <span className="status-badge" style={{ background: ss.bg, color: ss.text, borderColor: ss.border }}>
                          {order.status}
                        </span>
                        <select className="status-select" value={order.status} onChange={e => updateStatus(order.id, e.target.value)}>
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="fulfilled">Fulfilled</option>
                        </select>
                      </div>
                    </div>
                    <div className="order-items">
                      {order.items.map((item, i) => (
                        <div key={i} className="item-chip">
                          <div className="item-chip-name">{item.name} × {item.quantity}</div>
                          {item.packaging_note && <div className="item-chip-pack">{item.packaging_note}</div>}
                        </div>
                      ))}
                    </div>
                    {order.notes && <div className="notes">Note: {order.notes}</div>}
                    <div className="order-footer">
                      <span className="order-time">
                        {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="order-total">₦{Number(order.total_price).toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}