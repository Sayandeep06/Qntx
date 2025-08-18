/*
  Warnings:

  - You are about to drop the `Orders` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[username]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- DropTable
DROP TABLE "public"."Orders";

-- CreateTable
CREATE TABLE "public"."Market" (
    "symbol" TEXT NOT NULL,
    "baseAsset" TEXT NOT NULL,
    "quoteAsset" TEXT NOT NULL,

    CONSTRAINT "Market_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "filled" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Trade" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "market" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Balance" (
    "user_id" TEXT NOT NULL,
    "asset" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Balance_pkey" PRIMARY KEY ("user_id","asset")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username");

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_market_fkey" FOREIGN KEY ("market") REFERENCES "public"."Market"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Trade" ADD CONSTRAINT "Trade_market_fkey" FOREIGN KEY ("market") REFERENCES "public"."Market"("symbol") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Balance" ADD CONSTRAINT "Balance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
