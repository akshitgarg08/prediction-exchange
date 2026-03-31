'use client';
import { useEffect, useState } from 'react';
import { useMarketStore } from '../store/useMarketStore';
import { useAuthStore } from '../store/useAuthStore';
import AMMPrice from '../components/AMMPrice';
import TradePanel from '../components/TradePanel';
import AuthModal from '../components/AuthModal';
import { LogOut, Wallet, RefreshCw } from 'lucide-react';

const API_URL = 'http://localhost:8080';

export default function Home() {
  const { fetchMarkets, startPolling, stopPolling, activeMarket, prices } = useMarketStore();
  const { user, logout } = useAuthStore();
  const [balance, setBalance] = useState(0);
  const [positions, setPositions] = useState([]);

  // Fetch markets and start polling on login
  useEffect(() => {
    if (!user) return;
    fetchMarkets();
    startPolling();
    return () => stopPolling();
  }, [user, fetchMarkets, startPolling, stopPolling]);

  // Fetch user balance + positions
  const fetchPortfolio = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/portfolio/${user.id}`);
      const data = await res.json();
      if (res.ok) {
        setBalance(data.coins);
        setPositions(data.positions ?? []);
      }
    } catch {
      // silently ignore network errors during polling
    }
  };

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/portfolio/${user.id}`);
        const data = await res.json();
        if (!cancelled && res.ok) {
          setBalance(data.coins);
          setPositions(data.positions ?? []);
        }
      } catch {
        // silently ignore
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  // Guard: show auth screen if not logged in
  if (!user) return <AuthModal />;

  if (!activeMarket) {
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
            <span className="font-bold text-xl tracking-tight">
              POLY<span className="text-blue-400">IPL</span>
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
              <Wallet size={16} className="text-emerald-400" />
              <span className="text-sm font-mono font-bold text-emerald-400">
                {balance.toFixed(2)} coins
              </span>
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
        {/* Market header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest">
              Live AMM Market
            </span>
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight lg:text-5xl max-w-3xl">
            {activeMarket.question}
          </h2>
          <p className="text-gray-500 mt-2 text-sm">
            Closes:{' '}
            {new Date(activeMarket.resolvesAt).toLocaleDateString('en-US', {
              dateStyle: 'medium',
            })}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Price chart area + positions */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Chart placeholder */}
            <div className="aspect-video bg-gray-900/50 border border-gray-800 rounded-2xl flex items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent"></div>

              {/* Simple probability bar */}
              <div className="w-full h-full flex flex-col items-center justify-center gap-6 px-12">
                <div className="w-full">
                  <div className="flex justify-between text-xs text-gray-500 mb-2 font-mono">
                    <span>YES {(prices.yes * 100).toFixed(1)}¢</span>
                    <span>NO {(prices.no * 100).toFixed(1)}¢</span>
                  </div>
                  <div className="w-full h-6 rounded-full overflow-hidden bg-red-900/40 border border-gray-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-700 ease-out"
                      style={{ width: `${(prices.yes * 100).toFixed(1)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-600 mt-2">
                    <span>YES probability</span>
                    <span>NO probability</span>
                  </div>
                </div>
                <p className="text-gray-600 text-sm flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin" />
                  Prices update every 5 seconds
                </p>
              </div>
            </div>

            {/* User Positions */}
            <div className="bg-gray-900/30 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-4">
                Your Positions
              </h3>
              {positions.length === 0 ? (
                <p className="text-gray-500 italic text-sm">
                  You don&apos;t own any shares in this market yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {positions.map((pos) => (
                    <div
                      key={pos.id}
                      className="flex items-center justify-between bg-gray-800/50 rounded-xl px-4 py-3 border border-gray-700"
                    >
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5 truncate max-w-xs">
                          {pos.market?.question}
                        </p>
                        <span
                          className={`text-sm font-bold ${
                            pos.outcome === 'YES' ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {pos.outcome}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-mono font-bold">
                          {pos.shares.toFixed(4)}
                        </p>
                        <p className="text-gray-500 text-xs">shares</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: AMM Price + Trading sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <AMMPrice />
            <TradePanel
              marketId={activeMarket.id}
              userId={user.id}
              onTradeComplete={fetchPortfolio}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
