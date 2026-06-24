-- Suivi livraison partielle : quantité déjà livrée par ligne de commande (0..quantity).
ALTER TABLE "OrderItem" ADD COLUMN "deliveredQuantity" INTEGER NOT NULL DEFAULT 0;
