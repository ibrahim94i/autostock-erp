-- Weighted average cost per product
ALTER TABLE "Product" ADD COLUMN "averageCost" DECIMAL(18, 4) NOT NULL DEFAULT 0;

-- Seed existing products: use costPrice as initial average
UPDATE "Product" SET "averageCost" = "costPrice" WHERE "averageCost" = 0;
