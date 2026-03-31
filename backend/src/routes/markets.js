const express = require('express');
const prisma = require('../db');
const { buyShares, sellShares, getPrices } = require('../engine/amm');

const router = express.Router();

// 1. Get all markets with current AMM prices
router.get('/', async (req, res) => {
  try {
    const markets = await prisma.market.findMany({
      include: { pool: true },
    });

    const result = markets.map((m) => {
      const prices = m.pool
        ? getPrices(m.pool.yesReserve, m.pool.noReserve)
        : { yes: 0.5, no: 0.5 };
      return {
        id: m.id,
        question: m.question,
        status: m.status,
        resolvesAt: m.resolvesAt,
        outcome: m.outcome,
        prices,
        pool: m.pool
          ? { yesReserve: m.pool.yesReserve, noReserve: m.pool.noReserve }
          : null,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Create a new market (auto-creates the AMM liquidity pool)
router.post('/', async (req, res) => {
  try {
    const { question, resolvesAt } = req.body;
    if (!question || !resolvesAt) {
      return res.status(400).json({ error: 'question and resolvesAt are required' });
    }

    const market = await prisma.market.create({
      data: {
        question,
        resolvesAt: new Date(resolvesAt),
        pool: {
          create: { yesReserve: 1000, noReserve: 1000 },
        },
      },
      include: { pool: true },
    });

    const prices = getPrices(market.pool.yesReserve, market.pool.noReserve);
    res.json({ ...market, prices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Get current AMM price for a single market
router.get('/:marketId/price', async (req, res) => {
  try {
    const pool = await prisma.liquidityPool.findUnique({
      where: { marketId: req.params.marketId },
    });
    if (!pool) return res.status(404).json({ error: 'Market not found' });

    res.json({ prices: getPrices(pool.yesReserve, pool.noReserve) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Buy shares using the AMM
// Body: { userId, outcome: 'YES'|'NO', coinAmount }
router.post('/:marketId/buy', async (req, res) => {
  const { marketId } = req.params;
  const { userId, outcome, coinAmount } = req.body;

  if (!userId || !outcome || !coinAmount) {
    return res.status(400).json({ error: 'userId, outcome, and coinAmount are required' });
  }

  try {
    const result = await buyShares(userId, marketId, outcome, parseFloat(coinAmount));

    const io = req.app.get('io');
    io.to(`market_${marketId}`).emit('priceUpdate', { marketId, prices: result.newPrices });

    res.json({ message: 'Trade successful', ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 5. Sell shares back to the AMM
// Body: { userId, outcome: 'YES'|'NO', shares }
router.post('/:marketId/sell', async (req, res) => {
  const { marketId } = req.params;
  const { userId, outcome, shares } = req.body;

  if (!userId || !outcome || !shares) {
    return res.status(400).json({ error: 'userId, outcome, and shares are required' });
  }

  try {
    const result = await sellShares(userId, marketId, outcome, parseFloat(shares));

    const io = req.app.get('io');
    io.to(`market_${marketId}`).emit('priceUpdate', { marketId, prices: result.newPrices });

    res.json({ message: 'Trade successful', ...result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
