'use client';
import { useEffect, useState } from 'react';
import { useMarketStore } from '../store/useMarketStore';
import { useAuthStore } from '../store/useAuthStore';
import OrderBook from '../components/OrderBook';
import TradePanel from '../components/TradePanel';
import AuthModal from '../components/AuthModal';
import { LogOut, Wallet } from 'lucide-react';

export default function Home() {
  const { connectToMarket, disconnect } = useMarketStore();
  const { user, logout } = useAuthStore();
  const [marketId, setMarketId] = useState('');
  const [balance, setBalance] = useState(0);

  // 1. Fetch Market and Connect Socket
  useEffect(() => {
    if (!user) return;

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
  }, [user, connectToMarket, disconnect]);

  // 2. Fetch User Balance
  useEffect(() => {
    if (!user) return;

    const fetchBalance = async () => {
      const res = await fetch(`http://localhost:8080/portfolio/${user.id}`);
      const data = await res.json();
      if (res.ok) setBalance(data.balances.coins);
    };

    fetchBalance();
    // Refresh balance every 5 seconds or on market events
    const interval = setInterval(fetchBalance, 5000);
    return () => clearInterval(interval);
  }, [user]);

  // 3. Guard: If no user is logged in, show Auth Screen
  if (!user) {
    return <AuthModal />;
  }

  if (!marketId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Market Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg shadow-lg shadow-blue-500/20"></div>
            <span className="font-bold text-xl tracking-tight">POLY<span className="text-blue-400">IPL</span></span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
              <Wallet size={16} className="text-emerald-400" />
              <span className="text-sm font-mono font-bold text-emerald-400">{balance.toFixed(2)}</span>
            </div>
            
            <div className="h-4 w-[1px] bg-gray-800"></div>

            <button 
              onClick={logout}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 lg:p-10">
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest">Live Market</span>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl max-w-3xl">
            Will Virat Kohli score a century today?
          </h2>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left: Chart Area */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="aspect-video bg-gray-900/50 border border-gray-800 rounded-2xl flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent"></div>
              <p className="text-gray-600 font-medium group-hover:text-gray-500 transition-colors">
                Interactive Price Chart Coming Soon
              </p>
            </div>

            {/* Position Summary (Mini) */}
            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-gray-400 text-sm font-bold uppercase mb-4">Your Position</h3>
              <p className="text-gray-500 italic text-sm">You don't own any shares in this market yet.</p>
            </div>
          </div>

          {/* Right: Trading Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <OrderBook />
            {/* Pass the real USER ID from Auth Store */}
            <TradePanel marketId={marketId} userId={user.id} />
          </div>

        </div>
      </main>
    </div>
  );
}