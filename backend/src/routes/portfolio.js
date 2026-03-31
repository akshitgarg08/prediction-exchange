const express = require('express');
const prisma = require('../db');
const router = express.Router();

// Get a user's balance and positions
router.get('/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: {
        coins: true,
        positions: {
          where: { shares: { gt: 0 } },
          select: {
            id: true,
            marketId: true,
            outcome: true,
            shares: true,
            market: { select: { question: true, status: true, outcome: true } },
          },
        },
      },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ coins: user.coins, positions: user.positions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
