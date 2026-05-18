-- AlterTable : note par ligne sur SaleItem (symétrie avec OrderItem.note).
ALTER TABLE "SaleItem" ADD COLUMN "note" TEXT;
