-- Sale.customer relation explicit (refonte UI R2)
-- Ajoute la contrainte FK Sale.customerId → Customer.id si pas déjà présente.

DO $$ BEGIN
  ALTER TABLE "Sale"
    ADD CONSTRAINT "Sale_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
