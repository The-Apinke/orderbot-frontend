'use client';

import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch('https://orderbot-backend-production-d13d.up.railway.app/orders');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await fetch(`https://orderbot-backend-production-d13d.up.railway.app/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      fetchOrders();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    fulfilled: 'bg-green-100 text-green-800'
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-500 text-white p-4 shadow">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Uncle Soji's Dashboard 🔥</h1>
            <p className="text-sm opacity-80">Restaurant Orders</p>
          </div>
          <button
            onClick={fetchOrders}
            className="bg-white text-orange-500 px-4 py-2 rounded-full text-sm font-medium hover:bg-orange-50 transition"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Orders */}
      <div className="max-w-6xl mx-auto p-4">
        {loading ? (
          <p className="text-center text-gray-400 mt-12">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-center text-gray-400 mt-12">No orders yet. Share your ordering link to get started!</p>
        ) : (
          <div className="space-y-4 mt-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{order.customer_name}</h3>
                    <p className="text-sm text-gray-500">{order.customer_phone}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatTime(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-orange-500 text-lg">₦{order.total_price.toLocaleString()}</p>
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value)}
                      className={`mt-1 text-xs px-2 py-1 rounded-full font-medium border-0 ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="fulfilled">Fulfilled</option>
                    </select>
                  </div>
                </div>

                {/* Items */}
                <div className="border-t pt-3">
                  <div className="space-y-1">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.name} x{item.quantity}</span>
                        <span className="text-gray-500">₦{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  {order.notes && (
                    <p className="text-xs text-gray-400 mt-2 italic">Note: {order.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
