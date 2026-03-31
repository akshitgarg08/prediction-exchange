// frontend/src/components/OrderBook.js
'use client';
import { useMarketStore } from '../store/useMarketStore';

export default function OrderBook() {
  const { orderBook } = useMarketStore();

  return (
    <div className="bg-gray-900 rounded-xl p-4 w-full md:w-80 font-mono text-sm text-gray-300 shadow-xl border border-gray-800">
      <div className="flex justify-between font-bold text-gray-500 mb-3 pb-2 border-b border-gray-800">
        <span>Price (¢)</span>
        <span>Qty</span>
      </div>

      {/* Asks (Sell Orders) - Red */}
      <div className="flex flex-col-reverse mb-2">
        {orderBook.asks.length === 0 ? (
          <div className="text-gray-600 text-center py-2 italic">No asks</div>
        ) : (
          orderBook.asks.map((ask, i) => (
            <div key={i} className="flex justify-between hover:bg-gray-800 px-2 py-1 cursor-pointer rounded">
              <span className="text-red-500">{ask.price.toFixed(2)}</span>
              <span>{ask._sum.remainingQty}</span>
            </div>
          ))
        )}
      </div>

      {/* The Spread / Market Price indicator */}
      <div className="my-2 py-2 text-center text-lg font-bold text-white bg-gray-800 rounded">
        SPREAD
      </div>

      {/* Bids (Buy Orders) - Green */}
      <div className="mt-2">
        {orderBook.bids.length === 0 ? (
          <div className="text-gray-600 text-center py-2 italic">No bids</div>
        ) : (
          orderBook.bids.map((bid, i) => (
            <div key={i} className="flex justify-between hover:bg-gray-800 px-2 py-1 cursor-pointer rounded">
              <span className="text-green-500">{bid.price.toFixed(2)}</span>
              <span>{bid._sum.remainingQty}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}