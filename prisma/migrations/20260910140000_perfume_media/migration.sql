-- Visuels marketing par parfum (planches story), en plus des images catalogue.

CREATE TABLE "PerfumeMedia" (
    "id" TEXT NOT NULL,
    "perfumeId" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "bytes" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerfumeMedia_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PerfumeMedia_path_key" ON "PerfumeMedia"("path");
CREATE INDEX "PerfumeMedia_perfumeId_sortOrder_idx" ON "PerfumeMedia"("perfumeId", "sortOrder");

ALTER TABLE "PerfumeMedia"
  ADD CONSTRAINT "PerfumeMedia_perfumeId_fkey"
  FOREIGN KEY ("perfumeId") REFERENCES "Perfume"("id") ON DELETE CASCADE ON UPDATE CASCADE;
