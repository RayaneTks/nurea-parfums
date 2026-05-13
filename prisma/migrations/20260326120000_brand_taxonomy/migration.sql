-- CreateEnum
CREATE TYPE "BrandAssortment" AS ENUM ('UNSET', 'COMPLETE', 'CURATED');

-- CreateEnum
CREATE TYPE "BrandPositioning" AS ENUM ('UNSET', 'NICHE', 'DESIGNER', 'ARTISAN');

-- AlterTable
ALTER TABLE "Brand" ADD COLUMN "assortment" "BrandAssortment" NOT NULL DEFAULT 'UNSET';
ALTER TABLE "Brand" ADD COLUMN "positioning" "BrandPositioning" NOT NULL DEFAULT 'UNSET';
