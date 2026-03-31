// frontend/src/app/page.js
'use client';
import { useEffect, useState } from 'react';
import { useMarketStore } from '../store/useMarketStore';
import OrderBook from '../components/OrderBook';
import TradePanel from '../components/TradePanel';

export default function Home() {
  const { connectToMarket, disconnect } = useMarketStore();
  const [marketId, setMarketId] = useState('');
  
  // For the MVP, hardcode Alice's ID that you got from Postman earlier
  const ALICE_ID = "3652a86c-77e0-43e3-9a0d-85291809a07b"; 

  useEffect(() => {
    // We will fetch the first available market to display
    fetch('http://localhost:8080/markets')
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          const id = data[0].id;
          setMarketId(id);
          connectToMarket(id);
        }
      });

    return () => disconnect();
  }, []);

  if (!marketId) return <div className="p-10 text-white text-center">Loading markets... (Did you create one in Postman?)</div>;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <header className="mb-8 border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Cricket Prediction Market
        </h1>
        <p className="text-gray-400 mt-2">Trade live events with zero latency.</p>
      </header>

      <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Market Info */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-xl p-6 h-fit">
          <span className="bg-blue-900 text-blue-300 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Live</span>
          <h2 className="text-2xl font-bold mt-3 mb-6">Will Virat Kohli score a century today?</h2>
          
          <div className="h-48 border border-gray-800 rounded flex items-center justify-center text-gray-600 bg-gray-950">
            [Price Chart Placeholder]
          </div>
        </div>

        {/* Right Column: Trading Interface */}
        <div className="flex flex-col gap-4">
          <OrderBook />
          <TradePanel marketId={marketId} userId={ALICE_ID} />
        </div>

      </div>
    </div>
  );
}