const prisma = require('../db');

async function placeOrder(userId, marketId, type, outcome, price, quantity) {
  // Wrap the entire matching logic in an ACID transaction
  return await prisma.$transaction(async (tx) => {
    // -----------------------------------------
    // 1. VALIDATE AND LOCK BALANCES
    // -----------------------------------------
    if (type === 'BUY') {
      const cost = price * quantity;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (user.coins < cost) throw new Error("Insufficient coins");

      // Lock the coins so they can't double-spend them while the order is open
      await tx.user.update({
        where: { id: userId },
        data: { coins: { decrement: cost }, lockedCoins: { increment: cost } }
      });
    } else if (type === 'SELL') {
      const position = await tx.position.findUnique({
        where: { userId_marketId_outcome: { userId, marketId, outcome } }
      });
      if (!position || position.quantity < quantity) throw new Error("Insufficient shares to sell");
      
      // Deduct shares immediately. (If they cancel the order later, we refund them).
      await tx.position.update({
        where: { id: position.id },
        data: { quantity: { decrement: quantity } }
      });
    }

    // -----------------------------------------
    // 2. CREATE THE ORDER
    // -----------------------------------------
    let takerOrder = await tx.order.create({
      data: { userId, marketId, type, outcome, price, quantity, remainingQty: quantity, status: 'OPEN' }
    });

    // -----------------------------------------
    // 3. FIND MATCHES (Price-Time Priority)
    // -----------------------------------------
    const oppositeType = type === 'BUY' ? 'SELL' : 'BUY';
    const sortDirection = type === 'BUY' ? 'asc' : 'desc'; // Buyers want cheapest, Sellers want highest
    const priceCondition = type === 'BUY' ? { lte: price } : { gte: price };

    const makerOrders = await tx.order.findMany({
      where: {
        marketId, outcome, type: oppositeType, status: { in: ['OPEN', 'PARTIAL'] }, price: priceCondition
      },
      orderBy: [{ price: sortDirection }, { createdAt: 'asc' }]
    });

    // -----------------------------------------
    // 4. EXECUTE TRADES
    // -----------------------------------------
    for (const maker of makerOrders) {
      if (takerOrder.remainingQty === 0) break; // Order fully filled!

      const tradeQty = Math.min(takerOrder.remainingQty, maker.remainingQty);
      const tradePrice = maker.price; // Maker gets to set the price

      // Update Order Quantities
      takerOrder.remainingQty -= tradeQty;
      maker.remainingQty -= tradeQty;

      await tx.order.update({
        where: { id: maker.id },
        data: { remainingQty: maker.remainingQty, status: maker.remainingQty === 0 ? 'FILLED' : 'PARTIAL' }
      });

      // Record the Trade
      await tx.trade.create({
        data: { marketId, makerOrderId: maker.id, takerOrderId: takerOrder.id, price: tradePrice, quantity: tradeQty }
      });

      // Settle Balances
      const buyerId = type === 'BUY' ? userId : maker.userId;
      const sellerId = type === 'SELL' ? userId : maker.userId;
      const cost = tradeQty * tradePrice;

      // Buyer: Finalize locked coins, gain shares
      await tx.user.update({ where: { id: buyerId }, data: { lockedCoins: { decrement: cost } } });
      await tx.position.upsert({
        where: { userId_marketId_outcome: { userId: buyerId, marketId, outcome } },
        update: { quantity: { increment: tradeQty } },
        create: { userId: buyerId, marketId, outcome, quantity: tradeQty, averagePrice: tradePrice }
      });

      // Seller: Gain coins (shares were already deducted in step 1)
      await tx.user.update({ where: { id: sellerId }, data: { coins: { increment: cost } } });
    }

    // -----------------------------------------
    // 5. FINALIZE TAKER ORDER
    // -----------------------------------------
    const finalStatus = takerOrder.remainingQty === 0 ? 'FILLED' : (takerOrder.remainingQty === quantity ? 'OPEN' : 'PARTIAL');
    await tx.order.update({
      where: { id: takerOrder.id },
      data: { remainingQty: takerOrder.remainingQty, status: finalStatus }
    });

    return { orderId: takerOrder.id, status: finalStatus, remainingQty: takerOrder.remainingQty };
  });
}

module.exports = { placeOrder };