/**
 * AMM Engine - Constant Product Market Maker (x * y = k)
 *
 * Pool reserves:
 *   yesReserve: virtual YES-side liquidity
 *   noReserve:  virtual NO-side liquidity
 *
 * Prices (probabilities):
 *   YES price = noReserve  / (yesReserve + noReserve)
 *   NO  price = yesReserve / (yesReserve + noReserve)
 *
 * Trade formulas (coinAmount or sharesIn are the inputs):
 *   Buy  YES: sharesOut = yesReserve - k / (noReserve  + coinAmount)
 *   Sell YES: coinsOut  = noReserve  - k / (yesReserve + sharesIn)
 *   Buy  NO:  sharesOut = noReserve  - k / (yesReserve + coinAmount)
 *   Sell NO:  coinsOut  = yesReserve - k / (noReserve  + sharesIn)
 */

const prisma = require('../db');

/**
 * Returns the current YES and NO prices for a market's pool.
 */
function getPrices(yesReserve, noReserve) {
  const total = yesReserve + noReserve;
  return {
    yes: noReserve / total,
    no: yesReserve / total,
  };
}

/**
 * Calculate how many shares a buyer receives for a given coin amount.
 * @param {'YES'|'NO'} outcome
 * @param {number} coinAmount - coins the user is spending
 * @param {number} yesReserve
 * @param {number} noReserve
 * @returns {{ sharesOut: number, newYesReserve: number, newNoReserve: number }}
 */
function calcBuy(outcome, coinAmount, yesReserve, noReserve) {
  const k = yesReserve * noReserve;

  let newYesReserve, newNoReserve, sharesOut;

  if (outcome === 'YES') {
    newNoReserve = noReserve + coinAmount;
    newYesReserve = k / newNoReserve;
    sharesOut = yesReserve - newYesReserve;
  } else {
    newYesReserve = yesReserve + coinAmount;
    newNoReserve = k / newYesReserve;
    sharesOut = noReserve - newNoReserve;
  }

  if (sharesOut <= 0) throw new Error('Trade too small to produce shares');

  return { sharesOut, newYesReserve, newNoReserve };
}

/**
 * Calculate how many coins a seller receives for a given number of shares.
 * @param {'YES'|'NO'} outcome
 * @param {number} sharesIn - shares the user is selling
 * @param {number} yesReserve
 * @param {number} noReserve
 * @returns {{ coinsOut: number, newYesReserve: number, newNoReserve: number }}
 */
function calcSell(outcome, sharesIn, yesReserve, noReserve) {
  const k = yesReserve * noReserve;

  let newYesReserve, newNoReserve, coinsOut;

  if (outcome === 'YES') {
    newYesReserve = yesReserve + sharesIn;
    newNoReserve = k / newYesReserve;
    coinsOut = noReserve - newNoReserve;
  } else {
    newNoReserve = noReserve + sharesIn;
    newYesReserve = k / newNoReserve;
    coinsOut = yesReserve - newYesReserve;
  }

  if (coinsOut <= 0) throw new Error('Trade too small to produce coins');

  return { coinsOut, newYesReserve, newNoReserve };
}

/**
 * Execute a BUY trade against the AMM inside a Prisma transaction.
 * The user spends `coinAmount` coins and receives shares of `outcome`.
 */
async function buyShares(userId, marketId, outcome, coinAmount) {
  return prisma.$transaction(async (tx) => {
    // 1. Load user and pool atomically
    const [user, pool] = await Promise.all([
      tx.user.findUnique({ where: { id: userId } }),
      tx.liquidityPool.findUnique({ where: { marketId } }),
    ]);

    if (!user) throw new Error('User not found');
    if (!pool) throw new Error('Liquidity pool not found for this market');
    if (user.coins < coinAmount) throw new Error('Insufficient coins');
    if (coinAmount <= 0) throw new Error('Coin amount must be positive');

    // 2. Calculate trade
    const { sharesOut, newYesReserve, newNoReserve } = calcBuy(
      outcome,
      coinAmount,
      pool.yesReserve,
      pool.noReserve
    );

    // 3. Update pool reserves
    await tx.liquidityPool.update({
      where: { id: pool.id },
      data: { yesReserve: newYesReserve, noReserve: newNoReserve },
    });

    // 4. Deduct coins from user
    await tx.user.update({
      where: { id: userId },
      data: { coins: { decrement: coinAmount } },
    });

    // 5. Credit shares to user's position
    await tx.position.upsert({
      where: { userId_marketId_outcome: { userId, marketId, outcome } },
      update: { shares: { increment: sharesOut } },
      create: { userId, marketId, outcome, shares: sharesOut },
    });

    const prices = getPrices(newYesReserve, newNoReserve);
    return { sharesOut, coinAmount, newPrices: prices };
  });
}

/**
 * Execute a SELL trade against the AMM inside a Prisma transaction.
 * The user sells `shares` of `outcome` and receives coins.
 */
async function sellShares(userId, marketId, outcome, shares) {
  return prisma.$transaction(async (tx) => {
    // 1. Load user position and pool atomically
    const [position, pool] = await Promise.all([
      tx.position.findUnique({
        where: { userId_marketId_outcome: { userId, marketId, outcome } },
      }),
      tx.liquidityPool.findUnique({ where: { marketId } }),
    ]);

    if (!pool) throw new Error('Liquidity pool not found for this market');
    if (!position || position.shares < shares) throw new Error('Insufficient shares');
    if (shares <= 0) throw new Error('Shares must be positive');

    // 2. Calculate trade
    const { coinsOut, newYesReserve, newNoReserve } = calcSell(
      outcome,
      shares,
      pool.yesReserve,
      pool.noReserve
    );

    // 3. Update pool reserves
    await tx.liquidityPool.update({
      where: { id: pool.id },
      data: { yesReserve: newYesReserve, noReserve: newNoReserve },
    });

    // 4. Deduct shares from user's position
    await tx.position.update({
      where: { id: position.id },
      data: { shares: { decrement: shares } },
    });

    // 5. Credit coins to user
    await tx.user.update({
      where: { id: userId },
      data: { coins: { increment: coinsOut } },
    });

    const prices = getPrices(newYesReserve, newNoReserve);
    return { coinsOut, shares, newPrices: prices };
  });
}

module.exports = { buyShares, sellShares, getPrices, calcBuy, calcSell };
