-- AlterTable : champ libre de contact (téléphone, Snapchat, Instagram, …) sur Sale et Order.
ALTER TABLE "Sale" ADD COLUMN "customerContact" TEXT;
ALTER TABLE "Order" ADD COLUMN "customerContact" TEXT;
