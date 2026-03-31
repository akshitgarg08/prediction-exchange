// frontend/src/components/TradePanel.js
'use client';
import { useState } from 'react';

export default function TradePanel({ marketId, userId }) {
  const [type, setType] = useState('BUY');
  const [price, setPrice] = useState('0.50');
  const [quantity, setQuantity] = useState('10');
  const [loading, setLoading] = useState(false);

  const handleTrade = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:8080/markets/${marketId}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId, // In a real app, this comes from the JWT token context
          type,
          outcome: 'YES', // Hardcoded to YES for the MVP interface
          price: parseFloat(price),
          quantity: parseInt(quantity)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Order Placed: ' + data.result.status);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl p-5 w-full md:w-80 shadow-xl border border-gray-800">
      <div className="flex space-x-2 mb-4">
        <button 
          onClick={() => setType('BUY')}
          className={`flex-1 py-2 font-bold rounded ${type === 'BUY' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          BUY
        </button>
        <button 
          onClick={() => setType('SELL')}
          className={`flex-1 py-2 font-bold rounded ${type === 'SELL' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
        >
          SELL
        </button>
      </div>

      <form onSubmit={handleTrade} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 font-bold mb-1">Price (¢)</label>
          <input 
            type="number" step="0.01" min="0.01" max="0.99" required
            value={price} onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-bold mb-1">Quantity (Shares)</label>
          <input 
            type="number" min="1" required
            value={quantity} onChange={(e) => setQuantity(e.target.value)}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button 
          type="submit" disabled={loading}
          className={`w-full py-3 rounded font-bold text-white transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : (type === 'BUY' ? 'bg-green-600 hover:bg-green-500' : 'bg-red-600 hover:bg-red-500')}`}
        >
          {loading ? 'Processing...' : `Place ${type} Order`}
        </button>
      </form>
    </div>
  );
}