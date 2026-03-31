-- Migration: Replace Orderbook model with AMM (Automated Market Maker) model

-- Step 1: Drop Orderbook tables (Order depends on Trade via foreign keys, so Trade first)
ALTER TABLE "Trade" DROP CONSTRAINT IF EXISTS "Trade_makerOrderId_fkey";
ALTER TABLE "Trade" DROP CONSTRAINT IF EXISTS "Trade_takerOrderId_fkey";
ALTER TABLE "Trade" DROP CONSTRAINT IF EXISTS "Trade_marketId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_userId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_marketId_fkey";

DROP TABLE IF EXISTS "Trade";
DROP TABLE IF EXISTS "Order";

-- Step 2: Drop orderbook-only enums
DROP TYPE IF EXISTS "OrderType";
DROP TYPE IF EXISTS "OrderStatus";

-- Step 3: Remove lockedCoins from User (not needed in AMM model)
ALTER TABLE "User" DROP COLUMN IF EXISTS "lockedCoins";

-- Step 4: Create LiquidityPool table for AMM
CREATE TABLE "LiquidityPool" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "yesReserve" DOUBLE PRECISION NOT NULL DEFAULT 1000.0,
    "noReserve" DOUBLE PRECISION NOT NULL DEFAULT 1000.0,

    CONSTRAINT "LiquidityPool_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiquidityPool_marketId_key" ON "LiquidityPool"("marketId");

ALTER TABLE "LiquidityPool" ADD CONSTRAINT "LiquidityPool_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 5: Migrate Position table
--   - rename quantity (Int) to shares (Float)
--   - drop averagePrice
--   - add market foreign key

DROP INDEX IF EXISTS "Position_userId_marketId_outcome_key";
ALTER TABLE "Position" DROP CONSTRAINT IF EXISTS "Position_userId_fkey";

ALTER TABLE "Position" ADD COLUMN "shares" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
ALTER TABLE "Position" DROP COLUMN IF EXISTS "quantity";
ALTER TABLE "Position" DROP COLUMN IF EXISTS "averagePrice";

CREATE UNIQUE INDEX "Position_userId_marketId_outcome_key" ON "Position"("userId", "marketId", "outcome");

ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Position" ADD CONSTRAINT "Position_marketId_fkey"
    FOREIGN KEY ("marketId") REFERENCES "Market"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
