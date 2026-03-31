// frontend/src/components/TradePanel.js
'use client';
import { useState } from 'react';
import { useMarketStore } from '../store/useMarketStore';

const API_URL = 'http://localhost:8080';

export default function TradePanel({ marketId, userId, onTradeComplete }) {
  const { prices, refreshPrice } = useMarketStore();
  const [action, setAction] = useState('BUY');       // BUY | SELL
  const [outcome, setOutcome] = useState('YES');     // YES | NO
  const [amount, setAmount] = useState('10');        // coins (buy) or shares (sell)
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const handleTrade = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLastResult(null);

    const endpoint =
      action === 'BUY'
        ? `${API_URL}/markets/${marketId}/buy`
        : `${API_URL}/markets/${marketId}/sell`;

    const body =
      action === 'BUY'
        ? { userId, outcome, coinAmount: parseFloat(amount) }
        : { userId, outcome, shares: parseFloat(amount) };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setLastResult(data);
      // Refresh price immediately after a successful trade
      await refreshPrice();
      if (onTradeComplete) onTradeComplete();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isBuy = action === 'BUY';
  const currentPrice = outcome === 'YES' ? prices.yes : prices.no;
  const estimatedShares = isBuy
    ? ((parseFloat(amount) || 0) / currentPrice).toFixed(2)
    : null;

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      {/* Action toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setAction('BUY')}
          className={`flex-1 py-2 font-bold rounded-lg text-sm transition-colors ${
            isBuy
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setAction('SELL')}
          className={`flex-1 py-2 font-bold rounded-lg text-sm transition-colors ${
            !isBuy
              ? 'bg-red-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Outcome toggle */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setOutcome('YES')}
          className={`flex-1 py-2 font-bold rounded-lg text-sm border transition-colors ${
            outcome === 'YES'
              ? 'border-emerald-500 bg-emerald-950/60 text-emerald-400'
              : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
          }`}
        >
          YES
        </button>
        <button
          onClick={() => setOutcome('NO')}
          className={`flex-1 py-2 font-bold rounded-lg text-sm border transition-colors ${
            outcome === 'NO'
              ? 'border-red-500 bg-red-950/60 text-red-400'
              : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
          }`}
        >
          NO
        </button>
      </div>

      <form onSubmit={handleTrade} className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 font-bold mb-1 uppercase">
            {isBuy ? 'Coins to Spend' : 'Shares to Sell'}
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg p-3 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>

        {/* Price info */}
        <div className="text-xs text-gray-500 space-y-1 bg-gray-800/50 rounded-lg p-3">
          <div className="flex justify-between">
            <span>Current {outcome} price</span>
            <span className="text-gray-300 font-mono">{(currentPrice * 100).toFixed(1)}¢</span>
          </div>
          {isBuy && (
            <div className="flex justify-between">
              <span>Estimated shares</span>
              <span className="text-gray-300 font-mono">~{estimatedShares}</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-lg font-bold text-white transition-colors ${
            loading
              ? 'opacity-50 cursor-not-allowed bg-gray-700'
              : isBuy
              ? 'bg-emerald-600 hover:bg-emerald-500'
              : 'bg-red-600 hover:bg-red-500'
          }`}
        >
          {loading
            ? 'Processing...'
            : `${action} ${outcome} ${isBuy ? 'Shares' : ''}`}
        </button>
      </form>

      {/* Last trade result */}
      {lastResult && (
        <div className="mt-4 p-3 bg-gray-800 rounded-lg text-xs text-gray-400 border border-gray-700">
          <p className="font-bold text-gray-300 mb-1">Trade Executed ✓</p>
          {lastResult.sharesOut != null && (
            <p>Received: <span className="text-emerald-400 font-mono">{lastResult.sharesOut.toFixed(4)} {outcome} shares</span></p>
          )}
          {lastResult.coinsOut != null && (
            <p>Received: <span className="text-emerald-400 font-mono">{lastResult.coinsOut.toFixed(4)} coins</span></p>
          )}
          <p className="mt-1">
            New YES price:{' '}
            <span className="text-emerald-400 font-mono">
              {(lastResult.newPrices.yes * 100).toFixed(2)}¢
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
