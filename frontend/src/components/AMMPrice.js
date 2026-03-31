// frontend/src/components/AMMPrice.js
'use client';
import { useMarketStore } from '../store/useMarketStore';

export default function AMMPrice() {
  const { prices, activeMarket } = useMarketStore();

  const yesPercent = (prices.yes * 100).toFixed(1);
  const noPercent = (prices.no * 100).toFixed(1);

  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest">
          AMM Prices
        </h3>
        <span className="text-gray-600 text-xs">Pool-based</span>
      </div>

      <div className="flex gap-3">
        {/* YES price */}
        <div className="flex-1 bg-emerald-950/40 border border-emerald-800/50 rounded-xl p-4 text-center">
          <p className="text-emerald-400 text-xs font-bold uppercase mb-1">YES</p>
          <p className="text-emerald-300 text-3xl font-extrabold font-mono">{yesPercent}¢</p>
          <p className="text-emerald-600 text-xs mt-1">{yesPercent}% probability</p>
        </div>

        {/* NO price */}
        <div className="flex-1 bg-red-950/40 border border-red-800/50 rounded-xl p-4 text-center">
          <p className="text-red-400 text-xs font-bold uppercase mb-1">NO</p>
          <p className="text-red-300 text-3xl font-extrabold font-mono">{noPercent}¢</p>
          <p className="text-red-600 text-xs mt-1">{noPercent}% probability</p>
        </div>
      </div>

      {/* Pool reserves */}
      {activeMarket?.pool && (
        <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 gap-2 text-xs text-gray-500">
          <div>
            <span className="text-gray-600">YES Reserve</span>
            <p className="text-gray-400 font-mono">{activeMarket.pool.yesReserve.toFixed(2)}</p>
          </div>
          <div>
            <span className="text-gray-600">NO Reserve</span>
            <p className="text-gray-400 font-mono">{activeMarket.pool.noReserve.toFixed(2)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
