-- Track unpaid balance for delivered sales/orders
ALTER TABLE "Sale"
ADD COLUMN "remainingDue" DECIMAL(10,2) NOT NULL DEFAULT 0;

