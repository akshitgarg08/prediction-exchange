const express = require('express');
const prisma = require('../db');
const router = express.Router();

router.get('/:userId', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      select: { coins: true, lockedCoins: true }
    });
    if (!user) return res.status(404).json({ error: "User not found" });

    // This returns the balance the frontend is looking for
    res.json({ balances: user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;