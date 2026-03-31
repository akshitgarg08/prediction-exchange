const express = require('express');
const prisma = require('../db');
const { placeOrder } = require('../engine/matcher');

const router = express.Router();

// 1. Get all markets
router.get('/', async (req, res) => {
  const markets = await prisma.market.findMany();
  res.json(markets);
});

// 2. Create a new market (Admin only usually, but open for MVP)
router.post('/', async (req, res) => {
  const { question, resolvesAt } = req.body;
  const market = await prisma.market.create({
    data: { question, resolvesAt: new Date(resolvesAt) }
  });
  res.json(market);
});

// 3. Place an order in a market
router.post('/:marketId/orders', async (req, res) => {
  const { marketId } = req.params;
  const { userId, type, outcome, price, quantity } = req.body;

  try {
    const result = await placeOrder(userId, marketId, type, outcome, price, quantity);
    
    // Broadcast to websockets (we will fully wire this up in Step 4)
    const io = req.app.get('io');
    io.to(`market_${marketId}`).emit('orderBookUpdate', { marketId });
    
    res.json({ message: "Order processed successfully", result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 4. Get the Order Book
router.get('/:marketId/orderbook', async (req, res) => {
  const { marketId } = req.params;
  const { outcome } = req.query; // e.g., ?outcome=YES

  const bids = await prisma.order.groupBy({
    by: ['price'],
    where: { marketId, outcome, type: 'BUY', status: { in: ['OPEN', 'PARTIAL'] } },
    _sum: { remainingQty: true },
    orderBy: { price: 'desc' }
  });

  const asks = await prisma.order.groupBy({
    by: ['price'],
    where: { marketId, outcome, type: 'SELL', status: { in: ['OPEN', 'PARTIAL'] } },
    _sum: { remainingQty: true },
    orderBy: { price: 'asc' }
  });

  res.json({ bids, asks });
});

module.exports = router;